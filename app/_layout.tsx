import '../global.css';
import '@/i18n';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { COLORS } from '@/constants/colors';

const queryClient = new QueryClient();

function AuthGate(): React.ReactElement {
  const { user, isLoading, hasCompletedOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onOnboarding = segments.some((segment) => segment === 'onboarding');

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && !hasCompletedOnboarding && !onOnboarding) {
      router.replace('/(auth)/onboarding');
    } else if (user && hasCompletedOnboarding && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, hasCompletedOnboarding, segments, router]);

  if (isLoading) {
    // Branded splash shown while the session is being restored.
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View
          className="flex-1 bg-cream items-center justify-center px-8"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('common.loading')}
        >
          <Text className="text-brown-dark text-4xl font-bold mb-2" importantForAccessibility="no">
            {t('common.appName')}
          </Text>
          <Text className="text-brown-dark text-base text-center mb-8" importantForAccessibility="no">
            {t('common.tagline')}
          </Text>
          <ActivityIndicator size="large" color={COLORS.ORANGE} importantForAccessibility="no" />
        </View>
      </SafeAreaView>
    );
  }

  // Native Stack (was <Slot/>): restores the Android hardware-back button and the
  // iOS/Android swipe-back gesture for pushed screens that have no stack of their
  // own (task/*, calendar/[date]). headerShown:false keeps each screen's existing
  // in-content BackButton as the single visible affordance (header refactor = P2).
  // The top-edge SafeAreaView lifts every screen below the notch/status bar.
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}

export default function RootLayout(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <AuthGate />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
  },
});
