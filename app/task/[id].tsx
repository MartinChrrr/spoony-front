import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskRepository } from '@/data/repositories/taskRepository';
import { queryKeys } from '@/data/query/queryKeys';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { BackButton } from '@/components/ui/BackButton';
import { COLORS } from '@/constants/colors';
import { Importance } from '@/data/api/types';
import { TaskForm, TaskFormValues } from '@/features/task/components/TaskForm';

export default function TaskDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { id } = useLocalSearchParams<{ id: string }>();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  // Mirrors the form's name field so the header title updates live as the user
  // types, matching the pre-refactor behaviour. Seeded from the loaded task.
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);

  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: queryKeys.task(userId, id),
    queryFn: () => taskRepository.getById(userId, id),
    enabled: userId !== '' && Boolean(id),
  });

  const { mutateAsync: updateMutateAsync, isPending: isUpdating } = useMutation({
    mutationFn: (data: Parameters<typeof taskRepository.update>[1]) =>
      taskRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
    },
  });

  const { mutateAsync: deleteMutateAsync, isPending: isDeleting } = useMutation({
    mutationFn: () => taskRepository.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
    },
  });

  const handleSave = async (values: TaskFormValues) => {
    setSaveError('');

    const payload: {
      name?: string;
      category?: string;
      importance?: Importance;
      spoonCost?: number;
      notes?: string;
      dueDate?: string;
    } = {};

    if (values.name.trim()) payload.name = values.name.trim();
    if (values.category.trim()) payload.category = values.category.trim();
    if (values.importance) payload.importance = values.importance;
    if (values.spoonCost > 0) payload.spoonCost = values.spoonCost;
    if (values.notes.trim()) payload.notes = values.notes.trim();
    if (values.dueDate.trim()) payload.dueDate = values.dueDate.trim();

    try {
      await updateMutateAsync(payload);
      router.back();
    } catch {
      setSaveError(t('taskForm.errorSaving'));
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteMutateAsync();
      router.back();
    } catch {
      setDeleteError(t('taskForm.errorDeleting'));
    }
  };

  if (isLoading || !task) {
    return (
      <View style={styles.loadingContainer}>
        <Text accessibilityRole="text">{t('common.loading')}</Text>
      </View>
    );
  }

  // The form is mounted only once the task is loaded, so its initial state is
  // seeded directly from the task (no post-mount useEffect/ref dance).
  const initialValues: TaskFormValues = {
    name: task.name ?? '',
    category: task.category ?? '',
    importance: task.importance ?? undefined,
    spoonCost: task.spoonCost ?? 1,
    dueDate: task.dueDate ?? '',
    notes: task.notes ?? '',
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      {/* Screen header landmark — required for VoiceOver/TalkBack navigation */}
      <Text style={styles.screenTitle} accessibilityRole="header">
        {(displayName ?? task.name) || t('taskForm.editTaskTitle')}
      </Text>

      <TaskForm
        mode="edit"
        initialValues={initialValues}
        onSubmit={handleSave}
        onNameChange={setDisplayName}
        isSubmitting={isUpdating}
        submitDisabled={isDeleting}
        submitError={saveError}
        bottomSlot={
          <>
            <Pressable
              testID="delete-task-button"
              onPress={() => setShowDeleteConfirm(true)}
              accessibilityRole="button"
              accessibilityLabel={t('taskForm.delete')}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>{t('taskForm.delete')}</Text>
            </Pressable>

            <Modal
              visible={showDeleteConfirm}
              transparent
              animationType="fade"
              accessibilityViewIsModal
              onRequestClose={() => setShowDeleteConfirm(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.confirmContainer}>
                  <Text style={styles.confirmText} accessibilityRole="header">
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
              </View>
            </Modal>
          </>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.CREAM,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 12,
    marginTop: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmContainer: {
    width: '100%',
    maxWidth: 400,
    padding: 16,
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
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
