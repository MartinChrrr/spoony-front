import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/data/repositories/taskLogRepository', () => ({
  taskLogRepository: { getAll: jest.fn(), getRange: jest.fn() },
}));

jest.mock('@/data/repositories/taskRepository', () => ({
  taskRepository: { getAll: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Typed mock handles
// ---------------------------------------------------------------------------

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_TASK_LOGS = [
  {
    id: 'log-1',
    userTaskId: 'task-1',
    date: '2026-04-10',
    status: 'COMPLETED',
    suggested: true,
    completedAt: '2026-04-10T10:00:00Z',
    createdAt: '2026-04-10T08:00:00Z',
    updatedAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 'log-2',
    userTaskId: 'task-2',
    date: '2026-04-10',
    status: 'PLANNED',
    suggested: true,
    completedAt: null,
    createdAt: '2026-04-10T08:00:00Z',
    updatedAt: '2026-04-10T08:00:00Z',
  },
  {
    id: 'log-3',
    userTaskId: 'task-3',
    date: '2026-04-05',
    status: 'COMPLETED',
    suggested: false,
    completedAt: '2026-04-05T15:00:00Z',
    createdAt: '2026-04-05T08:00:00Z',
    updatedAt: '2026-04-05T15:00:00Z',
  },
];

const MOCK_TASKS = [
  { id: 'task-1', name: 'Boire de l’eau', spoonCost: 2, category: 'HYGIENE' },
  { id: 'task-2', name: 'Ranger', spoonCost: 3, category: 'HOME' },
  { id: 'task-3', name: 'Marcher', spoonCost: 1, category: 'HEALTH' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupDefaultMocks() {
  // The component calls useQuery twice (task-logs range, tasks). Using mockImplementation
  // so re-renders after state changes keep returning data.
  let callIndex = 0;
  mockedUseQuery.mockImplementation(() => {
    const isTaskLogs = callIndex % 2 === 0;
    callIndex++;
    return {
      data: isTaskLogs ? MOCK_TASK_LOGS : MOCK_TASKS,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>;
  });
}

// Subject under test (imported after mocks)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CalendarScreen = require('../../app/(tabs)/calendar').default;

function renderScreen() {
  return render(<CalendarScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Fix date to April 2026 so calendar renders the month matching mock data
    jest.useFakeTimers({ now: new Date('2026-04-15T12:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // 1. Display current month when screen loads
  // -------------------------------------------------------------------------

  it('should_DisplayCurrentMonth_When_ScreenLoads', () => {
    // Arrange
    setupDefaultMocks();

    // Act
    renderScreen();

    // Assert — the calendar header with the current month is shown
    expect(screen.getByTestId('calendar-month-header')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 2. Show dots on days with task logs
  // -------------------------------------------------------------------------

  it('should_ShowDotsOnDaysWithTasks_When_TaskLogsExist', () => {
    // Arrange
    setupDefaultMocks();

    // Act
    renderScreen();

    // Assert — dots are rendered for days that have task logs
    // Dots are hidden from a11y tree, need includeHiddenElements
    const dots = screen.getAllByTestId('calendar-day-dot', { includeHiddenElements: true });
    expect(dots.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // 3. Show day summary when day is tapped
  // -------------------------------------------------------------------------

  it('should_ShowDaySummary_When_DayTapped', () => {
    // Arrange
    setupDefaultMocks();
    renderScreen();

    // Act — tap a day that has task logs (2026-04-10)
    const dayButton = screen.getByTestId('calendar-day-2026-04-10');
    fireEvent.press(dayButton);

    // Assert
    expect(screen.getByTestId('day-summary-card')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 4. Display spoon distribution when day is selected
  // -------------------------------------------------------------------------

  it('should_DisplaySpoonDistribution_When_DaySelected', () => {
    // Arrange
    setupDefaultMocks();
    renderScreen();

    // Act
    const dayButton = screen.getByTestId('calendar-day-2026-04-10');
    fireEvent.press(dayButton);

    // Assert — spoon distribution bar is visible
    expect(screen.getByTestId('spoon-distribution-bar')).toBeTruthy();
  });
});
