import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { EnergyResponse } from '@/data/api/endpoints/energy';
import { TaskLogResponse } from '@/data/api/endpoints/taskLogs';
import { TaskResponse } from '@/data/api/endpoints/tasks';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.name) return `Bonjour ${params.name}`;
      return key;
    },
  }),
}));

const mockUser = { id: 'user-1', email: 'test@test.com', firstName: 'Marie' };

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock('@/data/repositories/energyRepository', () => ({
  energyRepository: { getToday: jest.fn() },
}));

jest.mock('@/data/repositories/taskLogRepository', () => ({
  taskLogRepository: { getAll: jest.fn(), updateStatus: jest.fn() },
}));

jest.mock('@/data/repositories/taskRepository', () => ({
  taskRepository: { getAll: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Typed mock handles
// ---------------------------------------------------------------------------

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockedUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_ENERGY: EnergyResponse = {
  id: 'energy-1',
  date: '2026-04-06',
  spoons: 8,
  spoonsUsed: 3,
  moodEnd: null,
  createdAt: '2026-04-06T08:00:00Z',
  updatedAt: '2026-04-06T08:00:00Z',
};

const MOCK_TASK_LOGS: TaskLogResponse[] = [
  {
    id: 'log-1',
    userTaskId: 'task-1',
    date: '2026-04-06',
    status: 'PLANNED',
    suggested: true,
    completedAt: null,
    createdAt: '2026-04-06T08:00:00Z',
    updatedAt: '2026-04-06T08:00:00Z',
  },
  {
    id: 'log-2',
    userTaskId: 'task-2',
    date: '2026-04-06',
    status: 'COMPLETED',
    suggested: true,
    completedAt: '2026-04-06T10:00:00Z',
    createdAt: '2026-04-06T08:00:00Z',
    updatedAt: '2026-04-06T08:00:00Z',
  },
];

const MOCK_TASKS: TaskResponse[] = [
  {
    id: 'task-1',
    name: 'Faire le ménage',
    spoonCost: 2,
    importance: 'HIGH',
    category: 'quotidien',
    dueDate: '2026-04-06',
    notes: null,
    status: 'ACTIVE',
    completedAt: null,
    createdAt: '2026-04-06T08:00:00Z',
    updatedAt: '2026-04-06T08:00:00Z',
  },
  {
    id: 'task-2',
    name: 'Courses',
    spoonCost: 3,
    importance: 'MEDIUM',
    category: 'quotidien',
    dueDate: '2026-04-06',
    notes: null,
    status: 'ACTIVE',
    completedAt: null,
    createdAt: '2026-04-06T08:00:00Z',
    updatedAt: '2026-04-06T08:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Subject under test (imported after mocks are in place)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HomeScreen = require('../../app/(tabs)/index').default;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUpdateStatusMutateAsync = jest.fn();

function setupDefaultMocks() {
  mockedUseQuery
    .mockReturnValueOnce({
      data: MOCK_ENERGY,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>)
    .mockReturnValueOnce({
      data: MOCK_TASK_LOGS,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>)
    .mockReturnValueOnce({
      data: MOCK_TASKS,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>);

  mockedUseMutation.mockReturnValue({
    mutateAsync: mockUpdateStatusMutateAsync,
    isPending: false,
  } as ReturnType<typeof useMutation>);
}

function renderScreen() {
  return render(<HomeScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Display user name
  // -------------------------------------------------------------------------

  it('should_DisplayUserName_When_ScreenLoads', () => {
    // Arrange
    setupDefaultMocks();

    // Act
    renderScreen();

    // Assert
    expect(screen.getByText('Bonjour Marie')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 2. Display SpoonGauge when energy exists
  // -------------------------------------------------------------------------

  it('should_DisplaySpoonGauge_When_EnergyExists', () => {
    // Arrange
    setupDefaultMocks();

    // Act
    renderScreen();

    // Assert
    expect(screen.getByTestId('spoon-gauge')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 3. Display today tasks when task logs exist
  // -------------------------------------------------------------------------

  it('should_DisplayTodayTasks_When_TaskLogsExist', () => {
    // Arrange
    setupDefaultMocks();

    // Act
    renderScreen();

    // Assert
    expect(screen.getByText('Faire le ménage')).toBeTruthy();
    expect(screen.getByText('Courses')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 4. Allow task completion when checkbox tapped
  // -------------------------------------------------------------------------

  it('should_AllowTaskCompletion_When_CheckboxTapped', () => {
    // Arrange
    setupDefaultMocks();
    renderScreen();

    // Act
    fireEvent.press(screen.getByTestId('task-log-checkbox-log-1'));

    // Assert
    expect(mockUpdateStatusMutateAsync).toHaveBeenCalledWith({
      id: 'log-1',
      status: 'COMPLETED',
    });
  });

  // -------------------------------------------------------------------------
  // 5. Mutation called when task is marked completed
  // -------------------------------------------------------------------------

  it('should_CallUpdateMutation_When_TaskCompleted', () => {
    // Arrange
    setupDefaultMocks();
    renderScreen();

    // Act
    fireEvent.press(screen.getByTestId('task-log-checkbox-log-1'));

    // Assert
    expect(mockUpdateStatusMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockUpdateStatusMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'COMPLETED' }),
    );
  });
});
