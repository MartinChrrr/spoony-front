import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/data/api/endpoints/messages', () => ({
  messageEndpoints: {
    getRandom: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_MESSAGE = {
  id: 'msg-1',
  key: 'messages.zeroEnergy.rest',
  context: 'ZERO_ENERGY',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query';

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

function setupDefaultMocks() {
  mockedUseQuery.mockReturnValue({
    data: MOCK_MESSAGE,
    isLoading: false,
  } as ReturnType<typeof useQuery>);
}

function renderScreen() {
  const ZeroEnergyScreen = require('../../app/checkin/zero-energy').default;
  return render(<ZeroEnergyScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ZeroEnergyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Compassionate message is displayed
  // -------------------------------------------------------------------------

  it('should_DisplayCompassionateMessage_When_ScreenLoads', async () => {
    // Arrange / Act
    renderScreen();

    // Assert — the message key is displayed via t()
    await waitFor(() => {
      expect(screen.getByText(MOCK_MESSAGE.key)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Auto-postpone information text is displayed
  // -------------------------------------------------------------------------

  it('should_DisplayAutoPostponeInfo_When_Rendered', async () => {
    // Arrange / Act
    renderScreen();

    // Assert — the i18n key for the auto-postpone info is rendered
    await waitFor(() => {
      expect(screen.getByText('checkin.zeroEnergyInfo')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Back button navigates to home
  // -------------------------------------------------------------------------

  it('should_NavigateToHome_When_BackButtonPressed', async () => {
    // Arrange
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('back-to-home-button')).toBeTruthy();
    });

    // Act
    fireEvent.press(screen.getByTestId('back-to-home-button'));

    // Assert
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
