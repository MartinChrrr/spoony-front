import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useQuery, useMutation } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ goBack: mockGoBack, push: mockPush, back: mockGoBack }),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock('@/data/repositories/baseTaskRepository', () => ({
  baseTaskRepository: { getAll: jest.fn() },
}));

jest.mock('@/data/repositories/taskRepository', () => ({
  taskRepository: { createFromCatalog: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Typed mock handles
// ---------------------------------------------------------------------------

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockedUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_BASE_TASKS = [
  {
    id: 'bt-1',
    key: 'base_tasks.hygiene.shower',
    spoonCost: 2,
    importance: 'HIGH',
    category: 'hygiene',
  },
  {
    id: 'bt-2',
    key: 'base_tasks.hygiene.teeth',
    spoonCost: 1,
    importance: 'HIGH',
    category: 'hygiene',
  },
  {
    id: 'bt-3',
    key: 'base_tasks.nutrition.breakfast',
    spoonCost: 1,
    importance: 'MEDIUM',
    category: 'nutrition',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockMutateAsync = jest.fn().mockResolvedValue([]);

function setupDefaultMocks() {
  mockedUseQuery.mockReturnValue({
    data: MOCK_BASE_TASKS,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useQuery>);

  mockedUseMutation.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as ReturnType<typeof useMutation>);
}

// Subject under test (imported after mocks)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TemplatesScreen = require('../../app/task/templates').default;

function renderScreen() {
  return render(<TemplatesScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TemplatesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Fetch base tasks by category when screen loads
  // -------------------------------------------------------------------------

  it('should_FetchBaseTasksByCategory_When_ScreenLoads', () => {
    // Arrange
    setupDefaultMocks();

    // Act
    renderScreen();

    // Assert — base tasks items are displayed
    expect(screen.getByTestId('templates-list')).toBeTruthy();
    expect(mockedUseQuery).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 2. Group tasks by category when displayed
  // -------------------------------------------------------------------------

  it('should_GroupByCategory_When_Displayed', () => {
    // Arrange
    setupDefaultMocks();

    // Act
    renderScreen();

    // Assert — category section headers exist
    expect(screen.getByTestId('category-section-hygiene')).toBeTruthy();
    expect(screen.getByTestId('category-section-nutrition')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 3. Create tasks from catalog when submit is pressed
  // -------------------------------------------------------------------------

  it('should_CreateTasksFromCatalog_When_SubmitPressed', async () => {
    // Arrange
    setupDefaultMocks();
    renderScreen();

    // Act — select a task then press submit
    const checkbox = screen.getByTestId('template-checkbox-bt-1');
    fireEvent.press(checkbox);

    const submitButton = screen.getByTestId('submit-selection-button');
    fireEvent.press(submitButton);

    // Assert
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({ baseTaskId: 'bt-1' }),
          ]),
        }),
      );
    });
  });
});
