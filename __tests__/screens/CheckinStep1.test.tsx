import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { TaskResponse } from '@/data/api/endpoints/tasks';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockBulkPostponeMutate = jest.fn();
let mockOverdueTasks: TaskResponse[] = [];
let mockBulkPostponeIsPending = false;

const mockInvalidateQueries = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: mockOverdueTasks,
    isLoading: false,
  })),
  useMutation: jest.fn(() => ({
    mutate: mockBulkPostponeMutate,
    isPending: mockBulkPostponeIsPending,
  })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
}));

jest.mock('@/data/repositories/taskRepository', () => ({
  taskRepository: {
    getAll: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/data/api/endpoints/taskLogs', () => ({
  taskLogEndpoints: {
    bulkPostpone: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_OVERDUE_TASKS: TaskResponse[] = [
  {
    id: 'task-1',
    name: 'Faire les courses',
    spoonCost: 3,
    importance: 'HIGH',
    category: 'quotidien',
    dueDate: '2026-04-04',
    notes: null,
    status: 'ACTIVE',
    completedAt: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  },
  {
    id: 'task-2',
    name: 'Appeler le médecin',
    spoonCost: 2,
    importance: 'MEDIUM',
    category: 'santé',
    dueDate: '2026-04-05',
    notes: null,
    status: 'ACTIVE',
    completedAt: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Subject under test (imported after mocks are in place)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CheckinStep1 = require('../../app/checkin/step1').default;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CheckinStep1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOverdueTasks = MOCK_OVERDUE_TASKS;
    mockBulkPostponeIsPending = false;
  });

  // -------------------------------------------------------------------------
  // 1. Display overdue tasks
  // -------------------------------------------------------------------------

  it('should_DisplayOverdueTasks_When_TasksFromYesterday', () => {
    // Arrange
    mockOverdueTasks = MOCK_OVERDUE_TASKS;

    // Act
    render(<CheckinStep1 />);

    // Assert
    expect(screen.getByText('Faire les courses')).toBeTruthy();
    expect(screen.getByText('Appeler le médecin')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 2. Bulk postpone on "Tout reporter"
  // -------------------------------------------------------------------------

  it('should_CallBulkPostpone_When_ToutReporterPressed', () => {
    // Arrange
    mockOverdueTasks = MOCK_OVERDUE_TASKS;
    render(<CheckinStep1 />);

    // Act
    fireEvent.press(screen.getByText('checkin.postponeAll'));

    // Assert
    expect(mockBulkPostponeMutate).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 3. Skip to step 2 when no overdue tasks
  // -------------------------------------------------------------------------

  it('should_SkipToStep2_When_NoOverdueTasks', async () => {
    // Arrange
    mockOverdueTasks = [];

    // Act
    render(<CheckinStep1 />);

    // Assert
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/checkin/step2');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Navigate to step 2 on "Passer"
  // -------------------------------------------------------------------------

  it('should_NavigateToStep2_When_PasserPressed', () => {
    // Arrange
    mockOverdueTasks = MOCK_OVERDUE_TASKS;
    render(<CheckinStep1 />);

    // Act
    fireEvent.press(screen.getByText('checkin.skip'));

    // Assert
    expect(mockReplace).toHaveBeenCalledWith('/checkin/step2');
  });

  // -------------------------------------------------------------------------
  // 5. "Pas aujourd'hui" button navigates to step2 (which will call API at 0)
  // -------------------------------------------------------------------------

  it('should_NavigateToStep2_When_RestTodayPressed', () => {
    // Arrange
    mockOverdueTasks = MOCK_OVERDUE_TASKS;
    render(<CheckinStep1 />);

    // Act
    fireEvent.press(screen.getByText('checkin.restToday'));

    // Assert
    expect(mockReplace).toHaveBeenCalledWith('/checkin/step2');
  });
});
