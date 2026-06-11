import React from 'react';
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskResponse } from '@/data/api/endpoints/tasks';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ replace: jest.fn() })),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/data/repositories/taskRepository', () => ({
  taskRepository: { getAll: jest.fn() },
}));

jest.mock('@/data/api/endpoints/taskLogs', () => ({
  taskLogEndpoints: { bulkPostpone: jest.fn() },
}));

jest.mock('@/features/checkin/hooks/useDeclareRest', () => ({
  useDeclareRest: jest.fn(() => ({
    declareRest: jest.fn().mockResolvedValue(undefined),
    declareEnergy: jest.fn(),
    isPending: false,
    hasEnergyToday: false,
  })),
}));

jest.mock('@/components/ui/BackButton', () => ({
  BackButton: () => null,
}));

// ---------------------------------------------------------------------------
// Imports (hoisted mocks are already registered above)
// ---------------------------------------------------------------------------

import CheckinStep1 from '../../app/checkin/step1';
import { useRouter } from 'expo-router';
import { taskRepository } from '@/data/repositories/taskRepository';
import { taskLogEndpoints } from '@/data/api/endpoints/taskLogs';
import { useDeclareRest } from '@/features/checkin/hooks/useDeclareRest';

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseRouter = useRouter as jest.MockedFunction<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseDeclareRest = useDeclareRest as jest.MockedFunction<any>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OVERDUE_TASK: TaskResponse = {
  id: 'task-1',
  name: 'Faire les courses',
  spoonCost: 3,
  importance: 'HIGH',
  category: 'quotidien',
  dueDate: '2020-01-01',
  notes: null,
  status: 'ACTIVE',
  completedAt: null,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

const OVERDUE_TASK_2: TaskResponse = {
  id: 'task-2',
  name: 'Appeler le médecin',
  spoonCost: 2,
  importance: 'MEDIUM',
  category: 'santé',
  dueDate: '2020-01-02',
  notes: null,
  status: 'ACTIVE',
  completedAt: null,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderStep1() {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <CheckinStep1 />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  mockUseRouter.mockReturnValue({ replace: jest.fn(), push: jest.fn() });
  mockUseDeclareRest.mockReturnValue({
    declareRest: jest.fn().mockResolvedValue(undefined),
    declareEnergy: jest.fn(),
    isPending: false,
    hasEnergyToday: false,
  });
});

describe('CheckinStep1', () => {
  // -------------------------------------------------------------------------
  // 1. Redirect when no overdue tasks
  // -------------------------------------------------------------------------

  describe('when there are no overdue tasks', () => {
    it('should_RedirectToStep2_When_NoOverdueTasks', async () => {
      // Arrange
      (taskRepository.getAll as jest.Mock).mockResolvedValue([]);
      const mockReplace = jest.fn();
      mockUseRouter.mockReturnValue({ replace: mockReplace });

      // Act
      renderStep1();

      // Assert
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/checkin/step2');
      });
    });
  });

  // -------------------------------------------------------------------------
  // 2. Display overdue tasks
  // -------------------------------------------------------------------------

  describe('when there are overdue tasks', () => {
    beforeEach(() => {
      (taskRepository.getAll as jest.Mock).mockResolvedValue([OVERDUE_TASK, OVERDUE_TASK_2]);
    });

    it('should_DisplayOverdueTasks_When_TasksExist', async () => {
      // Arrange / Act
      const { findByText } = renderStep1();

      // Assert
      expect(await findByText('Faire les courses')).toBeTruthy();
      expect(await findByText('Appeler le médecin')).toBeTruthy();
    });

    // -----------------------------------------------------------------------
    // 3. Bulk postpone
    // -----------------------------------------------------------------------

    it('should_CallBulkPostpone_And_NavigateToStep2_When_PostponeAllPressed', async () => {
      // Arrange
      const mockReplace = jest.fn();
      const mockPush = jest.fn();
      mockUseRouter.mockReturnValue({ replace: mockReplace, push: mockPush });
      (taskLogEndpoints.bulkPostpone as jest.Mock).mockResolvedValue({
        data: { data: { postponedCount: 2, newDate: '2026-06-07' } },
      });

      const { findByText } = renderStep1();

      // Act
      const postponeButton = await findByText('checkin.postponeAll');
      await act(async () => {
        fireEvent.press(postponeButton);
      });

      // Assert — N1: advance uses push so back can return here
      await waitFor(() => {
        expect(taskLogEndpoints.bulkPostpone).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith('/checkin/step2');
      });
    });

    // -----------------------------------------------------------------------
    // 4. Skip
    // -----------------------------------------------------------------------

    it('should_NavigateToStep2_When_SkipPressed', async () => {
      // Arrange
      const mockReplace = jest.fn();
      const mockPush = jest.fn();
      mockUseRouter.mockReturnValue({ replace: mockReplace, push: mockPush });

      const { findByText } = renderStep1();

      // Act
      const skipButton = await findByText('checkin.skip');
      await act(async () => {
        fireEvent.press(skipButton);
      });

      // Assert — N1: skip is an advance → push (back returns to step 1)
      expect(mockPush).toHaveBeenCalledWith('/checkin/step2');
    });

    // -----------------------------------------------------------------------
    // 5. Rest today — success path
    // -----------------------------------------------------------------------

    it('should_CallApiZeroSpoons_And_NavigateToZeroEnergy_When_RestTodayPressed', async () => {
      // Arrange
      const mockDeclareRest = jest.fn().mockResolvedValue(undefined);
      const mockReplace = jest.fn();
      mockUseRouter.mockReturnValue({ replace: mockReplace });
      mockUseDeclareRest.mockReturnValue({
        declareRest: mockDeclareRest,
        declareEnergy: jest.fn(),
        isPending: false,
        hasEnergyToday: false,
      });

      const { findByTestId } = renderStep1();

      // Act
      const restButton = await findByTestId('rest-today-button');
      await act(async () => {
        fireEvent.press(restButton);
      });

      // Assert — API called
      expect(mockDeclareRest).toHaveBeenCalledTimes(1);

      // Assert — navigation to zero-energy, NOT step2
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/checkin/zero-energy');
      });
      expect(mockReplace).not.toHaveBeenCalledWith('/checkin/step2');
    });

    // -----------------------------------------------------------------------
    // 6. Rest today — API failure
    // -----------------------------------------------------------------------

    it('should_NotNavigate_And_ShowError_When_RestTodayApiFails', async () => {
      // Arrange
      const mockDeclareRest = jest.fn().mockRejectedValue(new Error('Network error'));
      const mockReplace = jest.fn();
      mockUseRouter.mockReturnValue({ replace: mockReplace });
      mockUseDeclareRest.mockReturnValue({
        declareRest: mockDeclareRest,
        declareEnergy: jest.fn(),
        isPending: false,
        hasEnergyToday: false,
      });

      const { findByTestId, findByText } = renderStep1();

      // Act
      const restButton = await findByTestId('rest-today-button');
      await act(async () => {
        fireEvent.press(restButton);
      });

      // Assert — no navigation
      await waitFor(() => {
        expect(mockReplace).not.toHaveBeenCalled();
      });

      // Assert — error message displayed
      expect(await findByText('checkin.saveError')).toBeTruthy();
    });
  });
});
