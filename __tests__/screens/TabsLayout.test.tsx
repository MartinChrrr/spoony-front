import React from 'react';
import { render, screen } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseNetworkStatus = jest.fn();
jest.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Tabs = ({ children }: { children: React.ReactNode }) => (
    <View testID="tabs-navigator">{children}</View>
  );

  Tabs.Screen = ({ name }: { name: string }) => (
    <View testID={`tab-screen-${name}`} />
  );

  return {
    Tabs,
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  };
});

jest.mock('lucide-react-native', () => ({
  Home: () => null,
  ListTodo: () => null,
  Calendar: () => null,
  User: () => null,
}));

// Subject under test (imported after mocks)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TabsLayout = require('../../app/(tabs)/_layout').default;

function renderLayout() {
  return render(<TabsLayout />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TabsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Show offline badge when offline
  // -------------------------------------------------------------------------

  it('should_ShowOfflineBadge_When_Offline', () => {
    // Arrange
    mockUseNetworkStatus.mockReturnValue({ isOnline: false, isConnected: false });

    // Act
    renderLayout();

    // Assert
    expect(screen.getByTestId('offline-banner')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 2. Hide offline badge when online
  // -------------------------------------------------------------------------

  it('should_HideOfflineBadge_When_Online', () => {
    // Arrange
    mockUseNetworkStatus.mockReturnValue({ isOnline: true, isConnected: true });

    // Act
    renderLayout();

    // Assert
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });
});
