import '../global.css';
import '@/i18n';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
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

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && !hasCompletedOnboarding && segments[1] !== 'onboarding') {
      router.replace('/(auth)/onboarding');
    } else if (user && hasCompletedOnboarding && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, hasCompletedOnboarding, segments, router]);

  if (isLoading) {
    return (
      <View
        className="flex-1 bg-cream items-center justify-center"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('common.loading')}
      >
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
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
