import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { authEndpoints } from '@/data/api/endpoints/auth';
import { cacheManager } from '@/data/cache/cacheManager';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));

jest.mock('@/data/api/endpoints/auth', () => ({
  authEndpoints: {
    login: jest.fn(),
    register: jest.fn(),
  },
}));

jest.mock('@/data/api/client', () => ({
  registerSessionExpiredHandler: jest.fn(),
}));

jest.mock('@/data/cache/cacheManager', () => ({
  cacheManager: {
    clear: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_ACCESS_TOKEN = 'mock.access.token';
const MOCK_REFRESH_TOKEN = 'mock.refresh.token';

const MOCK_JWT_PAYLOAD = {
  sub: 'user-123',
  email: 'test@example.com',
  firstName: 'Jean',
  exp: Math.floor(Date.now() / 1000) + 3600, // 1h from now
};

const EXPIRED_JWT_PAYLOAD = {
  ...MOCK_JWT_PAYLOAD,
  exp: Math.floor(Date.now() / 1000) - 3600, // 1h ago
};

const MOCK_AUTH_RESPONSE = {
  data: {
    status: 'success' as const,
    data: {
      accessToken: MOCK_ACCESS_TOKEN,
      refreshToken: MOCK_REFRESH_TOKEN,
      userId: 'user-123',
      firstName: 'Jean',
    },
    message: null,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;
const mockedAuthEndpoints = authEndpoints as jest.Mocked<typeof authEndpoints>;
const mockedCacheManager = cacheManager as jest.Mocked<typeof cacheManager>;

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no stored token, no onboarding flag
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue();
    mockedSecureStore.deleteItemAsync.mockResolvedValue();
    mockedAsyncStorage.setItem.mockResolvedValue();
    mockedAsyncStorage.removeItem.mockResolvedValue();
    mockedCacheManager.clear.mockResolvedValue();
  });

  // -------------------------------------------------------------------------
  // 1. isLoading starts true
  // -------------------------------------------------------------------------

  it('should_SetIsLoading_When_Initializing', () => {
    // Arrange: restoreSession will never resolve during this synchronous check
    mockedSecureStore.getItemAsync.mockImplementation(() => new Promise(() => {}));

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert: before any async resolution, loading must be true
    expect(result.current.isLoading).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. Restore session with valid token
  // -------------------------------------------------------------------------

  it('should_LoadUser_When_ValidTokenInSecureStore', async () => {
    // Arrange
    mockedSecureStore.getItemAsync.mockResolvedValue(MOCK_ACCESS_TOKEN);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);
    mockedAsyncStorage.getItem.mockResolvedValue('true');

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Jean',
    });
    expect(result.current.hasCompletedOnboarding).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 3. Expired token -> user stays null
  // -------------------------------------------------------------------------

  it('should_NotLoadUser_When_TokenExpired', async () => {
    // Arrange
    mockedSecureStore.getItemAsync.mockResolvedValue(MOCK_ACCESS_TOKEN);
    mockedJwtDecode.mockReturnValue(EXPIRED_JWT_PAYLOAD as never);

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 4. Login flow
  // -------------------------------------------------------------------------

  it('should_StoreTokensAndSetUser_When_LoginSuccessful', async () => {
    // Arrange
    mockedAuthEndpoints.login.mockResolvedValue(MOCK_AUTH_RESPONSE as never);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);
    mockedAsyncStorage.getItem.mockResolvedValue('true');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    // Assert
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', MOCK_ACCESS_TOKEN);
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', MOCK_REFRESH_TOKEN);
    expect(result.current.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Jean',
    });
    expect(result.current.hasCompletedOnboarding).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 5. Logout flow
  // -------------------------------------------------------------------------

  it('should_RemoveTokensAndClearUser_When_LogoutCalled', async () => {
    // Arrange: start with a logged-in user
    mockedSecureStore.getItemAsync.mockResolvedValue(MOCK_ACCESS_TOKEN);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);
    mockedAsyncStorage.getItem.mockResolvedValue('true');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).not.toBeNull();

    // Act
    await act(async () => {
      await result.current.logout();
    });

    // Assert
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('spoony.onboardingCompleted');
    expect(mockedCacheManager.clear).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.sessionExpired).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 6. Register flow - stores tokens and sets user
  // -------------------------------------------------------------------------

  it('should_StoreTokensAndSetUser_When_RegisterSuccessful', async () => {
    // Arrange
    mockedAuthEndpoints.register.mockResolvedValue(MOCK_AUTH_RESPONSE as never);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await act(async () => {
      await result.current.register('test@example.com', 'password123', 'Jean');
    });

    // Assert
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', MOCK_ACCESS_TOKEN);
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', MOCK_REFRESH_TOKEN);
    expect(result.current.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Jean',
    });
  });

  // -------------------------------------------------------------------------
  // 7. Register sets hasCompletedOnboarding=false
  // -------------------------------------------------------------------------

  it('should_SetOnboardingFalse_When_RegisterSuccessful', async () => {
    // Arrange
    mockedAuthEndpoints.register.mockResolvedValue(MOCK_AUTH_RESPONSE as never);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await act(async () => {
      await result.current.register('test@example.com', 'password123', 'Jean');
    });

    // Assert
    expect(result.current.hasCompletedOnboarding).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 8. completeOnboarding
  // -------------------------------------------------------------------------

  it('should_SetOnboardingTrue_When_CompleteOnboardingCalled', async () => {
    // Arrange: user registered -> onboarding not completed
    mockedAuthEndpoints.register.mockResolvedValue(MOCK_AUTH_RESPONSE as never);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.register('test@example.com', 'password123', 'Jean');
    });
    expect(result.current.hasCompletedOnboarding).toBe(false);

    // Act
    await act(async () => {
      await result.current.completeOnboarding();
    });

    // Assert
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith('spoony.onboardingCompleted', 'true');
    expect(result.current.hasCompletedOnboarding).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 9. useAuth guard outside provider
  // -------------------------------------------------------------------------

  it('should_ThrowError_When_UseAuthOutsideProvider', () => {
    // Arrange / Act / Assert
    // renderHook without wrapper -> no AuthProvider in tree
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});
