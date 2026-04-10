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

  // The component calls useMutation twice per render: update then delete.
  // Use mockImplementation with a closure to alternate per-render-cycle.
  let callCount = 0;
  mockedUseMutation.mockImplementation(() => {
    const isUpdate = callCount % 2 === 0;
    callCount++;
    return {
      mutateAsync: isUpdate ? mockUpdateMutateAsync : mockDeleteMutateAsync,
      isPending: false,
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
