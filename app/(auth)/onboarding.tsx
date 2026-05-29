import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/hooks/useAuth';

// Three-screen "Première connexion" flow teaching the spoon metaphor:
// 1) Intro — explain the metaphor
// 2) Input — interactive preset demo ("how much energy today?")
// 3) Costs — example task costs + medical disclaimer
const STEP_KEYS = ['intro', 'input', 'costs'] as const;
type StepKey = (typeof STEP_KEYS)[number];

// Presets for the interactive demo (3 presets, spanning the range).
const DEMO_PRESETS: ReadonlyArray<{ labelKey: string; spoons: number }> = [
  { labelKey: 'checkin.presetExhausted', spoons: 3 },
  { labelKey: 'checkin.presetGood', spoons: 8 },
  { labelKey: 'checkin.presetInShape', spoons: 11 },
];

// Example tasks with their spoon costs shown on the "Costs" step.
const EXAMPLE_COSTS: ReadonlyArray<{ key: string; cost: number }> = [
  { key: 'tasks.hygiene.shower', cost: 2 },
  { key: 'tasks.household.groceries', cost: 3 },
  { key: 'tasks.food.prepare_snack', cost: 1 },
  { key: 'tasks.household.dishes', cost: 2 },
  { key: 'tasks.food.cook_meal', cost: 3 },
];

const DEFAULT_DEMO_SPOONS = 8;

