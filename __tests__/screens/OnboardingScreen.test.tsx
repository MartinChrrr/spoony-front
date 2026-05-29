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

  it('should_DisplayIntroStep_When_ScreenLoads', () => {
    const { getByText } = render(<OnboardingScreen />);

    expect(getByText('onboarding.spoonsTitle')).toBeTruthy();
    expect(getByText('onboarding.spoonsDescription')).toBeTruthy();
  });

  it('should_DisplayInputStep_When_NextPressed', () => {
    const { getByRole, getByText } = render(<OnboardingScreen />);

    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    expect(getByText('onboarding.inputTitle')).toBeTruthy();
    expect(getByText('onboarding.inputDescription')).toBeTruthy();
  });

  it('should_DisplayCostsStep_When_NextPressedTwice', () => {
    const { getByRole, getByText } = render(<OnboardingScreen />);

    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    expect(getByText('onboarding.costsTitle')).toBeTruthy();
    expect(getByText('onboarding.disclaimerTitle')).toBeTruthy();
  });

  it('should_UpdateDemoSpoons_When_PresetPressed', () => {
    const { getByRole, getByTestId, getByText } = render(<OnboardingScreen />);
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    // Default demo value is 8; pressing the "exhausted" preset (3) updates it
    fireEvent.press(getByTestId('onboarding-preset-checkin.presetExhausted'));

    expect(getByText('3')).toBeTruthy();
  });

  it('should_ShowPreviousButton_When_NotOnFirstStep', () => {
    const { getByRole } = render(<OnboardingScreen />);

    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    expect(getByRole('button', { name: 'onboarding.previousButton' })).toBeTruthy();
  });

  it('should_HidePreviousButton_When_OnFirstStep', () => {
    const { queryByRole } = render(<OnboardingScreen />);

    expect(queryByRole('button', { name: 'onboarding.previousButton' })).toBeNull();
  });

  it('should_GoBackToStep1_When_PreviousPressed', () => {
    const { getByRole, getByText } = render(<OnboardingScreen />);
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    fireEvent.press(getByRole('button', { name: 'onboarding.previousButton' }));

    expect(getByText('onboarding.spoonsTitle')).toBeTruthy();
  });

  it('should_DisableStartButton_When_DisclaimerNotAccepted', () => {
    const { getByRole } = render(<OnboardingScreen />);
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    const startButton = getByRole('button', { name: 'onboarding.startButton' });

    expect(startButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should_EnableStartButton_When_DisclaimerAccepted', () => {
    const { getByRole } = render(<OnboardingScreen />);
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    fireEvent.press(getByRole('checkbox', { name: 'onboarding.disclaimerCheckbox' }));

    const startButton = getByRole('button', { name: 'onboarding.startButton' });
    expect(startButton.props.accessibilityState?.disabled).toBe(false);
  });

  it('should_ShowCheckbox_When_OnCostsStep', () => {
    const { getByRole, queryByRole } = render(<OnboardingScreen />);

    // No checkbox on the intro step
    expect(queryByRole('checkbox')).toBeNull();

    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));

    expect(getByRole('checkbox')).toBeTruthy();
  });

  it('should_CallCompleteOnboarding_When_StartPressed', async () => {
    const { getByRole } = render(<OnboardingScreen />);
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('button', { name: 'onboarding.nextButton' }));
    fireEvent.press(getByRole('checkbox', { name: 'onboarding.disclaimerCheckbox' }));

    fireEvent.press(getByRole('button', { name: 'onboarding.startButton' }));

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    });
  });
});
