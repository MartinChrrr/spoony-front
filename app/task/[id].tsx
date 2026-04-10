import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskRepository } from '@/data/repositories/taskRepository';
import { Button } from '@/components/ui/button-custom';
import { COLORS } from '@/constants/colors';
import { Importance } from '@/data/api/types';

const IMPORTANCE_OPTIONS: Importance[] = ['LOW', 'MEDIUM', 'HIGH'];

export default function TaskDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [importance, setImportance] = useState<Importance | undefined>(undefined);
  const [spoonCost, setSpoonCost] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameError, setNameError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const initialised = useRef(false);
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => taskRepository.getById(id),
    enabled: Boolean(id),
  });

  const { mutateAsync: updateMutateAsync, isPending: isUpdating } = useMutation({
    mutationFn: (data: Parameters<typeof taskRepository.update>[1]) =>
      taskRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const { mutateAsync: deleteMutateAsync, isPending: isDeleting } = useMutation({
    mutationFn: () => taskRepository.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  useEffect(() => {
    if (task && !initialised.current) {
      initialised.current = true;
      setName(task.name ?? '');
      setCategory(task.category ?? '');
      setImportance(task.importance ?? undefined);
      setSpoonCost(task.spoonCost != null ? String(task.spoonCost) : '');
      setNotes(task.notes ?? '');
      setDueDate(task.dueDate ?? '');
    }
  }, [task]);

  const handleSave = async () => {
    setSaveError('');

    if (!name.trim()) {
      setNameError(t('taskForm.nameRequired'));
      return;
    }

    setNameError('');

    const payload: {
      name?: string;
      category?: string;
      importance?: Importance;
      spoonCost?: number;
      notes?: string;
      dueDate?: string;
    } = {};

    if (name.trim()) payload.name = name.trim();
    if (category.trim()) payload.category = category.trim();
    if (importance) payload.importance = importance;
    if (spoonCost.trim()) payload.spoonCost = Number(spoonCost);
    if (notes.trim()) payload.notes = notes.trim();
    if (dueDate.trim()) payload.dueDate = dueDate.trim();

    try {
      await updateMutateAsync(payload);
      router.back();
    } catch {
      setSaveError(t('taskForm.errorSaving'));
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteMutateAsync();
      router.back();
    } catch {
      setDeleteError(t('taskForm.errorDeleting'));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text accessibilityRole="text">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Screen header landmark — required for VoiceOver/TalkBack navigation */}
      <Text style={styles.screenTitle} accessibilityRole="header">
        {name || t('taskForm.editTaskTitle')}
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>{t('taskForm.name')}</Text>
        <TextInput
          testID="task-name-input"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (nameError) setNameError('');
          }}
          accessibilityLabel={t('taskForm.name')}
          style={styles.input}
          placeholder={t('taskForm.namePlaceholder')}
        />
        {nameError ? (
          <Text style={styles.errorText} accessibilityRole="alert">
            {nameError}
          </Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('taskForm.category')}</Text>
        <TextInput
          testID="task-category-input"
          value={category}
          onChangeText={setCategory}
          accessibilityLabel={t('taskForm.category')}
          style={styles.input}
          placeholder={t('taskForm.categoryPlaceholder')}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('taskForm.importance')}</Text>
        {/* Radio group: mutually exclusive importance levels */}
        <View
          style={styles.importanceRow}
          accessible
          accessibilityRole="radiogroup"
          accessibilityLabel={t('taskForm.importance')}
        >
          {IMPORTANCE_OPTIONS.map((level) => (
            <Pressable
              key={level}
              testID={`importance-${level}`}
              onPress={() => setImportance(level)}
              accessibilityRole="radio"
              accessibilityLabel={t(`taskForm.importance${level}`)}
              accessibilityState={{ checked: importance === level }}
              style={[
                styles.importanceButton,
                importance === level && styles.importanceButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.importanceText,
                  importance === level && styles.importanceTextSelected,
                ]}
                importantForAccessibility="no"
                accessibilityElementsHidden
              >
                {t(`taskForm.importance${level}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('taskForm.spoonCost')}</Text>
        <TextInput
          testID="task-spoon-cost-input"
          value={spoonCost}
          onChangeText={setSpoonCost}
          accessibilityLabel={t('taskForm.spoonCost')}
          style={styles.input}
          keyboardType="numeric"
          placeholder="1"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('taskForm.notes')}</Text>
        <TextInput
          testID="task-notes-input"
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel={t('taskForm.notes')}
          style={[styles.input, styles.textArea]}
          multiline
          placeholder={t('taskForm.notesPlaceholder')}
        />
      </View>

      {saveError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {saveError}
        </Text>
      ) : null}

      <Button
        testID="save-task-button"
        label={t('taskForm.save')}
        onPress={handleSave}
        loading={isUpdating}
        disabled={isUpdating || isDeleting}
      />

      <Pressable
        testID="delete-task-button"
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel={t('taskForm.delete')}
        style={styles.deleteButton}
      >
        <Text style={styles.deleteText}>{t('taskForm.delete')}</Text>
      </Pressable>

      {showDeleteConfirm && (
        <View style={styles.confirmContainer}>
          {/* accessibilityLiveRegion="assertive" announces this destructive
              confirmation dialog immediately when it appears on screen */}
          <Text
            style={styles.confirmText}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            {t('taskForm.deleteConfirm')}
          </Text>
          {deleteError ? (
            <Text style={styles.errorText} accessibilityRole="alert">
              {deleteError}
            </Text>
          ) : null}
          <View style={styles.confirmActions}>
            <Pressable
              testID="confirm-delete-button"
              onPress={handleConfirmDelete}
              accessibilityRole="button"
              accessibilityLabel={t('taskForm.confirmDelete')}
              style={[styles.confirmButton, styles.confirmButtonDanger]}
            >
              <Text style={styles.confirmButtonText}>{t('taskForm.confirmDelete')}</Text>
            </Pressable>
            <Pressable
              testID="cancel-delete-button"
              onPress={() => setShowDeleteConfirm(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              style={[styles.confirmButton, styles.confirmButtonCancel]}
            >
              <Text style={styles.confirmButtonCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.CREAM,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.BROWN_DARK,
    backgroundColor: COLORS.WHITE,
    minHeight: 44,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 12,
    marginTop: 4,
  },
  importanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  importanceButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.WHITE,
  },
  importanceButtonSelected: {
    borderColor: COLORS.ORANGE,
    backgroundColor: COLORS.ORANGE_LIGHT,
  },
  importanceText: {
    fontSize: 13,
    color: COLORS.BROWN_DARK,
    fontWeight: '500',
  },
  importanceTextSelected: {
    color: COLORS.BROWN_DARK,
    fontWeight: '700',
  },
  deleteButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  deleteText: {
    color: COLORS.ERROR,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
  },
  confirmText: {
    fontSize: 14,
    color: COLORS.BROWN_DARK,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDanger: {
    backgroundColor: COLORS.ERROR,
  },
  confirmButtonCancel: {
    backgroundColor: COLORS.BROWN_LIGHT,
  },
  confirmButtonText: {
    color: COLORS.WHITE,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButtonCancelText: {
    color: COLORS.BROWN_DARK,
    fontWeight: '600',
    fontSize: 14,
  },
});
