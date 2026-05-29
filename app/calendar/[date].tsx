import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { taskLogRepository } from '@/data/repositories/taskLogRepository';
import { taskRepository } from '@/data/repositories/taskRepository';
import { BackButton } from '@/components/ui/BackButton';
import { COLORS } from '@/constants/colors';
import type { TaskLogResponse } from '@/data/api/endpoints/taskLogs';
import type { TaskResponse } from '@/data/api/endpoints/tasks';

// ---------------------------------------------------------------------------
// "Détail du jour" — labelled spoon distribution + the day's task list.
// ---------------------------------------------------------------------------

interface DayTask {
  logId: string;
  name: string;
  spoonCost: number;
  status: TaskLogResponse['status'];
}

function formatDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD; build a local date to avoid timezone shifts.
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function statusLabelKey(status: TaskLogResponse['status']): string {
  if (status === 'COMPLETED') return 'calendar.statusCompleted';
  if (status === 'SKIPPED') return 'calendar.statusSkipped';
  return 'calendar.statusPlanned';
}

export default function DayDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { date } = useLocalSearchParams<{ date: string }>();
  const dateStr = Array.isArray(date) ? date[0] : (date ?? '');

  const { data: taskLogs = [] } = useQuery<TaskLogResponse[]>({
    queryKey: ['task-logs'],
    queryFn: () => taskLogRepository.getAll(),
  });
  const { data: tasks = [] } = useQuery<TaskResponse[]>({
    queryKey: ['tasks'],
    queryFn: () => taskRepository.getAll(),
  });

  const dayTasks = useMemo<DayTask[]>(() => {
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    return taskLogs
      .filter((log) => log.date === dateStr)
      .map((log) => {
        const task = tasksById.get(log.userTaskId);
        return {
          logId: log.id,
          name: task?.name ?? '',
          spoonCost: task?.spoonCost ?? 0,
          status: log.status,
        };
      });
  }, [taskLogs, tasks, dateStr]);

  const completedSpoons = dayTasks
    .filter((dt) => dt.status === 'COMPLETED')
    .reduce((sum, dt) => sum + dt.spoonCost, 0);
  const plannedSpoons = dayTasks
    .filter((dt) => dt.status !== 'COMPLETED')
    .reduce((sum, dt) => sum + dt.spoonCost, 0);
  const totalSpoons = completedSpoons + plannedSpoons;
  const completedRatio = totalSpoons > 0 ? completedSpoons / totalSpoons : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton />
      <Text style={styles.title} accessibilityRole="header">
        {formatDate(dateStr)}
      </Text>

      {/* Labelled spoon distribution bar (completed vs remaining) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('calendar.spoonDistribution')}</Text>
        <View
          testID="day-distribution-bar"
          style={styles.barContainer}
          accessibilityRole="progressbar"
          accessibilityLabel={t('calendar.spoonDistribution')}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(completedRatio * 100) }}
        >
          {totalSpoons > 0 && (
            <View
              style={[styles.barCompleted, { width: `${Math.round(completedRatio * 100)}%` as `${number}%` }]}
            />
          )}
        </View>
        <View style={styles.legendRow}>
          <Text style={styles.legendText}>{t('calendar.spentCompleted', { count: completedSpoons })}</Text>
          <Text style={styles.legendText}>{t('calendar.spentPlanned', { count: plannedSpoons })}</Text>
        </View>
      </View>

      {/* Task list for the day */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('calendar.tasksCount', { count: dayTasks.length })}</Text>

        {dayTasks.length === 0 ? (
          <Text style={styles.emptyText}>{t('calendar.noTasksDay')}</Text>
        ) : (
          dayTasks.map((dt) => (
            <View
              key={dt.logId}
              testID={`day-task-${dt.logId}`}
              style={styles.taskRow}
              accessible
              accessibilityLabel={`${dt.name}, ${t('tasks.spoonCost', { count: dt.spoonCost })}, ${t(statusLabelKey(dt.status))}`}
            >
              <View style={styles.taskInfo}>
                <Text
                  style={[
                    styles.taskName,
                    dt.status === 'COMPLETED' && styles.taskNameCompleted,
                  ]}
                >
                  {dt.name}
                </Text>
                <Text style={styles.taskMeta}>
                  {t('tasks.spoonCost', { count: dt.spoonCost })} · {t(statusLabelKey(dt.status))}
                </Text>
              </View>
            </View>
          ))
        )}
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
    padding: 16,
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    textTransform: 'capitalize',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
  },

  // Distribution bar
  barContainer: {
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.BROWN_LIGHT,
    overflow: 'hidden',
  },
  barCompleted: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: COLORS.ORANGE,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendText: {
    fontSize: 13,
    color: COLORS.BROWN_DARK,
    fontWeight: '600',
  },

  // Task rows
  emptyText: {
    fontSize: 14,
    color: COLORS.BROWN_MEDIUM,
  },
  taskRow: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    padding: 14,
    marginTop: 4,
  },
  taskInfo: {
    gap: 2,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.BROWN_MEDIUM,
  },
  taskMeta: {
    fontSize: 12,
    color: COLORS.BROWN_MEDIUM,
  },
});
