import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { EnergyResponse } from '@/data/api/endpoints/energy';
import { TaskLogResponse } from '@/data/api/endpoints/taskLogs';
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
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
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

jest.mock('@/data/api/endpoints/taskLogs', () => ({
  taskLogEndpoints: { bulkPostpone: jest.fn() },
}));

jest.mock('@/data/api/endpoints/messages', () => ({
  messageEndpoints: { getRandom: jest.fn() },
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
    } as ReturnType<typeof useQuery>)
    // 4th+ useQuery calls (e.g. rest-system benevolent message)
    .mockReturnValue({
      data: null,
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
  // 0. C2 gate — redirects to check-in when energy is null (not declared yet)
  // -------------------------------------------------------------------------

  it('should_RedirectToCheckin_When_EnergyIsNull', async () => {
    // Arrange — first query (energy) returns null (not declared today)
    mockedUseQuery
      .mockReturnValueOnce({ data: null, isLoading: false, isError: false } as ReturnType<typeof useQuery>)
      .mockReturnValue({ data: undefined, isLoading: false, isError: false } as ReturnType<typeof useQuery>);
    mockedUseMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as ReturnType<typeof useMutation>);

    // Act
    renderScreen();

    // Assert
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/checkin/step1');
    });
  });

  it('should_NotRedirect_When_EnergyIsLoading', async () => {
    // Arrange — query still loading (energy is undefined, isLoading true)
    mockedUseQuery
      .mockReturnValueOnce({ data: undefined, isLoading: true, isError: false } as ReturnType<typeof useQuery>)
      .mockReturnValue({ data: undefined, isLoading: false, isError: false } as ReturnType<typeof useQuery>);
    mockedUseMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as ReturnType<typeof useMutation>);

    // Act
    renderScreen();

    // Assert — no redirect while loading
    await new Promise((r) => setTimeout(r, 0));
    expect(mockReplace).not.toHaveBeenCalledWith('/checkin/step1');
  });

  it('should_NotRedirect_When_EnergyQueryErrors', async () => {
    // Arrange — query errored (energy undefined, isLoading false, isError true)
    mockedUseQuery
      .mockReturnValueOnce({ data: undefined, isLoading: false, isError: true } as ReturnType<typeof useQuery>)
      .mockReturnValue({ data: undefined, isLoading: false, isError: false } as ReturnType<typeof useQuery>);
    mockedUseMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as ReturnType<typeof useMutation>);

    // Act
    renderScreen();

    // Assert — non-blocking: no redirect on error
    await new Promise((r) => setTimeout(r, 0));
    expect(mockReplace).not.toHaveBeenCalledWith('/checkin/step1');
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

  // -------------------------------------------------------------------------
  // 6. Reevaluate button navigates to check-in step 2
  // -------------------------------------------------------------------------

  it('should_NavigateToCheckinStep2_When_ReevaluatePressed', () => {
    // Arrange
    setupDefaultMocks();
    renderScreen();

    // Act
    fireEvent.press(screen.getByTestId('reevaluate-button'));

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/checkin/step2');
  });

  // -------------------------------------------------------------------------
  // 7. Rest system — Bravo card when every task is completed
  // -------------------------------------------------------------------------

  it('should_ShowBravo_When_AllTasksCompleted', () => {
    // Arrange — both logs completed
    const allDoneLogs = MOCK_TASK_LOGS.map((l) => ({ ...l, status: 'COMPLETED' as const }));
    mockedUseQuery
      .mockReturnValueOnce({ data: { ...MOCK_ENERGY, spoons: 8, spoonsUsed: 5 }, isLoading: false, isError: false } as ReturnType<typeof useQuery>)
      .mockReturnValueOnce({ data: allDoneLogs, isLoading: false, isError: false } as ReturnType<typeof useQuery>)
      .mockReturnValueOnce({ data: MOCK_TASKS, isLoading: false, isError: false } as ReturnType<typeof useQuery>)
      .mockReturnValue({ data: { id: 'm1', key: 'messages.completion.celebrate', context: 'COMPLETION' }, isLoading: false, isError: false } as ReturnType<typeof useQuery>);
    mockedUseMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as ReturnType<typeof useMutation>);

    // Act
    renderScreen();

    // Assert
    expect(screen.getByTestId('rest-bravo')).toBeTruthy();
    expect(screen.queryByTestId('rest-nudge')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 8. Rest system — Nudge when ≤1 spoon remains and tasks are pending
  // -------------------------------------------------------------------------

  it('should_ShowNudge_When_LowEnergyAndTasksRemain', () => {
    // Arrange — 1 spoon left (8 - 7), MOCK_TASK_LOGS has one PLANNED task
    mockedUseQuery
      .mockReturnValueOnce({ data: { ...MOCK_ENERGY, spoons: 8, spoonsUsed: 7 }, isLoading: false, isError: false } as ReturnType<typeof useQuery>)
      .mockReturnValueOnce({ data: MOCK_TASK_LOGS, isLoading: false, isError: false } as ReturnType<typeof useQuery>)
      .mockReturnValueOnce({ data: MOCK_TASKS, isLoading: false, isError: false } as ReturnType<typeof useQuery>)
      .mockReturnValue({ data: { id: 'm2', key: 'messages.low_energy.breathe', context: 'LOW_ENERGY' }, isLoading: false, isError: false } as ReturnType<typeof useQuery>);
    mockedUseMutation.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as ReturnType<typeof useMutation>);

    // Act
    renderScreen();

    // Assert
    expect(screen.getByTestId('rest-nudge')).toBeTruthy();
    expect(screen.getByTestId('postpone-remaining-button')).toBeTruthy();
  });
});