export default function OnboardingScreen(): React.ReactElement {
  const { completeOnboarding } = useAuth();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [demoSpoons, setDemoSpoons] = useState(DEFAULT_DEMO_SPOONS);

  const stepKey: StepKey = STEP_KEYS[currentIndex];
  const isLastStep = currentIndex === STEP_KEYS.length - 1;
  const isNextDisabled = isLastStep && !disclaimerAccepted;

  const handleNext = async (): Promise<void> => {
    if (isLastStep) {
      await completeOnboarding();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = (): void => {
    setCurrentIndex((prev) => prev - 1);
  };

  return (
    <View className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="flex-grow justify-center px-8 py-6">
        {/* ---- Step 1: Intro (spoon metaphor) ---- */}
        {stepKey === 'intro' && (
          <View>
            <Text
              className="text-brown-dark text-2xl font-bold text-center mb-4"
              accessible
              accessibilityRole="header"
            >
              {t('onboarding.spoonsTitle')}
            </Text>
            <Text className="text-brown-dark text-base text-center leading-6">
              {t('onboarding.spoonsDescription')}
            </Text>
          </View>
        )}

        {/* ---- Step 2: Interactive input demo ---- */}
        {stepKey === 'input' && (
          <View>
            <Text
              className="text-brown-dark text-2xl font-bold text-center mb-2"
              accessible
              accessibilityRole="header"
            >
              {t('onboarding.inputTitle')}
            </Text>
            <Text className="text-brown-dark text-base text-center leading-6 mb-6">
              {t('onboarding.inputDescription')}
            </Text>

            <Text
              className="text-orange text-6xl font-bold text-center mb-6"
              accessibilityLiveRegion="polite"
              accessibilityLabel={t('checkin.spoonsCount', { count: demoSpoons })}
            >
              {demoSpoons}
            </Text>

            <View
              className="flex-row justify-center gap-3 flex-wrap"
              accessibilityRole="radiogroup"
              accessibilityLabel={t('checkin.presetsGroupLabel')}
            >
              {DEMO_PRESETS.map(({ labelKey, spoons }) => {
                const isSelected = demoSpoons === spoons;
                return (
                  <Pressable
                    key={labelKey}
                    testID={`onboarding-preset-${labelKey}`}
                    onPress={() => setDemoSpoons(spoons)}
                    accessibilityRole="radio"
                    accessibilityLabel={t(labelKey)}
                    accessibilityState={{ checked: isSelected }}
                    className={`min-h-[44px] px-4 py-3 rounded-full border-2 ${
                      isSelected ? 'bg-orange border-orange' : 'bg-white border-brown-light'
                    }`}
                  >
                    <Text className={isSelected ? 'text-white font-semibold' : 'text-brown-dark font-semibold'}>
                      {t(labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-brown-medium text-sm text-center mt-6">
              {t('onboarding.inputHint')}
            </Text>
          </View>
        )}

        {/* ---- Step 3: Example costs + medical disclaimer ---- */}
        {stepKey === 'costs' && (
          <View>
            <Text
              className="text-brown-dark text-2xl font-bold text-center mb-2"
              accessible
              accessibilityRole="header"
            >
              {t('onboarding.costsTitle')}
            </Text>
            <Text className="text-brown-dark text-base text-center leading-6 mb-5">
              {t('onboarding.costsDescription')}
            </Text>

            <View className="gap-2 mb-6">
              {EXAMPLE_COSTS.map(({ key, cost }) => (
                <View
                  key={key}
                  testID={`onboarding-cost-${key}`}
                  className="flex-row justify-between items-center bg-white border border-brown-light rounded-lg px-4 py-3 min-h-[44px]"
                  accessible
                  accessibilityLabel={`${t(key)}, ${t('tasks.spoonCost', { count: cost })}`}
                >
                  <Text className="text-brown-dark text-base">{t(key)}</Text>
                  <Text className="text-brown-dark text-base font-semibold">
                    {t('tasks.spoonCost', { count: cost })}
                  </Text>
                </View>
              ))}
            </View>

            <Text className="text-brown-dark text-sm font-semibold mb-1">
              {t('onboarding.disclaimerTitle')}
            </Text>
            <Text className="text-brown-dark text-sm leading-5 mb-2">
              {t('onboarding.disclaimerDescription')}
            </Text>
            <Pressable
              className="flex-row items-center min-h-[44px]"
              onPress={() => setDisclaimerAccepted((prev) => !prev)}
              accessible
              accessibilityRole="checkbox"
              accessibilityState={{ checked: disclaimerAccepted }}
              accessibilityLabel={t('onboarding.disclaimerCheckbox')}
            >
              <View
                className={`w-6 h-6 border-2 rounded mr-3 items-center justify-center ${
                  disclaimerAccepted ? 'bg-orange border-orange' : 'border-brown-medium'
                }`}
              >
                {disclaimerAccepted && <Text className="text-white text-sm">✓</Text>}
              </View>
              <Text className="text-brown-dark text-sm flex-1">
                {t('onboarding.disclaimerCheckbox')}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View
        className="flex-row justify-center items-center mb-4"
        accessible
        accessibilityLabel={t('onboarding.stepIndicator', { current: currentIndex + 1, total: STEP_KEYS.length })}
      >
        {STEP_KEYS.map((key, index) => (
          <View
            key={key}
            className={`rounded-full mx-1 ${
              index === currentIndex ? 'w-3 h-3 bg-orange' : 'w-2 h-2 bg-brown-light'
            }`}
            importantForAccessibility="no"
            accessibilityElementsHidden={true}
          />
        ))}
      </View>

      <View className="px-6 pb-8 gap-3">
        <Pressable
          className={`min-h-[44px] rounded-lg items-center justify-center py-3 ${
            isNextDisabled ? 'bg-orange/50' : 'bg-orange'
          }`}
          onPress={handleNext}
          disabled={isNextDisabled}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isLastStep ? t('onboarding.startButton') : t('onboarding.nextButton')}
          accessibilityHint={isLastStep ? t('onboarding.startButtonHint') : t('onboarding.nextButtonHint')}
          accessibilityState={{ disabled: isNextDisabled }}
        >
          <Text className="text-white font-semibold text-base">
            {isLastStep ? t('onboarding.startButton') : t('onboarding.nextButton')}
          </Text>
        </Pressable>

        {currentIndex > 0 && (
          <Pressable
            className="min-h-[44px] items-center justify-center"
            onPress={handlePrevious}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.previousButton')}
            accessibilityHint={t('onboarding.previousButtonHint')}
          >
            <Text className="text-brown-dark text-base">
              {t('onboarding.previousButton')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
