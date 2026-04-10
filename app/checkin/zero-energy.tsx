import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { messageEndpoints, MessageResponse } from '@/data/api/endpoints/messages';
import { COLORS } from '@/constants/colors';

export default function ZeroEnergyScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const { data: message, isLoading } = useQuery<MessageResponse>({
    queryKey: ['message', 'ZERO_ENERGY'],
    queryFn: async () => {
      const response = await messageEndpoints.getRandom('ZERO_ENERGY');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          color={COLORS.ORANGE}
          accessibilityRole="progressbar"
          accessibilityLabel={t('common.loading')}
          accessibilityLiveRegion="polite"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text
          style={styles.title}
          accessibilityRole="header"
        >
          {t('checkin.zeroEnergyTitle')}
        </Text>

        {message && (
          <Text
            style={styles.message}
            accessibilityLiveRegion="polite"
          >
            {t(message.key)}
          </Text>
        )}

        <Text style={styles.info}>
          {t('checkin.zeroEnergyInfo')}
        </Text>

        <Pressable
          testID="back-to-home-button"
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel={t('checkin.backToHome')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {t('checkin.backToHome')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    // BROWN_DARK (#6B5744) on CREAM (#F7F0E8) — contrast ≈ 4.6:1, passes WCAG AA normal text
    // BROWN_MEDIUM (#8B7355) was only ≈ 3.6:1 — fails for 18dp (~13.5pt) normal weight text
    color: COLORS.BROWN_DARK,
    textAlign: 'center',
    lineHeight: 28,
  },
  info: {
    fontSize: 14,
    // BROWN_DARK (#6B5744) on CREAM (#F7F0E8) — contrast ≈ 4.6:1, passes WCAG AA
    // BROWN_LIGHT (#C4B5A0) was only ≈ 1.8:1, failing WCAG AA
    color: COLORS.BROWN_DARK,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    minHeight: 44,
    minWidth: 44,
    backgroundColor: COLORS.ORANGE,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});
