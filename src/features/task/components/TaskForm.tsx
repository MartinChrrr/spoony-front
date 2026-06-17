import { ReactNode, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button-custom';
import { COLORS } from '@/constants/colors';
import { Importance } from '@/data/api/types';
import { SpoonCostSlider } from './SpoonCostSlider';

const IMPORTANCE_OPTIONS: Importance[] = ['LOW', 'MEDIUM', 'HIGH'];

/** The shape submitted by the form once validation passes. */
export interface TaskFormValues {
  name: string;
  category: string;
  importance: Importance | undefined;
  spoonCost: number;
  dueDate: string;
  notes: string;
}

/**
 * Validate the free-text due date client-side so an invalid entry shows a field
 * error instead of a generic 400 "errorSaving". Checks the YYYY-MM-DD shape AND
 * that it is a real calendar date (rejects 2026-02-30, 2026-13-01…).
 *
 * Exported so screens/tests can reuse the exact same rule. Note: this validates
 * the *format only* — it intentionally does NOT reject past dates, since editing
 * an overdue task must remain possible.
 */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export interface TaskFormProps {
  /** 'create' uses the "Add" label and a collapsible options section; 'edit' shows everything and the "Save" label. */
  mode: 'create' | 'edit';
  /** Initial field values. In edit mode these come from the loaded task; in create mode from defaults/template params. */
  initialValues: TaskFormValues;
  /** Called with validated values when the user submits. */
  onSubmit: (values: TaskFormValues) => void;
  /** Notified on every name keystroke (e.g. the edit screen mirrors it in its title). */
  onNameChange?: (name: string) => void;
  /** Submit button busy/disabled state, owned by the screen's mutation. */
  isSubmitting?: boolean;
  /** Disable the submit button for an external reason (e.g. a delete in flight). */
  submitDisabled?: boolean;
  /** Error message from a failed submit (mutation rejection), rendered above the button. */
  submitError?: string;
  /**
   * When true (create mode), the optional fields sit behind a "More options"
   * toggle. The toggle starts expanded if `defaultExpanded` is set.
   */
  collapsible?: boolean;
  /** Initial expanded state of the collapsible options section. */
  defaultExpanded?: boolean;
  /** Rendered between the header area and the name field (e.g. the "from template" badge). */
  topSlot?: ReactNode;
  /** Rendered after the submit button (e.g. the delete button + confirm modal). */
  bottomSlot?: ReactNode;
}

/**
 * Shared task create/edit form. Owns the field state and client-side validation
 * (name required + due-date format); the parent screen owns data loading,
 * mutations, navigation and any extra controls passed via slots.
 */
export function TaskForm({
  mode,
  initialValues,
  onSubmit,
  onNameChange,
  isSubmitting = false,
  submitDisabled = false,
  submitError = '',
  collapsible = false,
  defaultExpanded = false,
  topSlot,
  bottomSlot,
}: TaskFormProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(initialValues.name);
  const [category, setCategory] = useState(initialValues.category);
  const [importance, setImportance] = useState<Importance | undefined>(initialValues.importance);
  const [spoonCost, setSpoonCost] = useState(initialValues.spoonCost);
  const [dueDate, setDueDate] = useState(initialValues.dueDate);
  const [notes, setNotes] = useState(initialValues.notes);

  const [showMoreOptions, setShowMoreOptions] = useState(defaultExpanded);
  const [nameError, setNameError] = useState('');
  const [dueDateError, setDueDateError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setNameError(t('taskForm.nameRequired'));
      return;
    }
    setNameError('');

    // Reject a malformed date here so the user sees a field error rather than a
    // generic save failure from the backend's 400. Applies in BOTH modes.
    if (dueDate.trim() !== '' && !isValidISODate(dueDate.trim())) {
      setDueDateError(t('taskForm.dueDateInvalid'));
      return;
    }
    setDueDateError('');

    onSubmit({ name, category, importance, spoonCost, dueDate, notes });
  };

  // The optional fields. Identical markup in both modes; only the wrapping
  // (always-on vs behind a toggle) differs.
  const optionalFields = (
    <>
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
        <SpoonCostSlider value={spoonCost} onChange={setSpoonCost} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('taskForm.dueDateLabel')}</Text>
        <TextInput
          testID="task-due-date-input"
          value={dueDate}
          onChangeText={(text) => {
            setDueDate(text);
            if (dueDateError) setDueDateError('');
          }}
          accessibilityLabel={t('taskForm.dueDateLabel')}
          accessibilityHint={t('taskForm.dueDateHint')}
          style={styles.input}
          placeholder={t('taskForm.dueDatePlaceholder')}
          keyboardType="numbers-and-punctuation"
        />
        {dueDateError ? (
          <Text style={styles.errorText} accessibilityRole="alert">
            {dueDateError}
          </Text>
        ) : null}
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
    </>
  );

  return (
    <>
      {topSlot}

      <View style={styles.field}>
        <Text style={styles.label}>{t('taskForm.name')}</Text>
        <TextInput
          testID="task-name-input"
          value={name}
          onChangeText={(text) => {
            setName(text);
            onNameChange?.(text);
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

      {collapsible ? (
        <>
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
          {showMoreOptions && <View style={styles.moreOptions}>{optionalFields}</View>}
        </>
      ) : (
        optionalFields
      )}

      {submitError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {submitError}
        </Text>
      ) : null}

      <Button
        testID="save-task-button"
        label={mode === 'create' ? t('taskForm.add') : t('taskForm.save')}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting || submitDisabled}
      />

      {bottomSlot}
    </>
  );
}

const styles = StyleSheet.create({
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
});
