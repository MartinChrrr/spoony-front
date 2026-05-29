import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/data/repositories/baseTaskRepository', () => ({
  baseTaskRepository: { getAll: jest.fn() },
}));

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

const MOCK_BASE_TASKS = [
  { id: 'a1', key: 'tasks.hygiene.shower', spoonCost: 2, importance: 'MEDIUM', category: 'HYGIENE' },
  { id: 'b1', key: 'tasks.household.groceries', spoonCost: 3, importance: 'MEDIUM', category: 'MENAGE' },
];

function setupQuery(data = MOCK_BASE_TASKS) {
  mockedUseQuery.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useQuery>);
}

// Subject under test (imported after mocks)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChooseTemplateScreen = require('../../app/task/choose').default;

function renderScreen() {
  return render(<ChooseTemplateScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChooseTemplateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should_RenderTemplateCards_When_BaseTasksLoaded', () => {
    setupQuery();
    renderScreen();

    expect(screen.getByTestId('template-card-a1')).toBeTruthy();
    expect(screen.getByTestId('template-card-b1')).toBeTruthy();
  });

  it('should_NavigateToPrefilledForm_When_TemplateTapped', () => {
    setupQuery();
    renderScreen();

    fireEvent.press(screen.getByTestId('template-card-a1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/task/new',
      params: {
        baseTaskId: 'a1',
        templateKey: 'tasks.hygiene.shower',
        spoonCost: '2',
        importance: 'MEDIUM',
        category: 'HYGIENE',
      },
    });
  });

  it('should_NavigateToBlankForm_When_CreateManuallyPressed', () => {
    setupQuery();
    renderScreen();

    fireEvent.press(screen.getByTestId('create-manually-button'));

    expect(mockPush).toHaveBeenCalledWith('/task/new');
  });
});
