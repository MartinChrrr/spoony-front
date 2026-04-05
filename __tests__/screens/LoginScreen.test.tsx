import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import axios, { AxiosError } from 'axios';

import LoginScreen from '../../app/(auth)/login';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogin = jest.fn();

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr' },
  }),
}));

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ replace: jest.fn() }),
  useSegments: () => [],
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAxiosError(status?: number): AxiosError {
  if (status === undefined) {
    // No response — network error
    return new AxiosError('Network Error', 'ERR_NETWORK');
  }

  return new AxiosError(
    'Request failed',
    String(status),
    undefined,
    undefined,
    {
      status,
      data: {},
      headers: {},
      statusText: String(status),
      config: {} as never,
    } as never,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Inputs are rendered on load
  it('should_RenderEmailAndPasswordInputs_When_ScreenLoads', () => {
    // Arrange / Act
    const { getByLabelText } = render(<LoginScreen />);

    // Assert
    expect(getByLabelText('auth.emailLabel')).toBeTruthy();
    expect(getByLabelText('auth.passwordLabel')).toBeTruthy();
  });

  // 2. Pressing submit with valid fields calls login
  it('should_CallLogin_When_SubmitPressed', async () => {
    // Arrange
    mockLogin.mockResolvedValueOnce(undefined);
    const { getByLabelText } = render(<LoginScreen />);

    const emailInput = getByLabelText('auth.emailLabel');
    const passwordInput = getByLabelText('auth.passwordLabel');
    const submitButton = getByLabelText('auth.loginButton');

    // Act
    fireEvent.changeText(emailInput, 'user@example.com');
    fireEvent.changeText(passwordInput, 'secret123');
    fireEvent.press(submitButton);

    // Assert
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret123');
    });
  });

  // 3. 401 error shows wrong-credentials message
  it('should_ShowError_When_LoginFails', async () => {
    // Arrange
    mockLogin.mockRejectedValueOnce(buildAxiosError(401));
    const { getByLabelText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('auth.emailLabel'), 'user@example.com');
    fireEvent.changeText(getByLabelText('auth.passwordLabel'), 'wrongpass');

    // Act
    fireEvent.press(getByLabelText('auth.loginButton'));

    // Assert
    await waitFor(() => {
      expect(getByText('auth.wrongCredentials')).toBeTruthy();
    });
  });

  // 4. Network error (no response) shows network message
  it('should_ShowNetworkError_When_NoConnection', async () => {
    // Arrange
    mockLogin.mockRejectedValueOnce(buildAxiosError());
    const { getByLabelText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('auth.emailLabel'), 'user@example.com');
    fireEvent.changeText(getByLabelText('auth.passwordLabel'), 'secret123');

    // Act
    fireEvent.press(getByLabelText('auth.loginButton'));

    // Assert
    await waitFor(() => {
      expect(getByText('errors.network')).toBeTruthy();
    });
  });

  // 5. Button is disabled when both fields are empty
  it('should_DisableSubmit_When_FieldsEmpty', () => {
    // Arrange / Act
    const { getByLabelText } = render(<LoginScreen />);

    const submitButton = getByLabelText('auth.loginButton');

    // Assert
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  // 6. Button is disabled when only email is filled
  it('should_DisableSubmit_When_OnlyEmailFilled', () => {
    // Arrange
    const { getByLabelText } = render(<LoginScreen />);

    // Act
    fireEvent.changeText(getByLabelText('auth.emailLabel'), 'user@example.com');

    // Assert
    const submitButton = getByLabelText('auth.loginButton');
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });

  // 7. ActivityIndicator is shown while login call is in progress
  it('should_ShowLoadingIndicator_When_Submitting', async () => {
    // Arrange — never-resolving promise keeps isSubmitting=true
    mockLogin.mockImplementationOnce(
      () => new Promise<void>(() => undefined),
    );

    const { getByLabelText, getByTestId, UNSAFE_getByType } = render(<LoginScreen />);

    fireEvent.changeText(getByLabelText('auth.emailLabel'), 'user@example.com');
    fireEvent.changeText(getByLabelText('auth.passwordLabel'), 'secret123');

    // Act
    fireEvent.press(getByLabelText('auth.loginButton'));

    // Assert — ActivityIndicator mounts while the promise is pending
    await waitFor(() => {
      const { ActivityIndicator } = require('react-native');
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });
});
