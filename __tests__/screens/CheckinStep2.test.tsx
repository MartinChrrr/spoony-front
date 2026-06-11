import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockCreateEnergyMutateAsync = jest.fn().mockResolvedValue({});
let mockCreateEnergyIsPending = false;

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useMutation: jest.fn(() => ({
    mutateAsync: mockCreateEnergyMutateAsync,
    isPending: mockCreateEnergyIsPending,
  })),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock('@/data/api/endpoints/energy', () => ({
  energyEndpoints: {
    declare: jest.fn(),
    updateSpoons: jest.fn(),
  },
}));

jest.mock('@/data/repositories/energyRepository', () => ({
  energyRepository: { getToday: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PRESETS = [
  { label: 'checkin.presetExhausted', spoons: 3 },
  { label: 'checkin.presetMedium', spoons: 5 },
  { label: 'checkin.presetGood', spoons: 8 },
  { label: 'checkin.presetInShape', spoons: 11 },
  { label: 'checkin.presetNotToday', spoons: 0 },
];

// ---------------------------------------------------------------------------
// Subject under test (imported after mocks are in place)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CheckinStep2 = require('../../app/checkin/step2').default;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CheckinStep2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEnergyIsPending = false;
    mockCreateEnergyMutateAsync.mockResolvedValue({});
  });

  // -------------------------------------------------------------------------
  // 1. Select a preset — it becomes visually selected
  // -------------------------------------------------------------------------

  it('should_SelectPreset_When_PresetTapped', () => {
    // Arrange
    render(<CheckinStep2 />);

    const presetButton = screen.getByText('checkin.presetExhausted');

    // Act
    fireEvent.press(presetButton);

    // Assert — the button (or its accessible container) is marked selected/checked
    const selectedPreset = screen.getByTestId('preset-checkin.presetExhausted');
    const state = selectedPreset.props.accessibilityState;
    expect(state?.selected ?? state?.checked).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. Slider value updates when a preset is tapped
  // -------------------------------------------------------------------------

  it('should_UpdateSlider_When_PresetSelected', () => {
    // Arrange
    render(<CheckinStep2 />);

    // Act — tap the "Épuisé" preset (spoons: 3)
    fireEvent.press(screen.getByText('checkin.presetExhausted'));

    // Assert
    const slider = screen.getByTestId('spoons-slider');
    expect(slider.props.value).toBe(3);
  });

  // -------------------------------------------------------------------------
  // 3. Navigate to zero-energy when 0 spoons are selected (after API call)
  // -------------------------------------------------------------------------

  it('should_NavigateToZeroEnergy_When_ZeroSpoonsSelected', async () => {
    // Arrange
    render(<CheckinStep2 />);

    // Act — tap "Pas aujourd'hui" preset (spoons: 0) then continue
    fireEvent.press(screen.getByText('checkin.presetNotToday'));
    fireEvent.press(screen.getByText('checkin.continue'));

    // Assert — API must be called BEFORE navigating (C3 fix: records energy + postpones tasks)
    await waitFor(() => {
      expect(mockCreateEnergyMutateAsync).toHaveBeenCalledWith({ spoons: 0 });
      expect(mockReplace).toHaveBeenCalledWith('/checkin/zero-energy');
    });
  });

  // -------------------------------------------------------------------------
  // 3b. Does NOT navigate to zero-energy if API call fails at 0 spoons
  // -------------------------------------------------------------------------

  it('should_ShowError_When_ZeroSpoonsApiCallFails', async () => {
    // Arrange
    mockCreateEnergyMutateAsync.mockRejectedValueOnce(new Error('network'));
    render(<CheckinStep2 />);

    // Act
    fireEvent.press(screen.getByText('checkin.presetNotToday'));
    fireEvent.press(screen.getByText('checkin.continue'));

    // Assert — error shown, no navigation to zero-energy
    await waitFor(() => {
      expect(screen.getByText('checkin.saveError')).toBeTruthy();
    });
    expect(mockReplace).not.toHaveBeenCalledWith('/checkin/zero-energy');
  });

  // -------------------------------------------------------------------------
  // 4. Navigate to step 3 when non-zero spoons are selected
  // -------------------------------------------------------------------------

  it('should_NavigateToStep3_When_NonZeroSpoonsSelected', async () => {
    // Arrange
    render(<CheckinStep2 />);

    // Act — tap any non-zero preset then continue
    fireEvent.press(screen.getByText('checkin.presetMedium'));
    fireEvent.press(screen.getByText('checkin.continue'));

    // Assert — N1: advancing to step 3 uses push so back returns to step 2
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/checkin/step3?spoons='),
      );
    });
  });

  // -------------------------------------------------------------------------
  // 5. createEnergy mutation called with correct spoons on continue
  // -------------------------------------------------------------------------

  it('should_CallCreateEnergy_When_ContinuePressed', async () => {
    // Arrange
    render(<CheckinStep2 />);

    // Act — select "Bon" preset (spoons: 8) then continue
    fireEvent.press(screen.getByText('checkin.presetGood'));
    fireEvent.press(screen.getByText('checkin.continue'));

    // Assert
    await waitFor(() => {
      expect(mockCreateEnergyMutateAsync).toHaveBeenCalledWith({ spoons: 8 });
    });
  });

  // -------------------------------------------------------------------------
  // 6. Slider change updates the selected spoon value
  // -------------------------------------------------------------------------

  it('should_UpdateSpoons_When_SliderValueChanges', async () => {
    // Arrange
    render(<CheckinStep2 />);

    const slider = screen.getByTestId('spoons-slider');

    // Act — simulate slider move to value 7
    fireEvent(slider, 'onValueChange', 7);

    // Continue to trigger the mutation
    fireEvent.press(screen.getByText('checkin.continue'));

    // Assert
    await waitFor(() => {
      expect(mockCreateEnergyMutateAsync).toHaveBeenCalledWith({ spoons: 7 });
    });
  });
});
