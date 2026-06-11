import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { energyRepository } from '@/data/repositories/energyRepository';
import { taskLogRepository } from '@/data/repositories/taskLogRepository';
import { taskRepository } from '@/data/repositories/taskRepository';
import { taskLogEndpoints } from '@/data/api/endpoints/taskLogs';
import { messageEndpoints } from '@/data/api/endpoints/messages';
import SpoonGauge from '@/components/shared/SpoonGauge';
import { useToast } from '@/components/ui/Toast';
import { COLORS } from '@/constants/colors';
import type { EnergyResponse } from '@/data/api/endpoints/energy';
import type { TaskLogResponse } from '@/data/api/endpoints/taskLogs';
import type { TaskResponse } from '@/data/api/endpoints/tasks';
import type { MessageResponse } from '@/data/api/endpoints/messages';
import type { TaskLogStatus } from '@/data/api/types';

// Rest system levels (spec: Nudge ≤1🥄, Banner, Bravo when all done).
type RestLevel = 'bravo' | 'nudge' | 'banner' | null;

const REST_CONTEXT: Record<Exclude<RestLevel, null>, string> = {
  bravo: 'COMPLETION',
  nudge: 'LOW_ENERGY',
  banner: 'REST',
};

interface UpdateStatusArgs {
  id: string;
  status: TaskLogStatus;
}

