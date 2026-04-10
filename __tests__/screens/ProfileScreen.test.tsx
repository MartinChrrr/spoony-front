import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { useMutation } from '@tanstack/react-query';

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
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockLogout = jest.fn();
const mockUser = {
  id: 'user-1',
  email: 'marie@example.com',
  firstName: 'Marie',
};

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
}));

jest.mock('@/data/repositories/userRepository', () => ({
  userRepository: { deleteAccount: jest.fn() },
}));

const mockLinkingOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);

// ---------------------------------------------------------------------------
// Typed mock handles
// ---------------------------------------------------------------------------

const mockedUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockDeleteMutateAsync = jest.fn().mockResolvedValue(undefined);

function setupDefaultMocks() {
  mockedUseMutation.mockReturnValue({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  } as ReturnType<typeof useMutation>);
}

// Subject under test (imported after mocks)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProfileScreen = require('../../app/(tabs)/profile').default;

function renderScreen() {
  return render(<ProfileScreen />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLinkingOpenURL.mockResolvedValue(undefined as never);
  });

  // -------------------------------------------------------------------------
  // 1. Display user info when screen loads
  // -------------------------------------------------------------------------

  it('should_DisplayUserInfo_When_ScreenLoads', () => {
    // Arrange
    setupDefaultMocks();

    // Act
    renderScreen();

    // Assert
    expect(screen.getByTestId('profile-first-name')).toBeTruthy();
    expect(screen.getByTestId('profile-email')).toBeTruthy();
    expect(screen.getByText('Marie')).toBeTruthy();
    expect(screen.getByText('marie@example.com')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 2. Navigate to privacy policy when link tapped
  // -------------------------------------------------------------------------

  it('should_NavigateToPrivacyPolicy_When_LinkTapped', () => {
    // Arrange
    setupDefaultMocks();
    renderScreen();

    // Act
    const privacyLink = screen.getByTestId('privacy-policy-link');
    fireEvent.press(privacyLink);

    // Assert
    expect(mockLinkingOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('http'),
    );
  });

  // -------------------------------------------------------------------------
  // 3. Show delete confirmation when delete account pressed
  // -------------------------------------------------------------------------

  it('should_ShowDeleteConfirmation_When_DeleteAccountPressed', () => {
    // Arrange
    setupDefaultMocks();
    renderScreen();

    // Act
    const deleteButton = screen.getByTestId('delete-account-button');
    fireEvent.press(deleteButton);

    // Assert — confirmation modal appears
    expect(screen.getByTestId('delete-confirmation-modal')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 4. Call delete API when confirmation validated
  // -------------------------------------------------------------------------

  it('should_CallDeleteAPI_When_ConfirmationValidated', async () => {
    // Arrange
    setupDefaultMocks();
    renderScreen();

    // Open the modal
    fireEvent.press(screen.getByTestId('delete-account-button'));

    // Type the confirmation word (matches t('profile.deleteConfirmPlaceholder'))
    const input = screen.getByTestId('delete-confirmation-input');
    fireEvent.changeText(input, 'profile.deleteConfirmPlaceholder');

    // Act — press the confirm button
    const confirmButton = screen.getByTestId('delete-confirmation-confirm');
    fireEvent.press(confirmButton);

    // Assert
    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalled();
    });
  });
});
