import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskRepository } from '@/data/repositories/taskRepository';
import { taskLogRepository } from '@/data/repositories/taskLogRepository';
import { queryKeys } from '@/data/query/queryKeys';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { BackButton } from '@/components/ui/BackButton';
import { useToast } from '@/components/ui/Toast';
import { COLORS } from '@/constants/colors';
import { Importance } from '@/data/api/types';
import { TaskForm, TaskFormValues } from '@/features/task/components/TaskForm';

/** Reads a single-value search param (expo-router can hand back string[]). */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Today as a local YYYY-MM-DD string. We build it from local calendar parts on
 * purpose — `new Date().toISOString()` would yield the UTC date, which drifts a
 * day off in the evening for UTC+ users and would mis-detect "due today".
 */
function localTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isImportance(value: string | undefined): value is Importance {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH';
}

export default function TaskNewScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const toast = useToast();

  // When launched from "Choisir un modèle", the screen is pre-filled from a
  // prefab base task and the user edits it before validating.
  const params = useLocalSearchParams<{
    baseTaskId?: string | string[];
    templateKey?: string | string[];
    spoonCost?: string | string[];
    importance?: string | string[];
    category?: string | string[];
  }>();
  const baseTaskId = firstParam(params.baseTaskId);
  const templateKey = firstParam(params.templateKey);
  const fromTemplate = baseTaskId !== undefined && baseTaskId.length > 0;
  const templateImportance = firstParam(params.importance);
  const templateSpoonCost = Number(firstParam(params.spoonCost));

  // N3: a template hands over the raw category enum (e.g. HYGIENE). Localize it
  // to a free-text label (e.g. "Hygiène") so it persists consistently with
  // manually-typed categories and the Tasks filter chips stop mixing enums and
  // free text. Unknown/free values fall through unchanged via defaultValue.
  const rawCategory = firstParam(params.category) ?? '';

  const initialValues: TaskFormValues = {
    name: templateKey ? t(templateKey) : '',
    category: rawCategory
      ? t(`tasks.categories.${rawCategory}`, { defaultValue: rawCategory })
      : '',
    importance: isImportance(templateImportance) ? templateImportance : undefined,
    spoonCost:
      Number.isFinite(templateSpoonCost) && templateSpoonCost > 0 ? templateSpoonCost : 1,
    dueDate: '',
    notes: '',
  };

  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState('');

  const { mutateAsync, isPending } = useMutation({
    mutationFn: taskRepository.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
    },
  });

  const handleSave = async (values: TaskFormValues) => {
    const payload: {
      name: string;
      category?: string;
      importance?: Importance;
      spoonCost?: number;
      dueDate?: string;
      notes?: string;
    } = { name: values.name.trim() };

    if (values.category.trim()) payload.category = values.category.trim();
    if (values.importance) payload.importance = values.importance;
    if (values.spoonCost > 0) payload.spoonCost = values.spoonCost;
    if (values.dueDate.trim()) payload.dueDate = values.dueDate.trim();
    if (values.notes.trim()) payload.notes = values.notes.trim();

    try {
      const created = await mutateAsync(payload);

      // ADR-007: when the task is due today, also create today's PLANNED log so
      // it appears on Home (which reads ['task-logs']), not just the Tasks tab.
      // A pure string compare avoids parsing the free-text input (no UTC drift).
      const dueDate = values.dueDate.trim();
      let landedToday = false;
      if (dueDate !== '' && dueDate === localTodayISO() && created?.id) {
        try {
          await taskLogRepository.createManual(created.id);
          queryClient.invalidateQueries({ queryKey: queryKeys.taskLogs(userId) });
          landedToday = true;
        } catch {
          // The task itself was created; a failed day-log must not break the
          // flow nor surface an anxiety-inducing error (committee decision).
        }
      }

      toast.show(landedToday ? t('taskForm.addedToday') : t('taskForm.added'));
      // Pop the whole add-task stack (choose → form) and land on the Tasks tab.
      if (router.canDismiss?.()) {
        router.dismissAll();
      }
      router.navigate('/(tabs)/tasks');
    } catch {
      setSubmitError(t('taskForm.errorSaving'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      {/* Screen header landmark — required for VoiceOver/TalkBack navigation */}
      <Text style={styles.screenTitle} accessibilityRole="header">
        {t('taskForm.newTaskTitle')}
      </Text>

      <TaskForm
        mode="create"
        collapsible
        defaultExpanded={fromTemplate}
        initialValues={initialValues}
        onSubmit={(values) => {
          setSubmitError('');
          handleSave(values);
        }}
        isSubmitting={isPending}
        submitError={submitError}
        topSlot={
          fromTemplate ? (
            <View
              testID="from-template-badge"
              style={styles.templateBadge}
              accessibilityRole="text"
            >
              <Text style={styles.templateBadgeText}>{t('taskForm.fromTemplate')}</Text>
            </View>
          ) : null
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.CREAM,
    flexGrow: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    marginBottom: 20,
  },
  templateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.ORANGE_LIGHT,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: -12,
    marginBottom: 16,
  },
  templateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
  },
});