export default function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { show: showToast } = useToast();

  // N7: guard a row against double-tap while its status update is in flight.
  // A ref (not state) keeps it invisible — no re-render, no disabled row, so the
  // optimistic feel stays intact for tired users; it only drops duplicate taps.
  const inFlightLogIds = useRef<Set<string>>(new Set());

  const { data: energy, isLoading: isEnergyLoading } = useQuery<EnergyResponse | null>({
    queryKey: ['energy', 'today'],
    queryFn: () => energyRepository.getToday(),
  });

  // C2: Gate — redirect to check-in if no energy has been declared yet today.
  // Strict equality on isEnergyLoading===false avoids a spurious redirect on the
  // very first render (where energy is undefined, not null).
  // If the query errors, isEnergyLoading stays false but energy stays undefined →
  // the condition is not met → no redirect (non-blocking behaviour).
  useEffect(() => {
    if (isEnergyLoading === false && energy === null) {
      router.replace('/checkin/step1');
    }
  }, [isEnergyLoading, energy, router]);

  const { data: taskLogs } = useQuery<TaskLogResponse[]>({
    queryKey: ['task-logs'],
    queryFn: () => taskLogRepository.getAll(),
  });

  const { data: tasks } = useQuery<TaskResponse[]>({
    queryKey: ['tasks'],
    queryFn: () => taskRepository.getAll(),
  });

  const { mutateAsync: updateStatus } = useMutation<
    TaskLogResponse,
    Error,
    UpdateStatusArgs
  >({
    mutationFn: ({ id, status }: UpdateStatusArgs) =>
      taskLogRepository.updateStatus(id, { status }),
    onSuccess: () => {
      // Refresh the day's logs + energy so the list and rest system update.
      queryClient.invalidateQueries({ queryKey: ['task-logs'] });
      queryClient.invalidateQueries({ queryKey: ['energy', 'today'] });
    },
  });

  const todayItems = useMemo<Array<{ log: TaskLogResponse; taskName: string }>>(
    () =>
      (taskLogs ?? []).map((log) => {
        const task = (tasks ?? []).find((t) => t.id === log.userTaskId);
        return { log, taskName: task?.name ?? '' };
      }),
    [taskLogs, tasks],
  );

  // ---- Rest system (3 levels) -------------------------------------------
  const totalCount = todayItems.length;
  const completedCount = todayItems.filter(({ log }) => log.status === 'COMPLETED').length;
  const incompleteCount = totalCount - completedCount;
  const spoonsRemaining = energy != null ? energy.spoons - energy.spoonsUsed : null;

  const restLevel: RestLevel = useMemo(() => {
    if (totalCount > 0 && incompleteCount === 0) return 'bravo';
    if (energy != null && spoonsRemaining != null && incompleteCount > 0) {
      if (spoonsRemaining <= 1) return 'nudge';
      if (spoonsRemaining <= Math.floor(energy.spoons / 2)) return 'banner';
    }
    return null;
  }, [totalCount, incompleteCount, energy, spoonsRemaining]);

  // Monthly cumulative: distinct days this month with at least one completed task.
  const monthlyCompletedDays = useMemo(() => {
    const prefix = new Date().toISOString().slice(0, 7); // YYYY-MM
    const days = new Set<string>();
    (taskLogs ?? []).forEach((log) => {
      if (log.status === 'COMPLETED' && log.date.startsWith(prefix)) days.add(log.date);
    });
    return days.size;
  }, [taskLogs]);

  const restContext = restLevel ? REST_CONTEXT[restLevel] : null;
  const { data: restMessage } = useQuery<MessageResponse | null>({
    queryKey: ['message', restContext],
    queryFn: async () => {
      const res = await messageEndpoints.getRandom(restContext as string);
      return res.data.data;
    },
    enabled: restContext != null,
  });

  const { mutateAsync: postponeAll, isPending: isPostponing } = useMutation({
    mutationFn: () => taskLogEndpoints.bulkPostpone(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-logs'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.greeting} accessibilityRole="header">
        {t('home.greeting', { name: user?.firstName })}
      </Text>

      <Text style={styles.date}>{today}</Text>

      {energy != null && (
        <View testID="spoon-gauge" style={styles.gaugeWrapper}>
          <SpoonGauge spoons={energy.spoons} spoonsUsed={energy.spoonsUsed} />
        </View>
      )}

      {/* Rest system — level 3: celebration when everything is done */}
      {restLevel === 'bravo' && (
        <View testID="rest-bravo" style={styles.bravoCard} accessible accessibilityRole="summary">
          <Text style={styles.bravoTitle}>{t('home.bravoTitle')}</Text>
          {restMessage != null && <Text style={styles.bravoMessage}>{t(restMessage.key)}</Text>}
          <Text style={styles.bravoMonthly}>
            {t('home.monthlyCompleted', { count: monthlyCompletedDays })}
          </Text>
        </View>
      )}

      {/* Rest system — level 1: nudge when ≤1 spoon left and tasks remain */}
      {restLevel === 'nudge' && (
        <View testID="rest-nudge" style={styles.nudgeCard}>
          <Text style={styles.nudgeTitle} accessibilityRole="header">
            {t('home.nudgeTitle')}
          </Text>
          {restMessage != null && <Text style={styles.nudgeMessage}>{t(restMessage.key)}</Text>}
          <Pressable
            testID="postpone-remaining-button"
            onPress={async () => {
              try {
                await postponeAll();
              } catch {
                // N7: non-blaming feedback instead of silent failure.
                showToast(t('home.postponeError'));
              }
            }}
            disabled={isPostponing}
            accessibilityRole="button"
            accessibilityLabel={t('home.postponeRemaining')}
            style={styles.nudgeButton}
          >
            <Text style={styles.nudgeButtonText}>{t('home.postponeRemaining')}</Text>
          </Pressable>
        </View>
      )}

      {/* Rest system — level 2: gentle banner when energy is getting low */}
      {restLevel === 'banner' && (
        <View testID="rest-banner" style={styles.restBanner} accessible accessibilityRole="text">
          <Text style={styles.restBannerText}>{t('home.restBanner')}</Text>
        </View>
      )}

      <Pressable
        testID="reevaluate-button"
        onPress={() => router.push('/checkin/step2')}
        accessibilityRole="button"
        accessibilityLabel={t('home.reevaluate')}
        accessibilityHint={t('home.reevaluateHint')}
        style={styles.reevaluateButton}
      >
        <Text style={styles.reevaluateText}>{t('home.reevaluate')}</Text>
      </Pressable>

      <View style={styles.taskSection}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {t('home.todayTasks')}
        </Text>

        {todayItems.map(({ log, taskName }) => (
          <Pressable
            key={log.id}
            testID={`task-log-checkbox-${log.id}`}
            accessibilityRole="checkbox"
            accessibilityLabel={
              log.status === 'COMPLETED'
                ? t('home.taskCompleted', { name: taskName })
                : t('home.taskPending', { name: taskName })
            }
            accessibilityHint={t('home.taskCheckboxHint')}
            accessibilityState={{ checked: log.status === 'COMPLETED' }}
            onPress={async () => {
              // N7: ignore re-taps on the same row while its update is in flight.
              if (inFlightLogIds.current.has(log.id)) return;
              inFlightLogIds.current.add(log.id);
              try {
                await updateStatus({
                  id: log.id,
                  status: log.status === 'COMPLETED' ? 'PLANNED' : 'COMPLETED',
                });
              } catch {
                // N7: tell the user it didn't save, without blame. Refetch keeps truth.
                showToast(t('home.taskUpdateError'));
              } finally {
                inFlightLogIds.current.delete(log.id);
              }
            }}
            style={styles.taskRow}
          >
            {/* Decorative checkbox visual — information already carried by the
                Pressable's accessibilityLabel/State. React Native collapses
                all children into the parent focus stop when the Pressable has
                an explicit accessibilityLabel, so no extra hiding is needed. */}
            <View
              style={[
                styles.checkbox,
                log.status === 'COMPLETED' && styles.checkboxChecked,
              ]}
            />
            <Text
              style={[
                styles.taskName,
                log.status === 'COMPLETED' && styles.taskNameCompleted,
              ]}
            >
              {taskName}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
  },
  date: {
    fontSize: 14,
    // BROWN_DARK (#6B5744) on CREAM (#F7F0E8) ≈ 4.6:1 — passes WCAG AA normal text
    // (was BROWN_MEDIUM #8B7355 ≈ 3.6:1 which fails for 14pt normal weight)
    color: COLORS.BROWN_DARK,
    textTransform: 'capitalize',
  },
  gaugeWrapper: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
  },

  // Rest system — Bravo (celebration)
  bravoCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.SUCCESS,
    padding: 16,
    gap: 4,
  },
  bravoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.SUCCESS,
  },
  bravoMessage: {
    fontSize: 14,
    color: COLORS.BROWN_DARK,
  },
  bravoMonthly: {
    fontSize: 13,
    color: COLORS.BROWN_MEDIUM,
    marginTop: 4,
  },

  // Rest system — Nudge (protective)
  nudgeCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    padding: 16,
    gap: 10,
  },
  nudgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
  },
  nudgeMessage: {
    fontSize: 14,
    color: COLORS.BROWN_DARK,
  },
  nudgeButton: {
    minHeight: 44,
    backgroundColor: COLORS.ORANGE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  nudgeButtonText: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '700',
  },

  // Rest system — gentle banner
  restBanner: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.SUCCESS,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  restBannerText: {
    fontSize: 14,
    color: COLORS.BROWN_DARK,
  },
  reevaluateButton: {
    minHeight: 44,
    borderWidth: 2,
    borderColor: COLORS.BROWN_LIGHT,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  reevaluateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  taskSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.WHITE,
    borderRadius: 10,
    padding: 14,
    minHeight: 44,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.BROWN_LIGHT,
    backgroundColor: COLORS.WHITE,
  },
  checkboxChecked: {
    backgroundColor: COLORS.SUCCESS,
    borderColor: COLORS.SUCCESS,
  },
  taskName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.BROWN_DARK,
  },
  taskNameCompleted: {
    color: COLORS.BROWN_LIGHT,
    textDecorationLine: 'line-through',
  },
});
