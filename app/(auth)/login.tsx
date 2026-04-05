import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { COLORS } from '@/constants/colors';

export default function LoginScreen(): React.ReactElement {
  const { login } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMounted = useRef(true);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => () => { isMounted.current = false; }, []);

  const isValid = email.trim().length > 0 && password.length > 0;

  const handleLogin = async (): Promise<void> => {
    if (!isValid || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (e) {
      if (!isMounted.current) return;
      if (axios.isAxiosError(e)) {
        if (!e.response) {
          setError(t('errors.network'));
        } else if (e.response.status === 401) {
          setError(t('auth.wrongCredentials'));
        } else {
          setError(t('errors.server'));
        }
      } else {
        setError(t('auth.loginError'));
      }
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-cream"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text
          className="text-brown-dark text-3xl font-bold text-center mb-2"
          accessibilityRole="header"
        >
          {t('common.appName')}
        </Text>
        <Text className="text-brown-dark text-center mb-8">
          {t('auth.loginSubtitle')}
        </Text>

        {error && (
          <View
            className="bg-error/10 border border-error rounded-lg p-3 mb-4"
            accessible
            accessibilityRole="alert"
          >
            <Text className="text-error text-center">{error}</Text>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-brown-dark text-sm font-medium mb-1">
            {t('auth.emailLabel')}
          </Text>
          <TextInput
            className="bg-white border border-brown-medium rounded-lg px-4 py-3 text-brown-dark text-base"
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor={COLORS.BROWN_LIGHT}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            accessibilityLabel={t('auth.emailLabel')}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!isSubmitting}
          />
        </View>

        <View className="mb-6">
          <Text className="text-brown-dark text-sm font-medium mb-1">
            {t('auth.passwordLabel')}
          </Text>
          <TextInput
            ref={passwordRef}
            className="bg-white border border-brown-medium rounded-lg px-4 py-3 text-brown-dark text-base"
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor={COLORS.BROWN_LIGHT}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            accessibilityLabel={t('auth.passwordLabel')}
            accessibilityHint={t('auth.passwordFieldHint')}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!isSubmitting}
          />
        </View>

        <Pressable
          className={`min-h-[44px] rounded-lg items-center justify-center py-3 ${
            isValid && !isSubmitting ? 'bg-orange' : 'bg-orange/50'
          }`}
          onPress={handleLogin}
          disabled={!isValid || isSubmitting}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('auth.loginButton')}
          accessibilityHint={t('auth.loginButtonHint')}
          accessibilityState={{ disabled: !isValid || isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {t('auth.loginButton')}
            </Text>
          )}
        </Pressable>

        <Link href="/(auth)/register" asChild>
          <Pressable
            className="min-h-[44px] items-center justify-center mt-4"
            accessible
            accessibilityRole="link"
            accessibilityLabel={t('auth.goToRegister')}
            accessibilityHint={t('auth.goToRegisterHint')}
          >
            <Text className="text-brown-dark text-base">
              {t('auth.goToRegister')}
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
