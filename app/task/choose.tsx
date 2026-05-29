import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { baseTaskRepository } from '@/data/repositories/baseTaskRepository';
import { BackButton } from '@/components/ui/BackButton';
import { COLORS } from '@/constants/colors';
import type { BaseTaskResponse } from '@/data/api/endpoints/baseTasks';

// ---------------------------------------------------------------------------
// "Choisir un modèle" — entry point of the add-task flow.
// Pick a prefab task (→ pre-filled editable form) or create one manually.
// ---------------------------------------------------------------------------

export default function ChooseTemplateScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();

  const { data: baseTasks = [], isLoading, isError } = useQuery<BaseTaskResponse[]>({
    queryKey: ['base-tasks'],
    queryFn: () => baseTaskRepository.getAll(),
  });

  function openTemplate(task: BaseTaskResponse): void {
    router.push({
      pathname: '/task/new',
      params: {
        baseTaskId: task.id,
        templateKey: task.key,
        spoonCost: String(task.spoonCost),
        importance: task.importance,
        category: task.category,
      },
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackButton />
        <Text style={styles.screenTitle} accessibilityRole="header">
          {t('templates.chooseTitle')}
        </Text>
        <Text style={styles.subtitle}>{t('templates.chooseSubtitle')}</Text>

        {isLoading && (
          <ActivityIndicator
            size="large"
            color={COLORS.ORANGE}
            accessibilityRole="progressbar"
            accessibilityLabel={t('templates.loading')}
            style={styles.loader}
          />
        )}

        {isError && (
          <Text style={styles.errorText} accessibilityRole="alert">
            {t('templates.error')}
          </Text>
        )}

        {!isLoading && !isError && (
          <View style={styles.grid}>
            {baseTasks.map((task) => (
              <Pressable
                key={task.id}
                testID={`template-card-${task.id}`}
                onPress={() => openTemplate(task)}
                style={styles.card}
                accessibilityRole="button"
                accessibilityLabel={t(task.key)}
                accessibilityHint={t('templates.templateHint')}
              >
                <Text style={styles.cardName} numberOfLines={2}>
                  {t(task.key)}
                </Text>
                <Text style={styles.cardMeta}>
                  {t('tasks.spoonCost', { count: task.spoonCost })}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        testID="create-manually-button"
        onPress={() => router.push('/task/new')}
        style={styles.manualButton}
        accessibilityRole="button"
        accessibilityLabel={t('templates.createManually')}
        accessibilityHint={t('templates.createManuallyHint')}
      >
        <Text style={styles.manualButtonText}>{t('templates.createManually')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
  },
  content: {
    padding: 16,
    paddingBottom: 96,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.BROWN_MEDIUM,
    marginBottom: 20,
  },
  loader: {
    marginTop: 32,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 14,
    marginTop: 16,
  },

  // 2-column grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  card: {
    width: '48%',
    minHeight: 88,
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  cardMeta: {
    fontSize: 12,
    color: COLORS.BROWN_MEDIUM,
    marginTop: 8,
  },

  // Manual create CTA
  manualButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: COLORS.ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: COLORS.BROWN_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  manualButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
});
