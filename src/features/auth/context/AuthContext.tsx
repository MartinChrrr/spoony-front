import { createContext, useCallback, useContext, useEffect, useState, ReactNode, ReactElement } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

import { authEndpoints } from '@/data/api/endpoints/auth';
import { registerSessionExpiredHandler } from '@/data/api/client';
import { cacheManager } from '@/data/cache/cacheManager';
import { User } from '../types';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  ONBOARDING_COMPLETED: 'spoony.onboardingCompleted',
} as const;

interface JwtPayload {
  sub: string;
  email: string;
  firstName: string;
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

function decodeUser(token: string): User | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (!payload.sub || !payload.email || !payload.firstName) {
      return null;
    }
    return { id: payload.sub, email: payload.email, firstName: payload.firstName };
  } catch {
    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  const logout = useCallback(async (): Promise<void> => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    await cacheManager.clear();
    setUser(null);
    setSessionExpired(false);
    setHasCompletedOnboarding(true);
  }, []);

  useEffect(() => {
    const restoreSession = async (): Promise<void> => {
      try {
        const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        if (storedToken === null) return;

        const payload = jwtDecode<JwtPayload>(storedToken);
        const isExpired = payload.exp !== undefined && payload.exp * 1000 < Date.now();

        let activeToken = storedToken;

        if (isExpired) {
          const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
          if (refreshToken === null) return;

          try {
            const response = await authEndpoints.refresh({ refreshToken });
            const tokens = response.data.data;
            if (tokens === null) return;

            await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
            await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
            activeToken = tokens.accessToken;
          } catch {
            return;
          }
        }

        const restoredUser = decodeUser(activeToken);
        if (restoredUser !== null) {
          setUser(restoredUser);
          const onboardingValue = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
          if (onboardingValue === null) {
            setHasCompletedOnboarding(false);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Failed to restore session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    registerSessionExpiredHandler(() => {
      setSessionExpired(true);
      void logout();
    });

    void restoreSession();
  }, [logout]);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await authEndpoints.login({ email, password });
    const tokens = response.data.data;
    if (tokens === null) {
      throw new Error('AUTH_RESPONSE_EMPTY');
    }
    const { accessToken: newAccessToken, refreshToken } = tokens;

    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    const loggedInUser = decodeUser(newAccessToken);
    if (!loggedInUser) {
      throw new Error('INVALID_TOKEN');
    }
    const onboardingValue = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    setHasCompletedOnboarding(onboardingValue !== null);
    setUser(loggedInUser);
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
  ): Promise<void> => {
    const response = await authEndpoints.register({ email, password, firstName });
    const tokens = response.data.data;
    if (tokens === null) {
      throw new Error('AUTH_RESPONSE_EMPTY');
    }
    const { accessToken: newAccessToken, refreshToken } = tokens;

    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    const registeredUser = decodeUser(newAccessToken);
    if (!registeredUser) {
      throw new Error('INVALID_TOKEN');
    }
    setHasCompletedOnboarding(false);
    setUser(registeredUser);
  };

  const completeOnboarding = async (): Promise<void> => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
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
