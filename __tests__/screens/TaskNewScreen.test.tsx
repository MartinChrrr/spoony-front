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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderScreen() {
  const TaskNewScreen = require('../../app/task/new').default;
  return render(<TaskNewScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TaskNewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
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

    // Assert — prefilled values from the template are submitted
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'tasks.hygiene.shower',
          category: 'HYGIENE',
          importance: 'MEDIUM',
          spoonCost: 2,
        }),
      );
    });
  });
});
