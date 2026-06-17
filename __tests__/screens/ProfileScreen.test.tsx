import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
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

const mockLogout = jest.fn().mockResolvedValue(undefined);
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

  // -------------------------------------------------------------------------
  // 5. Logout button is rendered and accessible
  // -------------------------------------------------------------------------

  it('should_RenderLogoutButton_When_ScreenLoads', () => {
    // Arrange
    setupDefaultMocks();
    renderScreen();

    // Assert
    expect(screen.getByTestId('logout-button')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 6. Logout + navigate to auth stack once confirmation is accepted
  // -------------------------------------------------------------------------

  it('should_LogoutAndNavigate_When_LogoutConfirmed', async () => {
    // Arrange — auto-confirm the Alert by invoking its confirm button
    setupDefaultMocks();
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        // buttons[0] = cancel, buttons[1] = confirm
        buttons?.[1]?.onPress?.();
      });
    renderScreen();

    // Act
    fireEvent.press(screen.getByTestId('logout-button'));

    // Assert — endpoint+purge handled by AuthContext.logout, then we navigate
    expect(alertSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).toHaveBeenCalledWith('/(auth)');

    alertSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // 7. Logout does NOT fire when the confirmation is cancelled
  // -------------------------------------------------------------------------

  it('should_NotLogout_When_ConfirmationCancelled', () => {
    // Arrange — simulate the user tapping cancel (no onPress invoked)
    setupDefaultMocks();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderScreen();

    // Act
    fireEvent.press(screen.getByTestId('logout-button'));

    // Assert
    expect(alertSpy).toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
