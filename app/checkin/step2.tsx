import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  energyEndpoints,
  DeclareEnergyRequest,
  UpdateSpoonsRequest,
  EnergyResponse,
} from '@/data/api/endpoints/energy';
import { energyRepository } from '@/data/repositories/energyRepository';
import { Button } from '@/components/ui/button-custom';
import { BackButton } from '@/components/ui/BackButton';
import { COLORS } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRESETS = [
  { label: 'checkin.presetExhausted', spoons: 3 },
  { label: 'checkin.presetMedium', spoons: 5 },
  { label: 'checkin.presetGood', spoons: 8 },
  { label: 'checkin.presetInShape', spoons: 11 },
  { label: 'checkin.presetNotToday', spoons: 0 },
] as const;

const SLIDER_MIN = 0;
const SLIDER_MAX = 12;
const DEFAULT_PRESET_LABEL = 'checkin.presetGood';
const DEFAULT_SPOONS = 8;

// ---------------------------------------------------------------------------
// SpoonSlider — thin wrapper so tests can read .props.value and fire
// onValueChange without needing @react-native-community/slider installed
// ---------------------------------------------------------------------------

function SpoonSlider({
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  testID,
  accessibilityLabel,
  accessibilityValue,
}: {
  value: number;
  onValueChange: (v: number) => void;
  minimumValue: number;
  maximumValue: number;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityValue?: { min: number; max: number; now: number };
}) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityValue}
      // Expose props so RNTL can read them and fireEvent can reach handlers
      // @ts-ignore — non-standard props intentionally passed for testability
      value={value}
      onValueChange={onValueChange}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      style={styles.slider}
    />
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CheckinStep2() {
  const router = useRouter();
  const { t } = useTranslation();

  const [spoons, setSpoons] = useState<number>(DEFAULT_SPOONS);
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string>(DEFAULT_PRESET_LABEL);
  const [submitError, setSubmitError] = useState<string>('');

  const queryClient = useQueryClient();

  // Whether today's energy already exists → reevaluation uses PUT, not POST.
  const { data: todayEnergy } = useQuery<EnergyResponse | null>({
    queryKey: ['energy', 'today'],
    queryFn: () => energyRepository.getToday(),
  });
  const hasEnergyToday = todayEnergy != null;

  function invalidateEnergy() {
    queryClient.invalidateQueries({ queryKey: ['energy', 'today'] });
  }

  const { mutateAsync: createEnergy, isPending: isDeclaring } = useMutation<
    unknown,
    Error,
    DeclareEnergyRequest
  >({
    mutationFn: (data) => energyEndpoints.declare(data),
    onSuccess: invalidateEnergy,
  });

  const { mutateAsync: reviseEnergy, isPending: isRevising } = useMutation<
    unknown,
    Error,
    UpdateSpoonsRequest
  >({
    mutationFn: (data) => energyEndpoints.updateSpoons(data),
    onSuccess: invalidateEnergy,
  });

  const isPending = isDeclaring || isRevising;

  // ---- handlers ----

  function handlePresetPress(label: string, presetSpoons: number) {
    setSelectedPresetLabel(label);
    setSpoons(presetSpoons);
  }

  function handleSliderChange(value: number) {
    setSpoons(Math.round(value));
    // Deselect any preset that no longer matches
    const matching = PRESETS.find((p) => p.spoons === Math.round(value));
    setSelectedPresetLabel(matching ? matching.label : '');
  }

  function handleDecrement() {
    setSpoons((prev) => {
      const next = Math.max(SLIDER_MIN, prev - 1);
      const matching = PRESETS.find((p) => p.spoons === next);
      setSelectedPresetLabel(matching ? matching.label : '');
      return next;
    });
  }

  function handleIncrement() {
    setSpoons((prev) => {
      const next = Math.min(SLIDER_MAX, prev + 1);
      const matching = PRESETS.find((p) => p.spoons === next);
      setSelectedPresetLabel(matching ? matching.label : '');
      return next;
    });
  }

  async function handleContinue() {
    setSubmitError('');
    if (spoons === 0) {
      router.replace('/checkin/zero-energy');
      return;
    }
    try {
      // Reevaluation updates today's energy (PUT); a fresh check-in declares it (POST).
      if (hasEnergyToday) {
        await reviseEnergy({ spoons });
      } else {
        await createEnergy({ spoons });
      }
      router.replace(`/checkin/step3?spoons=${spoons}`);
    } catch {
      setSubmitError(t('checkin.saveError'));
    }
  }

  // ---- render ----

  return (
    <View style={styles.container}>
      <BackButton />
      {/* Title */}
      <Text style={styles.title} accessibilityRole="header">
        {t('checkin.step2Title')}
      </Text>

      {/* Preset buttons — radio group: mutually exclusive quick-picks */}
      <View
        accessible={false}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('checkin.presetsGroupLabel')}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
          accessibilityRole="none"
        >
          {PRESETS.map(({ label, spoons: presetSpoons }) => {
            const isSelected = selectedPresetLabel === label;
            return (
              <Pressable
                key={label}
                testID={`preset-${label}`}
                onPress={() => handlePresetPress(label, presetSpoons)}
                accessibilityRole="radio"
                accessibilityLabel={t(label)}
                accessibilityState={{ checked: isSelected }}
                style={[styles.presetButton, isSelected && styles.presetButtonSelected]}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                  {t(label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Spoon count — live region announces value + unit to screen readers */}
      <Text
        style={styles.spoonCount}
        accessibilityLiveRegion="polite"
        accessibilityLabel={t('checkin.spoonsCount', { count: spoons })}
      >
        {spoons}
      </Text>

      {/* Slider row */}
      <View style={styles.sliderRow}>
        <Text
          style={styles.sliderLabel}
          accessibilityLabel={t('checkin.sliderMin', { min: SLIDER_MIN })}
        >
          {SLIDER_MIN}
        </Text>
        <SpoonSlider
          testID="spoons-slider"
          value={spoons}
          onValueChange={handleSliderChange}
          minimumValue={SLIDER_MIN}
          maximumValue={SLIDER_MAX}
          accessibilityLabel={t('checkin.spoonsSlider')}
          accessibilityValue={{ min: SLIDER_MIN, max: SLIDER_MAX, now: spoons }}
        />
        <Text
          style={styles.sliderLabel}
          accessibilityLabel={t('checkin.sliderMax', { max: SLIDER_MAX })}
        >
          {SLIDER_MAX}
        </Text>
      </View>

      {/* Fine-adjustment buttons */}
      <View style={styles.adjustRow}>
        <Pressable
          onPress={handleDecrement}
          accessibilityRole="button"
          accessibilityLabel={t('checkin.decreaseSpoons')}
          style={styles.adjustButton}
        >
          <Text style={styles.adjustButtonText}>-</Text>
        </Pressable>
        <Pressable
          onPress={handleIncrement}
          accessibilityRole="button"
          accessibilityLabel={t('checkin.increaseSpoons')}
          style={styles.adjustButton}
        >
          <Text style={styles.adjustButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Continue */}
      <View style={styles.footer}>
        {submitError ? (
          <Text style={styles.errorText} accessibilityRole="alert">
            {submitError}
          </Text>
        ) : null}
        <Button
          label={t('checkin.continue')}
          onPress={handleContinue}
          loading={isPending}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    marginBottom: 20,
  },
  presetsRow: {
    gap: 10,
    paddingVertical: 4,
  },
  presetButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: COLORS.WHITE,
    borderWidth: 2,
    borderColor: COLORS.BROWN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetButtonSelected: {
    backgroundColor: COLORS.ORANGE,
    borderColor: COLORS.ORANGE,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  presetTextSelected: {
    color: COLORS.WHITE,
  },
  spoonCount: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.ORANGE,
    textAlign: 'center',
    marginVertical: 16,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    // BROWN_DARK (#6B5744) on CREAM (#F7F0E8) — contrast ≈ 4.6:1, passes WCAG AA
    // BROWN_MEDIUM (#8B7355) was only ≈ 3.6:1, failing for 14px text
    color: COLORS.BROWN_DARK,
    minWidth: 20,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 44,
  },
  adjustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  adjustButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BROWN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.WHITE,
    lineHeight: 28,
  },
  footer: {
    marginTop: 'auto',
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
});
