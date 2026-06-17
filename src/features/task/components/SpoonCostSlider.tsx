import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@/constants/colors';

const MIN = 1;
const MAX = 5;

interface SpoonCostSliderProps {
  /** Current cost, clamped between 1 and 5. */
  value: number;
  /** Receives the new clamped value. */
  onChange: (value: number) => void;
}

/**
 * Spoon-cost stepper extracted verbatim from the task new/edit screens. The
 * track exposes itself to assistive tech as an "adjustable" element with
 * increment/decrement actions; the +/- buttons stay interactive but are hidden
 * from the a11y tree so the slider is not announced three times.
 *
 * NOTE: behaviour and styling are intentionally identical to the previous
 * inline implementation — a11y refinements belong to the dedicated a11y chantier.
 */
export function SpoonCostSlider({ value, onChange }: SpoonCostSliderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.sliderRow}>
      <Pressable
        testID="spoon-cost-decrement"
        onPress={() => onChange(Math.max(MIN, value - 1))}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={styles.sliderButton}
      >
        <Text style={styles.sliderButtonText}>-</Text>
      </Pressable>
      <View
        testID="task-spoon-cost-slider"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('taskForm.spoonCost')}
        accessibilityValue={{ min: MIN, max: MAX, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            onChange(Math.min(MAX, value + 1));
          } else if (event.nativeEvent.actionName === 'decrement') {
            onChange(Math.max(MIN, value - 1));
          }
        }}
        style={styles.sliderTrack}
      >
        <View
          style={[styles.sliderFill, { width: `${((value - MIN) / (MAX - MIN)) * 100}%` }]}
        />
      </View>
      <Pressable
        testID="spoon-cost-increment"
        onPress={() => onChange(Math.min(MAX, value + 1))}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={styles.sliderButton}
      >
        <Text style={styles.sliderButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.BROWN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.WHITE,
    lineHeight: 24,
  },
  sliderTrack: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.BROWN_LIGHT,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: COLORS.ORANGE,
  },
});
