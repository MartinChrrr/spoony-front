import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';

import RegisterScreen from '../../app/(auth)/register';

// --- Mocks ---

const mockRegister = jest.fn();

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    register: mockRegister,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr' },
  }),
}));

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({ replace: jest.fn() }),
  useSegments: () => [],
}));

// --- Helpers ---

function buildAxiosError(status: number): AxiosError {
  return new AxiosError('Error', String(status), undefined, undefined, {
    status,
    data: {},
    headers: {},
    statusText: 'Error',
    config: {} as any,
  } as any);
}

function buildAxiosErrorNoResponse(): AxiosError {
  return new AxiosError('Network Error', 'ERR_NETWORK', undefined, undefined, undefined);
}

function fillValidForm(
  getByLabelText: ReturnType<typeof render>['getByLabelText'],
): void {
  fireEvent.changeText(getByLabelText('auth.firstNameLabel'), 'Alice');
  fireEvent.changeText(getByLabelText('auth.emailLabel'), 'alice@example.com');
  fireEvent.changeText(getByLabelText('auth.passwordLabel'), 'password123');
}

// --- Tests ---

describe('RegisterScreen', () => {
  beforeEach(() => {
    mockRegister.mockReset();
  });

  it('should_RenderAllInputs_When_ScreenLoads', () => {
    // Arrange
    const { getByLabelText, getByText } = render(<RegisterScreen />);

    // Act — nothing, just render

    // Assert
    expect(getByLabelText('auth.firstNameLabel')).toBeTruthy();
    expect(getByLabelText('auth.emailLabel')).toBeTruthy();
    expect(getByLabelText('auth.passwordLabel')).toBeTruthy();
    expect(getByText('common.appName')).toBeTruthy();
    expect(getByText('auth.registerSubtitle')).toBeTruthy();
  });

  it('should_CallRegister_When_SubmitPressed', async () => {
    // Arrange
    mockRegister.mockResolvedValueOnce(undefined);
    const { getByLabelText } = render(<RegisterScreen />);

    // Act
    fillValidForm(getByLabelText);
    fireEvent.press(getByLabelText('auth.registerButton'));

    // Assert
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(mockRegister).toHaveBeenCalledWith('alice@example.com', 'password123', 'Alice');
    });
  });

  it('should_ShowError_When_EmailAlreadyExists', async () => {
    // Arrange
    mockRegister.mockRejectedValueOnce(buildAxiosError(409));
    const { getByLabelText, getByText } = render(<RegisterScreen />);

    // Act
    fillValidForm(getByLabelText);
    fireEvent.press(getByLabelText('auth.registerButton'));

    // Assert
    await waitFor(() => {
      expect(getByText('auth.emailAlreadyExists')).toBeTruthy();
    });
  });

  it('should_ShowNetworkError_When_NoConnection', async () => {
    // Arrange
    mockRegister.mockRejectedValueOnce(buildAxiosErrorNoResponse());
    const { getByLabelText, getByText } = render(<RegisterScreen />);

    // Act
    fillValidForm(getByLabelText);
    fireEvent.press(getByLabelText('auth.registerButton'));

    // Assert
    await waitFor(() => {
      expect(getByText('errors.network')).toBeTruthy();
    });
  });

  it('should_DisableSubmit_When_FieldsEmpty', () => {
    // Arrange
    const { getByLabelText } = render(<RegisterScreen />);

    // Act — no input, fields are empty by default

    // Assert
    const button = getByLabelText('auth.registerButton');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('should_DisableSubmit_When_PasswordTooShort', () => {
    // Arrange
    const { getByLabelText } = render(<RegisterScreen />);

    // Act
    fireEvent.changeText(getByLabelText('auth.firstNameLabel'), 'Alice');
    fireEvent.changeText(getByLabelText('auth.emailLabel'), 'alice@example.com');
    fireEvent.changeText(getByLabelText('auth.passwordLabel'), 'short');

    // Assert
    const button = getByLabelText('auth.registerButton');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('should_ShowPasswordHint_When_ScreenLoads', () => {
    // Arrange
    const { getByText } = render(<RegisterScreen />);

    // Act — nothing, just render

    // Assert
    expect(getByText('auth.passwordHint')).toBeTruthy();
  });
});
