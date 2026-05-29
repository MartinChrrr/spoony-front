import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { TaskResponse } from '@/data/api/endpoints/tasks';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/data/repositories/taskRepository', () => ({
  taskRepository: { getAll: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_TASKS: TaskResponse[] = [
  {
    id: 'task-1',
    name: 'Faire le ménage',
    spoonCost: 2,
    importance: 'HIGH',
    category: 'quotidien',
    dueDate: '2026-04-10',
    notes: null,
    status: 'ACTIVE',
    completedAt: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'task-2',
    name: 'Rendez-vous médecin',
    spoonCost: 4,
    importance: 'MEDIUM',
    category: 'santé',
    dueDate: '2026-04-08',
    notes: null,
    status: 'ACTIVE',
    completedAt: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'task-3',
    name: 'Lire un livre',
    spoonCost: 1,
    importance: 'LOW',
    category: 'loisirs',
    dueDate: '2026-04-15',
    notes: null,
    status: 'ACTIVE',
    completedAt: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query';

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

function setupDefaultMocks() {
  mockedUseQuery.mockReturnValue({
    data: MOCK_TASKS,
    isLoading: false,
  } as ReturnType<typeof useQuery>);
}

function renderScreen() {
  const TasksScreen = require('../../app/(tabs)/tasks').default;
  return render(<TasksScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TasksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // -------------------------------------------------------------------------
  // 1. All active tasks are displayed on load
  // -------------------------------------------------------------------------

  it('should_DisplayAllActiveTasks_When_ScreenLoads', async () => {
    // Arrange / Act
    renderScreen();

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText('Faire le ménage', { includeHiddenElements: true }),
      ).toBeTruthy();
      expect(
        screen.getByText('Rendez-vous médecin', { includeHiddenElements: true }),
      ).toBeTruthy();
      expect(
        screen.getByText('Lire un livre', { includeHiddenElements: true }),
      ).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Category filter hides tasks from other categories
  // -------------------------------------------------------------------------

  it('should_FilterByCategory_When_FilterSelected', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('filter-santé')).toBeTruthy();
    });

    // Act
    fireEvent.press(screen.getByTestId('filter-santé'));

    // Assert — only the "santé" task remains visible
    await waitFor(() => {
      expect(
        screen.getByText('Rendez-vous médecin', { includeHiddenElements: true }),
      ).toBeTruthy();
      expect(
        screen.queryByText('Faire le ménage', { includeHiddenElements: true }),
      ).toBeNull();
      expect(
        screen.queryByText('Lire un livre', { includeHiddenElements: true }),
      ).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Sort by due date orders tasks chronologically
  // -------------------------------------------------------------------------

  it('should_SortByDate_When_SortOptionSelected', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('sort-date')).toBeTruthy();
    });

    // Act
    fireEvent.press(screen.getByTestId('sort-date'));

    // Assert — task order: task-2 (04-08), task-1 (04-10), task-3 (04-15)
    await waitFor(() => {
      const taskItems = screen.getAllByTestId('task-item');
      expect(taskItems).toHaveLength(3);

      // Each task-item Pressable contains a child View with task-item-{id} testID.
      // Verify chronological order by checking which child testID each row contains.
      const getChildId = (item: any) => {
        const child = item.children?.[0];
        return child?.props?.testID;
      };

      expect(getChildId(taskItems[0])).toBe('task-item-task-2');
      expect(getChildId(taskItems[1])).toBe('task-item-task-1');
      expect(getChildId(taskItems[2])).toBe('task-item-task-3');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Tapping a task navigates to its detail screen
  // -------------------------------------------------------------------------

  it('should_NavigateToDetail_When_TaskTapped', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('task-item-task-1')).toBeTruthy();
    });

    // Act
    fireEvent.press(screen.getByTestId('task-item-task-1'));

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/task/task-1');
  });

  // -------------------------------------------------------------------------
  // 5. FAB navigates to the new task screen
  // -------------------------------------------------------------------------

  it('should_NavigateToChooseTemplate_When_FABPressed', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('fab-new-task')).toBeTruthy();
    });

    // Act
    fireEvent.press(screen.getByTestId('fab-new-task'));

    // Assert — FAB opens the "Choisir un modèle" entry screen
    expect(mockPush).toHaveBeenCalledWith('/task/choose');
  });
});
