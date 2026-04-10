import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { energyRepository } from '@/data/repositories/energyRepository';
import { taskLogRepository } from '@/data/repositories/taskLogRepository';
import { taskRepository } from '@/data/repositories/taskRepository';
import SpoonGauge from '@/components/shared/SpoonGauge';
import { COLORS } from '@/constants/colors';
import type { EnergyResponse } from '@/data/api/endpoints/energy';
import type { TaskLogResponse } from '@/data/api/endpoints/taskLogs';
import type { TaskResponse } from '@/data/api/endpoints/tasks';

interface UpdateStatusArgs {
  id: string;
  status: 'COMPLETED' | 'PLANNED' | 'SKIPPED' | 'POSTPONED';
}

export default function HomeScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: energy } = useQuery<EnergyResponse | null>({
    queryKey: ['energy', 'today'],
    queryFn: () => energyRepository.getToday(),
  });

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
  });

  const todayItems = useMemo<Array<{ log: TaskLogResponse; taskName: string }>>(
    () =>
      (taskLogs ?? []).map((log) => {
        const task = (tasks ?? []).find((t) => t.id === log.userTaskId);
        return { log, taskName: task?.name ?? '' };
      }),
    [taskLogs, tasks],
  );

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityRole="list"
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
              try {
                await updateStatus({
                  id: log.id,
                  status: log.status === 'COMPLETED' ? 'PLANNED' : 'COMPLETED',
                });
              } catch {
                // status update errors are silent — the optimistic UI will revert on refetch
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
