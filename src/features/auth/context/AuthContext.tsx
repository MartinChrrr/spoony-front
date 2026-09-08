import { createContext, useCallback, useContext, useEffect, useState, ReactNode, ReactElement } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useQueryClient } from '@tanstack/react-query';

import { authEndpoints } from '@/data/api/endpoints/auth';
import { registerSessionExpiredHandler } from '@/data/api/client';
import { cacheManager } from '@/data/cache/cacheManager';
import { User } from '../types';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  ONBOARDING_COMPLETED: 'spoonrest.onboardingCompleted',
} as const;

/**
 * M4: scope the onboarding flag per user. A global key let a second account on a
 * shared device inherit the first user's "completed" state and skip onboarding.
 */
function onboardingKey(userId: string): string {
  return `${STORAGE_KEYS.ONBOARDING_COMPLETED}.${userId}`;
}

interface JwtPayload {
  sub: string;
  type?: string;
  exp?: number;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  sessionExpired: boolean;
  hasCompletedOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, firstName: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeUserId(token: string): string | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  const clearAccountCaches = useCallback(async (): Promise<void> => {
    // Stop requests started by the previous identity before dropping their
    // in-memory results. Persistent values are also removed as defence in depth;
    // repositories still namespace every value by user id.
    await queryClient.cancelQueries();
    queryClient.clear();
    await cacheManager.clearAll();
  }, [queryClient]);

  const logout = useCallback(async (): Promise<void> => {
    // Revoke the refresh token server-side first. On a shared aidant/aidé device
    // we must still wipe local credentials even if this call fails (no network,
    // already-expired session, server error), so we never let it block the purge.
    try {
      await authEndpoints.logout();
    } catch {
      // Swallow: local purge below is the security-critical step.
    }
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    // M4: do NOT remove the per-user onboarding flag on logout — it must persist
    // so a returning user is not asked to redo onboarding.
    await AsyncStorage.removeItem('spoonrest.userEmail');
    await AsyncStorage.removeItem('spoonrest.userFirstName');
    await clearAccountCaches();
    setUser(null);
    setSessionExpired(false);
    setHasCompletedOnboarding(true);
  }, [clearAccountCaches]);

  useEffect(() => {
    const restoreSession = async (): Promise<void> => {
      try {
        // One-time migration: old app versions stored account data under global
        // cache keys. Those values must never be read after this version starts.
        await cacheManager.clearLegacy();

        const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        if (storedToken === null) {
          await clearAccountCaches();
          return;
        }

        const payload = jwtDecode<JwtPayload>(storedToken);
        const isExpired = payload.exp !== undefined && payload.exp * 1000 < Date.now();

        let activeToken = storedToken;

        if (isExpired) {
          const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
          if (refreshToken === null) {
            await clearAccountCaches();
            return;
          }

          try {
            const response = await authEndpoints.refresh({ refreshToken });
            const tokens = response.data.data;
            if (tokens === null) {
              await clearAccountCaches();
              return;
            }

            await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
            await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
            activeToken = tokens.accessToken;
          } catch {
            await clearAccountCaches();
            return;
          }
        }

        const userId = decodeUserId(activeToken);
        if (userId !== null) {
          // On restore, we don't have email/firstName from the JWT.
          // Store them in AsyncStorage at login/register so we can restore them.
          const storedEmail = await AsyncStorage.getItem('spoonrest.userEmail');
          const storedFirstName = await AsyncStorage.getItem('spoonrest.userFirstName');
          setUser({
            id: userId,
            email: storedEmail ?? '',
            firstName: storedFirstName ?? '',
          });
          const onboardingValue = await AsyncStorage.getItem(onboardingKey(userId));
          setHasCompletedOnboarding(onboardingValue !== null);
        } else {
          await clearAccountCaches();
        }
      } catch (error) {
        console.error('[AuthContext] Failed to restore session:', error);
        await clearAccountCaches();
      } finally {
        setIsLoading(false);
      }
    };

    registerSessionExpiredHandler(() => {
      setSessionExpired(true);
      void logout();
    });

    void restoreSession();
  }, [clearAccountCaches, logout]);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await authEndpoints.login({ email, password });
    const tokens = response.data.data;
    if (tokens === null) {
      throw new Error('AUTH_RESPONSE_EMPTY');
    }
    const { accessToken: newAccessToken, refreshToken, userId, firstName } = tokens;

    // A successful login can follow an interrupted/expired session without an
    // explicit logout. Purge the previous identity before adopting the new one.
    await clearAccountCaches();

    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    await AsyncStorage.setItem('spoonrest.userEmail', email);
    await AsyncStorage.setItem('spoonrest.userFirstName', firstName);
    const onboardingValue = await AsyncStorage.getItem(onboardingKey(userId));
    setHasCompletedOnboarding(onboardingValue !== null);
    setUser({ id: userId, email, firstName });
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
  ): Promise<void> => {
    // RGPD Art. 9: the register screen gates submission on an explicit consent
    // checkbox, so reaching this call always means consent was given.
    const response = await authEndpoints.register({ email, password, firstName, consentGiven: true });
    const tokens = response.data.data;
    if (tokens === null) {
      throw new Error('AUTH_RESPONSE_EMPTY');
    }
    const { accessToken: newAccessToken, refreshToken, userId } = tokens;

    await clearAccountCaches();

    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    await AsyncStorage.setItem('spoonrest.userEmail', email);
    await AsyncStorage.setItem('spoonrest.userFirstName', firstName);
    setHasCompletedOnboarding(false);
    setUser({ id: userId, email, firstName });
  };

  const completeOnboarding = async (): Promise<void> => {
    // M4: persist under the current user's scoped key so it doesn't leak across
    // accounts on a shared device.
    if (user !== null) {
      await AsyncStorage.setItem(onboardingKey(user.id), 'true');
    }
    setHasCompletedOnboarding(true);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, sessionExpired, hasCompletedOnboarding, login, logout, register, completeOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
