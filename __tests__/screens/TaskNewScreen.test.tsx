import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
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

    // Save
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Tâche complète',
          category: 'santé',
          importance: 'HIGH',
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
});
