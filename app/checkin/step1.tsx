import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { TaskResponse } from '@/data/api/endpoints/tasks';
import { taskRepository } from '@/data/repositories/taskRepository';
import { taskLogEndpoints } from '@/data/api/endpoints/taskLogs';
import { Button } from '@/components/ui/button-custom';
import { BackButton } from '@/components/ui/BackButton';
import { COLORS } from '@/constants/colors';

export default function CheckinStep1() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];

  const { data: overdueTasks = [], isLoading, isError } = useQuery({
    queryKey: ['tasks', 'overdue'],
    queryFn: async () => {
      const allTasks: TaskResponse[] = await taskRepository.getAll();
      return allTasks.filter((task) => task.dueDate < today);
    },
  });

  const { mutate: bulkPostponeMutate, isPending: isPostponing } = useMutation({
    mutationFn: () => taskLogEndpoints.bulkPostpone(),
    // After postponing, continue the check-in flow to step 2 (was a dead end).
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-logs'] });
      router.replace('/checkin/step2');
    },
  });

  useEffect(() => {
    if (!isLoading && overdueTasks.length === 0) {
      router.replace('/checkin/step2');
    }
  }, [isLoading, overdueTasks, router]);

  return (
    <View style={styles.container}>
      <BackButton />
      <Text style={styles.screenTitle} accessibilityRole="header">
        {t('checkin.step1Title')}
      </Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isError ? (
          <Text style={styles.errorText} accessibilityRole="alert">
            {t('common.error')}
          </Text>
        ) : (
          overdueTasks.map((task) => (
            <View
              key={task.id}
              style={styles.taskCard}
            >
              <View style={styles.taskInfo}>
                <Text style={styles.taskName}>{task.name}</Text>
                <Text style={styles.taskSpoons}>
                  {t('checkin.spoonCost', { count: task.spoonCost })}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('checkin.postponeAll')}
          onPress={() => bulkPostponeMutate()}
          loading={isPostponing}
        />
        <Button
          label={t('checkin.skip')}
          onPress={() => router.replace('/checkin/step2')}
          variant="secondary"
        />
        <Button
          label={t('checkin.restToday')}
          onPress={() => router.replace('/checkin/step2')}
          variant="secondary"
          accessibilityLabel={t('checkin.restToday')}
          accessibilityHint={t('checkin.restTodayHint')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  taskCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  taskSpoons: {
    fontSize: 13,
    // BROWN_DARK (#6B5744) on CREAM (#F7F0E8) — contrast ≈ 4.6:1, passes WCAG AA
    color: COLORS.BROWN_DARK,
    marginTop: 4,
  },
  errorText: {
    color: COLORS.ERROR,
    textAlign: 'center',
    marginTop: 32,
  },
  footer: {
    padding: 16,
    gap: 12,
  },
});
