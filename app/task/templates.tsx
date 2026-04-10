import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { baseTaskRepository } from '@/data/repositories/baseTaskRepository';
import { taskRepository } from '@/data/repositories/taskRepository';
import { COLORS } from '@/constants/colors';
import type { BaseTaskResponse } from '@/data/api/endpoints/baseTasks';
import type { CreateFromCatalogRequest } from '@/data/api/endpoints/tasks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Section {
  title: string;
  data: BaseTaskResponse[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TemplatesScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: baseTasks = [], isLoading, isError } = useQuery<BaseTaskResponse[]>({
    queryKey: ['base-tasks'],
    queryFn: () => baseTaskRepository.getAll(),
  });

  const { mutateAsync: createFromCatalog } = useMutation<
    unknown,
    Error,
    CreateFromCatalogRequest
  >({
    mutationFn: (data) => taskRepository.fromCatalog(data),
    onSuccess: () => {
      router.back();
    },
  });

  const sections = useMemo<Section[]>(() => {
    const categoryMap: Record<string, BaseTaskResponse[]> = {};
    baseTasks.forEach((task) => {
      if (categoryMap[task.category] === undefined) {
        categoryMap[task.category] = [];
      }
      categoryMap[task.category].push(task);
    });
    return Object.entries(categoryMap).map(([category, tasks]) => ({
      title: category,
      data: tasks,
    }));
  }, [baseTasks]);

  function toggleSelection(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit(): Promise<void> {
    if (selectedIds.size === 0) return;
    try {
      await createFromCatalog({
        tasks: Array.from(selectedIds).map((id) => ({ baseTaskId: id })),
      });
    } catch {
      // error is silent — TanStack Query handles retry/error state
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={COLORS.ORANGE}
          accessibilityRole="progressbar"
          accessibilityLabel={t('templates.loading')}
        />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText} accessibilityRole="alert">
          {t('templates.error')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        testID="templates-list"
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <View
            testID={`category-section-${section.title}`}
            style={styles.sectionHeader}
            accessibilityRole="header"
          >
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <Pressable
              testID={`template-checkbox-${item.id}`}
              onPress={() => toggleSelection(item.id)}
              style={[styles.taskRow, isSelected && styles.taskRowSelected]}
              accessibilityRole="checkbox"
              accessibilityLabel={t(item.key)}
              accessibilityHint={t('templates.selectHint')}
              accessibilityState={{ checked: isSelected }}
            >
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxChecked,
                ]}
              />
              <View style={styles.taskInfo}>
                <Text style={styles.taskName}>{t(item.key)}</Text>
                <Text style={styles.taskMeta}>
                  {t('tasks.spoonCost', { count: item.spoonCost })} · {t(`taskForm.importance${item.importance}`)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable
        testID="submit-selection-button"
        onPress={() => void handleSubmit()}
        style={[
          styles.submitButton,
          selectedIds.size === 0 && styles.submitButtonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('templates.submitSelection')}
        accessibilityState={{ disabled: selectedIds.size === 0 }}
        disabled={selectedIds.size === 0}
      >
        <Text style={styles.submitButtonText}>{t('templates.submitSelection')}</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.CREAM,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 16,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96,
    gap: 4,
  },

  // Section header
  sectionHeader: {
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },

  // Task row
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.WHITE,
    borderRadius: 10,
    padding: 14,
    minHeight: 56,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    marginBottom: 6,
  },
  taskRowSelected: {
    borderColor: COLORS.ORANGE,
    backgroundColor: COLORS.CREAM,
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
    backgroundColor: COLORS.ORANGE,
    borderColor: COLORS.ORANGE,
  },
  taskInfo: {
    flex: 1,
    gap: 2,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  taskMeta: {
    fontSize: 12,
    color: COLORS.BROWN_DARK,
  },

  // Submit button
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: COLORS.BROWN_LIGHT,
  },
  submitButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
});
