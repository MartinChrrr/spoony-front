import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { taskRepository } from '@/data/repositories/taskRepository';
import { TaskResponse } from '@/data/api/endpoints/tasks';
import { COLORS } from '@/constants/colors';

type SortOption = 'none' | 'date' | 'importance';

const IMPORTANCE_RANK: Record<string, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export default function TasksScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('none');

  const { data: tasks = [], isLoading, isError } = useQuery<TaskResponse[]>({
    queryKey: ['tasks'],
    queryFn: () => taskRepository.getAll(),
  });

  const categories = useMemo<string[]>(() => {
    const seen = new Set<string>();
    tasks.forEach((task) => {
      if (task.category !== null && task.category !== undefined) {
        seen.add(task.category);
      }
    });
    return Array.from(seen);
  }, [tasks]);

  const filteredAndSortedTasks = useMemo<TaskResponse[]>(() => {
    let result = tasks.filter(
      (task) =>
        selectedCategory === null || task.category === selectedCategory,
    );

    if (sortOption === 'date') {
      result = [...result].sort((a, b) => {
        if (a.dueDate == null) return 1;
        if (b.dueDate == null) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortOption === 'importance') {
      result = [...result].sort(
        (a, b) =>
          (IMPORTANCE_RANK[a.importance] ?? 99) -
          (IMPORTANCE_RANK[b.importance] ?? 99),
      );
    }

    return result;
  }, [tasks, selectedCategory, sortOption]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={COLORS.ORANGE}
          accessibilityRole="progressbar"
          accessibilityLabel={t('tasks.loading')}
          accessibilityLiveRegion="polite"
        />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText} accessibilityRole="alert">
          {t('tasks.error')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ------------------------------------------------------------------ */}
      {/* Filter bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
        accessibilityRole="toolbar"
        accessibilityLabel={t('tasks.filterBar')}
      >
        <Pressable
          testID="filter-all"
          onPress={() => setSelectedCategory(null)}
          style={[
            styles.filterChip,
            selectedCategory === null && styles.filterChipActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('tasks.filterAll')}
          accessibilityState={{ selected: selectedCategory === null }}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedCategory === null && styles.filterChipTextActive,
            ]}
          >
            {t('tasks.filterAll')}
          </Text>
        </Pressable>

        {categories.map((category) => (
          <Pressable
            key={category}
            testID={`filter-${category}`}
            onPress={() => setSelectedCategory(category)}
            style={[
              styles.filterChip,
              selectedCategory === category && styles.filterChipActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('tasks.filterCategory', { category })}
            accessibilityState={{ selected: selectedCategory === category }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === category && styles.filterChipTextActive,
              ]}
            >
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ------------------------------------------------------------------ */}
      {/* Sort bar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.sortBar} accessibilityRole="toolbar" accessibilityLabel={t('tasks.sortBar')}>
        <Pressable
          testID="sort-date"
          onPress={() =>
            setSortOption((prev) => (prev === 'date' ? 'none' : 'date'))
          }
          style={[
            styles.sortButton,
            sortOption === 'date' && styles.sortButtonActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('tasks.sortByDate')}
          accessibilityState={{ selected: sortOption === 'date' }}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortOption === 'date' && styles.sortButtonTextActive,
            ]}
          >
            {t('tasks.sortByDate')}
          </Text>
        </Pressable>

        <Pressable
          testID="sort-importance"
          onPress={() =>
            setSortOption((prev) =>
              prev === 'importance' ? 'none' : 'importance',
            )
          }
          style={[
            styles.sortButton,
            sortOption === 'importance' && styles.sortButtonActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('tasks.sortByImportance')}
          accessibilityState={{ selected: sortOption === 'importance' }}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortOption === 'importance' && styles.sortButtonTextActive,
            ]}
          >
            {t('tasks.sortByImportance')}
          </Text>
        </Pressable>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Task list                                                            */}
      {/* ------------------------------------------------------------------ */}
      <FlatList
        data={filteredAndSortedTasks}
        keyExtractor={(task) => task.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        accessibilityRole="list"
        accessibilityLabel={t('tasks.list')}
        renderItem={({ item: task }) => (
          <Pressable
            testID="task-item"
            onPress={() => router.push(`/task/${task.id}`)}
            style={styles.taskItem}
            accessibilityRole="button"
            accessibilityLabel={task.name}
          >
            <View testID={`task-item-${task.id}`} style={styles.taskContent}>
              <Text style={styles.taskName}>{task.name}</Text>
              <View style={styles.taskMeta}>
                {task.category !== null && (
                  <Text style={styles.taskCategory}>{task.category}</Text>
                )}
                <Text style={styles.taskSpoonCost}>
                  {t('tasks.spoonCost', { count: task.spoonCost })}
                </Text>
              </View>
              {task.dueDate !== null && (
                <Text style={styles.taskDueDate}>
                  {t('tasks.dueDate', { date: task.dueDate })}
                </Text>
              )}
            </View>
          </Pressable>
        )}
      />

      {/* ------------------------------------------------------------------ */}
      {/* FAB                                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Pressable
        testID="fab-new-task"
        onPress={() => router.push('/task/new')}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel={t('tasks.newTask')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

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

  // Filter bar
  filterBar: {
    flexGrow: 0,
    paddingVertical: 12,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: COLORS.BROWN_DARK,
    borderColor: COLORS.BROWN_DARK,
  },
  filterChipText: {
    color: COLORS.BROWN_DARK,
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.WHITE,
  },

  // Sort bar
  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  sortButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortButtonActive: {
    backgroundColor: COLORS.ORANGE,
    borderColor: COLORS.ORANGE,
  },
  sortButtonText: {
    // BROWN_DARK (#6B5744) on WHITE (#FFFFFF) — contrast ≈ 7.2:1, passes WCAG AA
    // BROWN_MEDIUM (#8B7355) was only ≈ 4.0:1 — fails for 13dp normal weight text
    color: COLORS.BROWN_DARK,
    fontSize: 13,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: COLORS.WHITE,
  },

  // Task list
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    gap: 10,
  },
  taskItem: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    minHeight: 72,
    justifyContent: 'center',
  },
  taskContent: {
    gap: 4,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  taskCategory: {
    fontSize: 12,
    // BROWN_DARK (#6B5744) on CREAM (#F7F0E8) ≈ 4.6:1 — passes WCAG AA normal text
    // (was BROWN_MEDIUM ≈ 3.6:1 which fails for 12pt normal weight)
    color: COLORS.BROWN_DARK,
    backgroundColor: COLORS.CREAM,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  taskSpoonCost: {
    fontSize: 12,
    // BROWN_DARK (#6B5744) on WHITE (#FFFFFF) ≈ 7.2:1 — passes WCAG AA
    // (was ORANGE #C45E08 on WHITE ≈ 3.9:1 which fails for 12pt normal weight)
    color: COLORS.BROWN_DARK,
    fontWeight: '600',
  },
  taskDueDate: {
    fontSize: 12,
    // BROWN_DARK (#6B5744) on WHITE (#FFFFFF) ≈ 7.2:1 — passes WCAG AA
    // (was BROWN_LIGHT #C4B5A0 ≈ 2.1:1 which fails)
    color: COLORS.BROWN_DARK,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: COLORS.BROWN_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: COLORS.WHITE,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '400',
  },
});
