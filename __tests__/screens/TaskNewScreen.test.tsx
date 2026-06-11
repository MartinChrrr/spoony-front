import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockBack = jest.fn();
const mockNavigate = jest.fn();
const mockSearchParams = jest.fn(() => ({}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, navigate: mockNavigate }),
  useLocalSearchParams: () => mockSearchParams(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockMutateAsync = jest.fn().mockResolvedValue({});

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

jest.mock('@/data/repositories/taskRepository', () => ({
  taskRepository: { create: jest.fn() },
}));

const mockCreateManual = jest.fn();

jest.mock('@/data/repositories/taskLogRepository', () => ({
  taskLogRepository: { createManual: (...args: unknown[]) => mockCreateManual(...args) },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderScreen() {
  const TaskNewScreen = require('../../app/task/new').default;
  return render(<TaskNewScreen />);
}

/** Today as a local YYYY-MM-DD string — mirrors the screen's own helper. */
function localTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TaskNewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ id: 'task-1' });
    mockCreateManual.mockResolvedValue({ id: 'log-1' });
    mockSearchParams.mockReturnValue({});
  });

  // -------------------------------------------------------------------------
  // 1. Creates a task when only the name is provided
  // -------------------------------------------------------------------------

  it('should_CreateTask_When_OnlyNameProvided', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('task-name-input')).toBeTruthy();
    });

    // Act
    fireEvent.changeText(screen.getByTestId('task-name-input'), 'Nouvelle tâche');
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nouvelle tâche' }),
      );
    });

    // Assert — after adding, the user lands back on the Tasks list (per spec)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/tasks');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Creates a task when all optional fields are provided
  // -------------------------------------------------------------------------

  it('should_CreateTask_When_AllFieldsProvided', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('task-name-input')).toBeTruthy();
    });

    // Act — fill name
    fireEvent.changeText(screen.getByTestId('task-name-input'), 'Tâche complète');

    // Expand the "Plus d'options" section
    fireEvent.press(screen.getByTestId('more-options-toggle'));

    await waitFor(() => {
      expect(screen.getByTestId('task-category-input')).toBeTruthy();
    });

    // Fill category
    fireEvent.changeText(screen.getByTestId('task-category-input'), 'santé');

    // Select importance HIGH
    fireEvent.press(screen.getByTestId('importance-HIGH'));

    // Increase spoon cost (default 1 → 2 → 3)
    // Buttons are hidden from a11y tree but still interactive
    fireEvent.press(screen.getByTestId('spoon-cost-increment', { includeHiddenElements: true }));
    fireEvent.press(screen.getByTestId('spoon-cost-increment', { includeHiddenElements: true }));

    // Fill due date
    fireEvent.changeText(screen.getByTestId('task-due-date-input'), '2026-04-15');

    // Save
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Tâche complète',
          category: 'santé',
          importance: 'HIGH',
          spoonCost: 3,
          dueDate: '2026-04-15',
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 3. Shows a validation error and blocks submission when name is empty
  // -------------------------------------------------------------------------

  it('should_ShowValidationError_When_NameEmpty', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('save-task-button')).toBeTruthy();
    });

    // Act — press save without filling the name
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert — error message appears
    await waitFor(() => {
      expect(screen.getByText('taskForm.nameRequired')).toBeTruthy();
    });

    // Assert — mutation was NOT called
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3b. N2: rejects a malformed due date with a field error, no backend call
  // -------------------------------------------------------------------------

  it('should_ShowDueDateError_When_DateInvalid', async () => {
    // Arrange
    renderScreen();
    fireEvent.changeText(screen.getByTestId('task-name-input'), 'Tâche');
    fireEvent.press(screen.getByTestId('more-options-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('task-due-date-input')).toBeTruthy();
    });

    // Act — a syntactically wrong date, then a non-existent calendar date
    fireEvent.changeText(screen.getByTestId('task-due-date-input'), '15/04/2026');
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert — field error shown, mutation blocked
    await waitFor(() => {
      expect(screen.getByText('taskForm.dueDateInvalid')).toBeTruthy();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();

    // A real-looking but impossible date is rejected too
    fireEvent.changeText(screen.getByTestId('task-due-date-input'), '2026-02-30');
    fireEvent.press(screen.getByTestId('save-task-button'));
    await waitFor(() => {
      expect(screen.getByText('taskForm.dueDateInvalid')).toBeTruthy();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Pre-fills the form (with "from template" badge) when opened from a model
  // -------------------------------------------------------------------------

  it('should_PrefillAndShowBadge_When_OpenedFromTemplate', async () => {
    // Arrange — launched from "Choisir un modèle"
    mockSearchParams.mockReturnValue({
      baseTaskId: 'a1',
      templateKey: 'tasks.hygiene.shower',
      spoonCost: '2',
      importance: 'MEDIUM',
      category: 'HYGIENE',
    });
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('from-template-badge')).toBeTruthy();
    });

    // Act — submit without changing anything else (editable, not forced)
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert — prefilled values from the template are submitted. N3: the raw
    // category enum is localized before persisting, so it is no longer 'HYGIENE'
    // but the resolved label (here the i18n key, since the test t() returns the
    // key; real i18n yields "Hygiène").
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'tasks.hygiene.shower',
          category: 'tasks.categories.HYGIENE',
          importance: 'MEDIUM',
          spoonCost: 2,
        }),
      );
    });
  });

  // N3: the localized category persisted from a template is never the raw enum
  it('should_LocalizeCategory_When_OpenedFromTemplate', async () => {
    mockSearchParams.mockReturnValue({
      baseTaskId: 'a1',
      templateKey: 'tasks.hygiene.shower',
      category: 'HYGIENE',
    });
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('from-template-badge')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('save-task-button'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
    const submitted = mockMutateAsync.mock.calls[0][0];
    expect(submitted.category).not.toBe('HYGIENE');
  });

  // -------------------------------------------------------------------------
  // 5. ADR-007: a task due today also creates today's log (shows on Home)
  // -------------------------------------------------------------------------

  it('should_CreateTodayLog_When_DueDateIsToday', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('task-name-input')).toBeTruthy();
    });

    // Act — name + due date set to today
    fireEvent.changeText(screen.getByTestId('task-name-input'), 'Tâche du jour');
    fireEvent.press(screen.getByTestId('more-options-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('task-due-date-input')).toBeTruthy();
    });
    fireEvent.changeText(screen.getByTestId('task-due-date-input'), localTodayISO());
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert — the task is created, then a manual log for the returned task id
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockCreateManual).toHaveBeenCalledWith('task-1');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/tasks');
  });

  // -------------------------------------------------------------------------
  // 6. ADR-007: a task due later (not today) does NOT create a day log
  // -------------------------------------------------------------------------

  it('should_NotCreateLog_When_DueDateIsNotToday', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('task-name-input')).toBeTruthy();
    });

    // Act — name + a clearly future due date
    fireEvent.changeText(screen.getByTestId('task-name-input'), 'Tâche future');
    fireEvent.press(screen.getByTestId('more-options-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('task-due-date-input')).toBeTruthy();
    });
    fireEvent.changeText(screen.getByTestId('task-due-date-input'), '2099-12-31');
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert — task created, navigation happened, but no day log was created
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/tasks');
    });
    expect(mockCreateManual).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 7. ADR-007: a failed day-log must not break the create flow
  // -------------------------------------------------------------------------

  it('should_StillNavigate_When_DayLogFails', async () => {
    // Arrange — the manual log call rejects
    mockCreateManual.mockRejectedValue(new Error('network'));
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('task-name-input')).toBeTruthy();
    });

    // Act — due today so the log path is taken
    fireEvent.changeText(screen.getByTestId('task-name-input'), 'Tâche du jour');
    fireEvent.press(screen.getByTestId('more-options-toggle'));
    await waitFor(() => {
      expect(screen.getByTestId('task-due-date-input')).toBeTruthy();
    });
    fireEvent.changeText(screen.getByTestId('task-due-date-input'), localTodayISO());
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert — the flow still completes (no thrown error, navigation happens)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/tasks');
    });
    expect(mockCreateManual).toHaveBeenCalledWith('task-1');
  });
});
