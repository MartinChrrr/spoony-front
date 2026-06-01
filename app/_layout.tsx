import '../global.css';
import '@/i18n';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
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
    );
  }

  return <Slot />;
}

export default function RootLayout(): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AuthGate />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
