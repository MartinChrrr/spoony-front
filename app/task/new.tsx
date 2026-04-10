import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskRepository } from '@/data/repositories/taskRepository';
import { Button } from '@/components/ui/button-custom';
import { COLORS } from '@/constants/colors';
import { Importance } from '@/data/api/types';

const IMPORTANCE_OPTIONS: Importance[] = ['LOW', 'MEDIUM', 'HIGH'];

export default function TaskNewScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [importance, setImportance] = useState<Importance | undefined>(undefined);
  const [spoonCost, setSpoonCost] = useState(1);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [nameError, setNameError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: taskRepository.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleSave = async () => {
    setSubmitError('');

    if (!name.trim()) {
      setNameError(t('taskForm.nameRequired'));
      return;
    }

    setNameError('');

    const payload: {
      name: string;
      category?: string;
      importance?: Importance;
      spoonCost?: number;
      dueDate?: string;
      notes?: string;
    } = { name: name.trim() };

    if (category.trim()) payload.category = category.trim();
    if (importance) payload.importance = importance;
    if (spoonCost > 0) payload.spoonCost = spoonCost;
    if (dueDate.trim()) payload.dueDate = dueDate.trim();
    if (notes.trim()) payload.notes = notes.trim();

    try {
      await mutateAsync(payload);
      router.back();
    } catch {
      setSubmitError(t('taskForm.errorSaving'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Screen header landmark — required for VoiceOver/TalkBack navigation */}
      <Text style={styles.screenTitle} accessibilityRole="header">
        {t('taskForm.newTaskTitle')}
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>
          {t('taskForm.name')}
        </Text>
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

      <Pressable
        testID="more-options-toggle"
        onPress={() => setShowMoreOptions((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={t('taskForm.moreOptions')}
        accessibilityState={{ expanded: showMoreOptions }}
        style={styles.toggleButton}
      >
        <Text style={styles.toggleText}>
          {showMoreOptions ? t('taskForm.lessOptions') : t('taskForm.moreOptions')}
        </Text>
      </Pressable>

      {showMoreOptions && (
        <View style={styles.moreOptions}>
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
            <Text style={styles.label}>
              {t('taskForm.spoonCost')} : {spoonCost}
            </Text>
            <View style={styles.sliderRow}>
              <Pressable
                testID="spoon-cost-decrement"
                onPress={() => setSpoonCost((prev) => Math.max(1, prev - 1))}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
                style={styles.sliderButton}
              >
                <Text style={styles.sliderButtonText}>-</Text>
              </Pressable>
              <View
                testID="task-spoon-cost-slider"
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel={t('taskForm.spoonCost')}
                accessibilityValue={{ min: 1, max: 5, now: spoonCost }}
                style={styles.sliderTrack}
              >
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${((spoonCost - 1) / 4) * 100}%` },
                  ]}
                />
              </View>
              <Pressable
                testID="spoon-cost-increment"
                onPress={() => setSpoonCost((prev) => Math.min(5, prev + 1))}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
                style={styles.sliderButton}
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('taskForm.dueDateLabel')}</Text>
            <TextInput
              testID="task-due-date-input"
              value={dueDate}
              onChangeText={setDueDate}
              accessibilityLabel={t('taskForm.dueDateLabel')}
              accessibilityHint={t('taskForm.dueDateHint')}
              style={styles.input}
              placeholder={t('taskForm.dueDatePlaceholder')}
              keyboardType="numbers-and-punctuation"
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
        </View>
      )}

      {submitError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {submitError}
        </Text>
      ) : null}

      <Button
        testID="save-task-button"
        label={t('taskForm.save')}
        onPress={handleSave}
        loading={isPending}
        disabled={isPending}
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
  toggleButton: {
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 16,
  },
  toggleText: {
    color: COLORS.ORANGE,
    fontWeight: '600',
    fontSize: 14,
  },
  moreOptions: {
    marginBottom: 16,
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
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.BROWN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.WHITE,
    lineHeight: 24,
  },
  sliderTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.BROWN_LIGHT,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: COLORS.ORANGE,
  },
});
