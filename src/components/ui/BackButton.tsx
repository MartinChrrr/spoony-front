import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@/constants/colors';

interface BackButtonProps {
  /** Custom handler; defaults to navigating back in history. */
  onPress?: () => void;
}

/**
 * Reusable 44×44 back affordance for screens that are NOT reachable from the
 * tab bar (pushed/stacked screens). Matches the design system "BackBtn 44×44".
 */
export function BackButton({ onPress }: BackButtonProps): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Pressable
      testID="back-button"
      onPress={onPress ?? (() => router.back())}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={8}
    >
      <Text style={styles.icon} importantForAccessibility="no">
        {'←'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginTop: 4,
  },
  icon: {
    fontSize: 28,
    color: COLORS.BROWN_DARK,
    lineHeight: 32,
  },
});
