import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BackButton } = require('../../../src/components/ui/BackButton');

describe('BackButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should_NavigateBack_When_Pressed', () => {
    render(<BackButton />);

    fireEvent.press(screen.getByTestId('back-button'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should_CallCustomHandler_When_OnPressProvided', () => {
    const onPress = jest.fn();
    render(<BackButton onPress={onPress} />);

    fireEvent.press(screen.getByTestId('back-button'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });
});
