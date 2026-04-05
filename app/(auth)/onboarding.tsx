import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/hooks/useAuth';

interface OnboardingStep {
  key: string;
  titleKey: string;
  descriptionKey: string;
}

const STEPS: OnboardingStep[] = [
  { key: 'welcome', titleKey: 'onboarding.welcomeTitle', descriptionKey: 'onboarding.welcomeDescription' },
  { key: 'spoons', titleKey: 'onboarding.spoonsTitle', descriptionKey: 'onboarding.spoonsDescription' },
  { key: 'disclaimer', titleKey: 'onboarding.disclaimerTitle', descriptionKey: 'onboarding.disclaimerDescription' },
];

export default function OnboardingScreen(): React.ReactElement {
  const { completeOnboarding } = useAuth();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const currentStep = STEPS[currentIndex];
  const isLastStep = currentIndex === STEPS.length - 1;
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
      <View className="flex-1 justify-center items-center px-8">
        <Text
          className="text-brown-dark text-2xl font-bold text-center mb-4"
          accessible
          accessibilityRole="header"
        >
          {t(currentStep.titleKey)}
        </Text>
        <Text className="text-brown-dark text-base text-center leading-6">
          {t(currentStep.descriptionKey)}
        </Text>

        {currentStep.key === 'disclaimer' && (
          <Pressable
            className="flex-row items-center mt-6 min-h-[44px]"
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
              {disclaimerAccepted && (
                <Text className="text-white text-sm">✓</Text>
              )}
            </View>
            <Text className="text-brown-dark text-sm flex-1">
              {t('onboarding.disclaimerCheckbox')}
            </Text>
          </Pressable>
        )}
      </View>

      <View
        className="flex-row justify-center items-center mb-4"
        accessible
        accessibilityLabel={t('onboarding.stepIndicator', { current: currentIndex + 1, total: STEPS.length })}
      >
        {STEPS.map((step, index) => (
          <View
            key={step.key}
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
