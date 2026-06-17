import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { TaskResponse } from '@/data/api/endpoints/tasks';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 'task-1' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUpdateMutateAsync = jest.fn().mockResolvedValue({});
const mockDeleteMutateAsync = jest.fn().mockResolvedValue({});

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

jest.mock('@/data/repositories/taskRepository', () => ({
  taskRepository: {
    getById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_TASK: TaskResponse = {
  id: 'task-1',
  name: 'Faire le ménage',
  spoonCost: 2,
  importance: 'HIGH',
  category: 'quotidien',
  dueDate: '2026-04-10',
  notes: 'Notes test',
  status: 'ACTIVE',
  completedAt: null,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { useQuery, useMutation } from '@tanstack/react-query';

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockedUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

function setupDefaultMocks() {
  mockedUseQuery.mockReturnValue({
    data: MOCK_TASK,
    isLoading: false,
  } as ReturnType<typeof useQuery>);

  // The component calls useMutation twice per render (update then delete).
  // Using mockImplementation with a per-render-cycle counter handles re-renders
  // gracefully (React strict mode, act batching, etc.).
  let callIndex = 0;
  mockedUseMutation.mockImplementation(() => {
    const isUpdate = callIndex % 2 === 0;
    callIndex++;
    return {
      mutateAsync: isUpdate ? mockUpdateMutateAsync : mockDeleteMutateAsync,
      isPending: false,
      isIdle: true,
      isError: false,
      isSuccess: false,
    } as unknown as ReturnType<typeof useMutation>;
  });
}

function renderScreen() {
  const TaskDetailScreen = require('../../app/task/[id]').default;
  return render(<TaskDetailScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TaskDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateMutateAsync.mockResolvedValue({});
    mockDeleteMutateAsync.mockResolvedValue({});
    setupDefaultMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Task data is loaded and pre-populates the form
  // -------------------------------------------------------------------------

  it('should_LoadTask_When_ScreenOpens', async () => {
    // Arrange / Act
    renderScreen();

    // Assert — name input is pre-filled with the task name
    await waitFor(() => {
      const nameInput = screen.getByTestId('task-name-input');
      expect(
        nameInput.props.value ?? nameInput.props.defaultValue,
      ).toBe('Faire le ménage');
    });

    // Assert — other fields are also populated
    await waitFor(() => {
      // Category field
      const categoryInput = screen.getByTestId('task-category-input');
      expect(
        categoryInput.props.value ?? categoryInput.props.defaultValue,
      ).toBe('quotidien');

      // Spoon cost slider
      const spoonSlider = screen.getByTestId('task-spoon-cost-slider');
      expect(spoonSlider.props.accessibilityValue.now).toBe(2);

      // Due date field
      const dueDateInput = screen.getByTestId('task-due-date-input');
      expect(
        dueDateInput.props.value ?? dueDateInput.props.defaultValue,
      ).toBe('2026-04-10');

      // Notes field
      const notesInput = screen.getByTestId('task-notes-input');
      expect(
        notesInput.props.value ?? notesInput.props.defaultValue,
      ).toBe('Notes test');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Saving with a changed name calls the update mutation
  // -------------------------------------------------------------------------

  it('should_UpdateTask_When_SavePressed', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('task-name-input')).toBeTruthy();
    });

    // Act — change the name and save
    fireEvent.changeText(screen.getByTestId('task-name-input'), 'Ménage complet');
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert
    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Ménage complet' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2b. Due-date validation now also guards the EDIT screen (shared TaskForm).
  //     Previously the edit screen had no client-side date check, so a
  //     malformed date fell through to a generic 400. After mutualizing the
  //     form, the same format rule applies here.
  // -------------------------------------------------------------------------

  it('should_ShowDueDateError_When_DateInvalidOnEdit', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('task-due-date-input')).toBeTruthy();
    });

    // Act — replace the valid loaded date with a malformed one, then save
    fireEvent.changeText(screen.getByTestId('task-due-date-input'), '10/04/2026');
    fireEvent.press(screen.getByTestId('save-task-button'));

    // Assert — field error shown, update mutation blocked
    await waitFor(() => {
      expect(screen.getByText('taskForm.dueDateInvalid')).toBeTruthy();
    });
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();

    // A real-looking but impossible calendar date is rejected too
    fireEvent.changeText(screen.getByTestId('task-due-date-input'), '2026-02-30');
    fireEvent.press(screen.getByTestId('save-task-button'));
    await waitFor(() => {
      expect(screen.getByText('taskForm.dueDateInvalid')).toBeTruthy();
    });
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  // 2c. A valid (even if past) date still saves — editing an overdue task must
  //     remain possible, so the rule is format-only, not "future only".
  it('should_StillSave_When_DueDatePastButValidOnEdit', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('task-due-date-input')).toBeTruthy();
    });

    // The fixture's date 2026-04-10 is already in the past relative to "today",
    // yet it is a valid ISO date and must not block saving.
    fireEvent.changeText(screen.getByTestId('task-due-date-input'), '2020-01-01');
    fireEvent.press(screen.getByTestId('save-task-button'));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ dueDate: '2020-01-01' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 3. Confirming delete calls the delete mutation then navigates back
  // -------------------------------------------------------------------------

  it('should_DeleteTask_When_DeletePressed', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('delete-task-button')).toBeTruthy();
    });

    // Act — press delete, then confirm
    fireEvent.press(screen.getByTestId('delete-task-button'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-delete-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('confirm-delete-button'));

    // Assert — delete mutation called
    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Assert — navigated back after deletion
    await waitFor(() => {
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });
});
