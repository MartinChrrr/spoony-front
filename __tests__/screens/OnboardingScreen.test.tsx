import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import OnboardingScreen from '../../app/(auth)/onboarding';

const mockCompleteOnboarding = jest.fn();

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    completeOnboarding: mockCompleteOnboarding,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr' },
  }),
}));

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should_DisplayWelcomeStep_When_ScreenLoads', () => {
    // Arrange / Act
    const { getByText } = render(<OnboardingScreen />);

    // Assert
    expect(getByText('onboarding.welcomeTitle')).toBeTruthy();
    expect(getByText('onboarding.welcomeDescription')).toBeTruthy();
  });

  it('should_DisplaySpoonsStep_When_NextPressed', () => {
    // Arrange
    const { getByRole, getByText } = render(<OnboardingScreen />);

    // Act
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    // Assert
    expect(getByText('onboarding.spoonsTitle')).toBeTruthy();
    expect(getByText('onboarding.spoonsDescription')).toBeTruthy();
  });

  it('should_DisplayDisclaimerStep_When_NextPressedTwice', () => {
    // Arrange
    const { getByRole, getByText } = render(<OnboardingScreen />);

    // Act
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    // Assert
    expect(getByText('onboarding.disclaimerTitle')).toBeTruthy();
    expect(getByText('onboarding.disclaimerDescription')).toBeTruthy();
  });

  it('should_ShowPreviousButton_When_NotOnFirstStep', () => {
    // Arrange
    const { getByRole } = render(<OnboardingScreen />);

    // Act
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    // Assert
    expect(getByRole('button', { name: 'onboarding.previousButton' })).toBeTruthy();
  });

  it('should_HidePreviousButton_When_OnFirstStep', () => {
    // Arrange / Act
    const { queryByRole } = render(<OnboardingScreen />);

    // Assert
    expect(queryByRole('button', { name: 'onboarding.previousButton' })).toBeNull();
  });

  it('should_GoBackToStep1_When_PreviousPressed', () => {
    // Arrange
    const { getByRole, getByText } = render(<OnboardingScreen />);
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    // Act
    fireEvent.press(getByRole('button', { name: 'onboarding.previousButton' }));

    // Assert
    expect(getByText('onboarding.welcomeTitle')).toBeTruthy();
  });

  it('should_DisableStartButton_When_DisclaimerNotAccepted', () => {
    // Arrange
    const { getByRole } = render(<OnboardingScreen />);
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    // Act
    const startButton = getByRole('button', { name: 'onboarding.startButton' });

    // Assert
    expect(startButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should_EnableStartButton_When_DisclaimerAccepted', () => {
    // Arrange
    const { getByRole } = render(<OnboardingScreen />);
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    // Act
    fireEvent.press(getByRole('checkbox', { name: 'onboarding.disclaimerCheckbox' }));

    // Assert
    const startButton = getByRole('button', { name: 'onboarding.startButton' });
    expect(startButton.props.accessibilityState?.disabled).toBe(false);
  });

  it('should_ShowCheckbox_When_OnDisclaimerStep', () => {
    // Arrange
    const { getByRole, queryByRole } = render(<OnboardingScreen />);

    // Assert - no checkbox on step 1
    expect(queryByRole('checkbox')).toBeNull();

    // Act
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    // Assert - checkbox on step 3
    expect(getByRole('checkbox')).toBeTruthy();
  });

  it('should_CallCompleteOnboarding_When_StartPressed', async () => {
    // Arrange
    const { getByRole } = render(<OnboardingScreen />);
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('checkbox', { name: 'onboarding.disclaimerCheckbox' }));

    // Act
    fireEvent.press(getByRole('button', { name: 'onboarding.startButton' }));

    // Assert
    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    });
  });
});
