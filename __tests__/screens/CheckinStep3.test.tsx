import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ spoons: '8' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params && key === 'checkin.spoonsUsed') {
        return `${params.used} / ${params.total} spoons used`;
      }
      if (params && key === 'checkin.spoonsUsedLabel') {
        return `${params.used} / ${params.total} spoons used`;
      }
      return key;
    },
  }),
}));

const mockMutateAsync = jest.fn().mockResolvedValue({});

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock('@/data/api/endpoints/suggestions', () => ({
  suggestionEndpoints: {
    getAll: jest.fn(),
  },
}));

jest.mock('@/data/api/endpoints/taskLogs', () => ({
  taskLogEndpoints: {
    create: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface SuggestionResponse {
  userTaskId: string;
  name: string;
  spoonCost: number;
  category: string | null;
  exceedsBudget: boolean;
}

const MOCK_SUGGESTIONS: SuggestionResponse[] = [
  {
    userTaskId: 'task-1',
    name: 'Faire le ménage',
    spoonCost: 2,
    category: 'quotidien',
    exceedsBudget: false,
  },
  {
    userTaskId: 'task-2',
    name: 'Courses alimentaires',
    spoonCost: 3,
    category: 'quotidien',
    exceedsBudget: false,
  },
  {
    userTaskId: 'task-3',
    name: 'Rendez-vous dentiste',
    spoonCost: 5,
    category: 'santé',
    exceedsBudget: true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { useQuery, useMutation } from '@tanstack/react-query';

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockedUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

function setupDefaultMocks() {
  mockedUseQuery.mockReturnValue({
    data: MOCK_SUGGESTIONS,
    isLoading: false,
  } as ReturnType<typeof useQuery>);

  mockedUseMutation.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useMutation>);
}

// Lazy import so mocks are set up before the module loads
function renderScreen() {
  const CheckinStep3 = require('../../app/checkin/step3').default;
  return render(<CheckinStep3 />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CheckinStep3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Suggestions are fetched and displayed
  // -------------------------------------------------------------------------

  it('should_FetchSuggestions_When_ScreenLoads', async () => {
    // Arrange / Act
    renderScreen();

    // Assert — all task names should be visible (inside accessibility-hidden
    // decorative wrappers, so we use includeHiddenElements)
    await waitFor(() => {
      expect(screen.getByText('Faire le ménage', { includeHiddenElements: true })).toBeTruthy();
      expect(screen.getByText('Courses alimentaires', { includeHiddenElements: true })).toBeTruthy();
      expect(screen.getByText('Rendez-vous dentiste', { includeHiddenElements: true })).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Tasks within budget are pre-checked
  // -------------------------------------------------------------------------

  it('should_PrecheckTasksWithinBudget_When_Rendered', async () => {
    // Arrange / Act
    renderScreen();

    // Assert — task-1 and task-2 (exceedsBudget=false) are checked by default
    await waitFor(() => {
      const checkbox1 = screen.getByTestId('task-checkbox-task-1');
      const checkbox2 = screen.getByTestId('task-checkbox-task-2');

      expect(
        checkbox1.props.accessibilityState?.checked ??
          checkbox1.props.checked ??
          checkbox1.props.value,
      ).toBe(true);

      expect(
        checkbox2.props.accessibilityState?.checked ??
          checkbox2.props.checked ??
          checkbox2.props.value,
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Tasks exceeding budget are grayed out and unchecked
  // -------------------------------------------------------------------------

  it('should_GrayOutTasksExceedingBudget_When_Displayed', async () => {
    // Arrange / Act
    renderScreen();

    // Assert — task-3 (exceedsBudget=true) shows the exceeds-budget indicator
    // and its checkbox is unchecked by default.
    // The badge is inside an accessibilityElementsHidden wrapper (decorative),
    // so we use includeHiddenElements to find it.
    await waitFor(() => {
      const taskItem = screen.getByTestId('task-item-task-3');
      expect(taskItem).toBeTruthy();

      const exceedsBadge = screen.getByTestId('exceeds-budget-task-3', { includeHiddenElements: true });
      expect(exceedsBadge).toBeTruthy();

      const checkbox3 = screen.getByTestId('task-checkbox-task-3');
      const isChecked =
        checkbox3.props.accessibilityState?.checked ??
        checkbox3.props.checked ??
        checkbox3.props.value;
      expect(isChecked).toBeFalsy();
    });
  });

  // -------------------------------------------------------------------------
  // 4. User can check a grayed (exceeds-budget) task
  // -------------------------------------------------------------------------

  it('should_AllowCheckingGrayedTasks_When_UserWants', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('task-checkbox-task-3')).toBeTruthy();
    });

    // Act — press the checkbox of the exceeds-budget task
    const checkbox3 = screen.getByTestId('task-checkbox-task-3');
    fireEvent.press(checkbox3);

    // Assert — task-3 is now checked
    await waitFor(() => {
      const updated = screen.getByTestId('task-checkbox-task-3');
      const isChecked =
        updated.props.accessibilityState?.checked ??
        updated.props.checked ??
        updated.props.value;
      expect(isChecked).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Total updates when a task is unchecked
  // -------------------------------------------------------------------------

  it('should_UpdateTotal_When_TaskChecked', async () => {
    // Arrange — initial total with task-1 (2) + task-2 (3) = 5 spoons
    renderScreen();

    await waitFor(() => {
      // "5 / 8 spoons used" is rendered thanks to our t() mock
      expect(screen.getByText('5 / 8 spoons used')).toBeTruthy();
    });

    // Act — uncheck task-1 (cost 2), new total = 3
    const checkbox1 = screen.getByTestId('task-checkbox-task-1');
    fireEvent.press(checkbox1);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('3 / 8 spoons used')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 6. Mutation called with correct userTaskIds when "C'est parti !" pressed
  // -------------------------------------------------------------------------

  it('should_CreateTaskLogs_When_CestPartiPressed', async () => {
    // Arrange — default state: task-1 and task-2 are checked, task-3 is not
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('lets-go-button')).toBeTruthy();
    });

    // Act
    fireEvent.press(screen.getByTestId('lets-go-button'));

    // Assert — mutation called with the two within-budget task ids
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(mockMutateAsync).toHaveBeenCalledWith({
        userTaskIds: ['task-1', 'task-2'],
      });
    });
  });
});
