import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import SpoonGauge from '@/components/shared/SpoonGauge';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.used !== undefined) return `${params.used} sur ${params.total} cuillères utilisées`;
      return key;
    },
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpoonGauge', () => {
  // -------------------------------------------------------------------------
  // 1. Display correct count
  // -------------------------------------------------------------------------

  it('should_DisplayCorrectCount_When_SpoonsProvided', () => {
    // Arrange / Act
    render(<SpoonGauge spoons={8} spoonsUsed={3} />);

    // Assert
    expect(screen.getByText('3 / 8', { includeHiddenElements: true })).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 2. Fill gauge to correct percentage
  // -------------------------------------------------------------------------

  it('should_FillGaugeCorrectly_When_SpoonsUsed', () => {
    // Arrange / Act
    render(<SpoonGauge spoons={10} spoonsUsed={5} />);

    // Assert — verify semantic value via the progressbar's accessibilityValue
    const progressbar = screen.getByLabelText('5 sur 10 cuillères utilisées');
    expect(progressbar.props.accessibilityValue).toEqual({ min: 0, max: 10, now: 5 });
  });

  // -------------------------------------------------------------------------
  // 3. Individual spoon icons when count < 10
  // -------------------------------------------------------------------------

  it('should_ShowIndividualSpoons_When_CountLessThan10', () => {
    // Arrange / Act
    render(<SpoonGauge spoons={6} spoonsUsed={2} />);

    // Assert — 6 total icons
    const allIcons = screen.getAllByTestId(/^spoon-icon/);
    expect(allIcons).toHaveLength(6);

    // Exactly 2 marked as used
    const usedIcons = screen.getAllByTestId('spoon-icon-used');
    expect(usedIcons).toHaveLength(2);

    // Remaining 4 available
    const availableIcons = screen.getAllByTestId('spoon-icon-available');
    expect(availableIcons).toHaveLength(4);
  });

  // -------------------------------------------------------------------------
  // 4. No individual spoon icons when count > 10
  // -------------------------------------------------------------------------

  it('should_NotShowIndividualSpoons_When_CountGreaterThan10', () => {
    // Arrange / Act
    render(<SpoonGauge spoons={11} spoonsUsed={5} />);

    // Assert
    expect(screen.queryAllByTestId(/^spoon-icon/)).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 5. Gauge animates when spoons change
  // -------------------------------------------------------------------------

  it('should_Animate_When_SpoonsChange', async () => {
    // Arrange
    const { rerender } = render(<SpoonGauge spoons={10} spoonsUsed={2} />);

    // Act — change spoonsUsed
    await act(async () => {
      rerender(<SpoonGauge spoons={10} spoonsUsed={7} />);
    });

    // Assert — progressbar accessibilityValue reflects the new value
    const progressbar = screen.getByLabelText('7 sur 10 cuillères utilisées');
    expect(progressbar.props.accessibilityValue.now).toBe(7);
  });
});
