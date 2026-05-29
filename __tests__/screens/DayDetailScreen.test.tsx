import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ date: '2026-04-10' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/data/repositories/taskLogRepository', () => ({
  taskLogRepository: { getAll: jest.fn() },
}));

jest.mock('@/data/repositories/taskRepository', () => ({
  taskRepository: { getAll: jest.fn() },
}));

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

const MOCK_LOGS = [
  { id: 'log-1', userTaskId: 'task-1', date: '2026-04-10', status: 'COMPLETED', suggested: true, completedAt: null, createdAt: '', updatedAt: '' },
  { id: 'log-2', userTaskId: 'task-2', date: '2026-04-10', status: 'PLANNED', suggested: true, completedAt: null, createdAt: '', updatedAt: '' },
  { id: 'log-3', userTaskId: 'task-3', date: '2026-04-09', status: 'COMPLETED', suggested: false, completedAt: null, createdAt: '', updatedAt: '' },
];

const MOCK_TASKS = [
  { id: 'task-1', name: 'Se doucher', spoonCost: 2, importance: 'MEDIUM', category: 'HYGIENE', dueDate: '', notes: null, status: 'ACTIVE', completedAt: null, createdAt: '', updatedAt: '' },
  { id: 'task-2', name: 'Faire les courses', spoonCost: 3, importance: 'MEDIUM', category: 'MENAGE', dueDate: '', notes: null, status: 'ACTIVE', completedAt: null, createdAt: '', updatedAt: '' },
];

function setupQueries() {
  // The screen calls useQuery twice: ['task-logs'] then ['tasks'].
  mockedUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0];
    const data = key === 'task-logs' ? MOCK_LOGS : MOCK_TASKS;
    return { data, isLoading: false, isError: false } as ReturnType<typeof useQuery>;
  });
}

// Subject under test (imported after mocks)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DayDetailScreen = require('../../app/calendar/[date]').default;

describe('DayDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupQueries();
  });

  it('should_ListTasksForSelectedDate_When_Rendered', () => {
    render(<DayDetailScreen />);

    // The two logs for 2026-04-10 are shown, joined with their task names
    expect(screen.getByTestId('day-task-log-1')).toBeTruthy();
    expect(screen.getByTestId('day-task-log-2')).toBeTruthy();
    expect(screen.getByText('Se doucher')).toBeTruthy();
    expect(screen.getByText('Faire les courses')).toBeTruthy();
  });

  it('should_ExcludeTasksFromOtherDates_When_Rendered', () => {
    render(<DayDetailScreen />);

    // log-3 belongs to 2026-04-09 and must not appear
    expect(screen.queryByTestId('day-task-log-3')).toBeNull();
  });

  it('should_RenderDistributionBar_When_Rendered', () => {
    render(<DayDetailScreen />);

    expect(screen.getByTestId('day-distribution-bar')).toBeTruthy();
  });
});
