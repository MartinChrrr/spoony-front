import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';
import { authEndpoints } from '@/data/api/endpoints/auth';
import { cacheManager } from '@/data/cache/cacheManager';
import { isRefreshTokenRejected } from '@/data/api/client';

let mockSessionExpiredHandler: (() => void | Promise<void>) | null = null;

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
    refresh: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('@/data/api/client', () => ({
  registerSessionExpiredHandler: jest.fn((handler: () => void | Promise<void>) => {
    mockSessionExpiredHandler = handler;
    return () => {
      if (mockSessionExpiredHandler === handler) mockSessionExpiredHandler = null;
    };
  }),
  resetSessionExpiration: jest.fn(),
  isRefreshTokenRejected: jest.fn(),
}));

jest.mock('@/data/cache/cacheManager', () => ({
  cacheManager: {
    clearAll: jest.fn(),
    clearLegacy: jest.fn(),
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
const mockedIsRefreshTokenRejected = isRefreshTokenRejected as jest.MockedFunction<
  typeof isRefreshTokenRejected
>;
let testQueryClient: QueryClient;

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionExpiredHandler = null;
    mockedIsRefreshTokenRejected.mockReturnValue(false);
    testQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Default: no stored token, no onboarding flag
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue();
    mockedSecureStore.deleteItemAsync.mockResolvedValue();
    mockedAsyncStorage.setItem.mockResolvedValue();
    mockedAsyncStorage.removeItem.mockResolvedValue();
    mockedCacheManager.clearAll.mockResolvedValue();
    mockedCacheManager.clearLegacy.mockResolvedValue();
    mockedAuthEndpoints.logout.mockResolvedValue(undefined as never);
  });

  // -------------------------------------------------------------------------
  // 1. isLoading starts true
  // -------------------------------------------------------------------------

  it('should_SetIsLoading_When_Initializing', () => {
    // Arrange: restoreSession will never resolve during this synchronous check
    mockedSecureStore.getItemAsync.mockImplementation(() => new Promise(() => {}));

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

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
    mockedAsyncStorage.getItem.mockImplementation((key) => {
      // M4: onboarding flag is now scoped per userId
      if (key === 'spoonrest.onboardingCompleted.user-123') return Promise.resolve('true');
      if (key === 'spoonrest.userEmail') return Promise.resolve('test@example.com');
      if (key === 'spoonrest.userFirstName') return Promise.resolve('Jean');
      return Promise.resolve(null);
    });

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

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
  // 3. Expired token without refresh token -> definitive expiration
  // -------------------------------------------------------------------------

  it('should_NotLoadUser_When_TokenExpired', async () => {
    // Arrange
    mockedSecureStore.getItemAsync.mockImplementation((key) =>
      key === 'accessToken' ? Promise.resolve(MOCK_ACCESS_TOKEN) : Promise.resolve(null),
    );
    mockedJwtDecode.mockReturnValue(EXPIRED_JWT_PAYLOAD as never);

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.sessionExpired).toBe(true);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
  });

  // -------------------------------------------------------------------------
  // 3.5. Expired access token + valid refresh token -> restore user
  // -------------------------------------------------------------------------

  it('should_RestoreUser_When_AccessTokenExpiredAndRefreshSucceeds', async () => {
    // Arrange
    const NEW_ACCESS_TOKEN = 'new-access-token';
    const NEW_REFRESH_TOKEN = 'new-refresh-token';

    mockedSecureStore.getItemAsync.mockImplementation((key) => {
      if (key === 'accessToken') return Promise.resolve(MOCK_ACCESS_TOKEN);
      if (key === 'refreshToken') return Promise.resolve(MOCK_REFRESH_TOKEN);
      return Promise.resolve(null);
    });

    // First call: decode the stored (expired) access token in restoreSession
    // Second call: decode the new access token after refresh
    mockedJwtDecode
      .mockReturnValueOnce(EXPIRED_JWT_PAYLOAD as never)
      .mockReturnValue(MOCK_JWT_PAYLOAD as never);

    mockedAuthEndpoints.refresh.mockResolvedValue({
      data: {
        status: 'success' as const,
        data: { accessToken: NEW_ACCESS_TOKEN, refreshToken: NEW_REFRESH_TOKEN },
        message: null,
      },
    } as never);

    mockedAsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'spoonrest.userEmail') return Promise.resolve('test@example.com');
      if (key === 'spoonrest.userFirstName') return Promise.resolve('Jean');
      return Promise.resolve(null);
    });

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).not.toBeNull();
    expect(result.current.user).toEqual({
      id: MOCK_JWT_PAYLOAD.sub,
      email: 'test@example.com',
      firstName: 'Jean',
    });
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', NEW_ACCESS_TOKEN);
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', NEW_REFRESH_TOKEN);
  });

  it('should_RestoreOfflineUserAndKeepTokens_When_RefreshHasNoResponse', async () => {
    mockedSecureStore.getItemAsync.mockImplementation((key) => {
      if (key === 'accessToken') return Promise.resolve(MOCK_ACCESS_TOKEN);
      if (key === 'refreshToken') return Promise.resolve(MOCK_REFRESH_TOKEN);
      return Promise.resolve(null);
    });
    mockedJwtDecode.mockReturnValue(EXPIRED_JWT_PAYLOAD as never);
    mockedAuthEndpoints.refresh.mockRejectedValue(new Error('Network Error'));
    mockedIsRefreshTokenRejected.mockReturnValue(false);
    mockedAsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'spoonrest.userEmail') return Promise.resolve('test@example.com');
      if (key === 'spoonrest.userFirstName') return Promise.resolve('Jean');
      if (key === 'spoonrest.onboardingCompleted.user-123') return Promise.resolve('true');
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user?.id).toBe('user-123');
    expect(result.current.sessionExpired).toBe(false);
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(mockedCacheManager.clearAll).not.toHaveBeenCalled();
  });

  it('should_ExpireSessionAndPurgeData_When_RefreshTokenIsRejected', async () => {
    mockedSecureStore.getItemAsync.mockImplementation((key) => {
      if (key === 'accessToken') return Promise.resolve(MOCK_ACCESS_TOKEN);
      if (key === 'refreshToken') return Promise.resolve(MOCK_REFRESH_TOKEN);
      return Promise.resolve(null);
    });
    mockedJwtDecode.mockReturnValue(EXPIRED_JWT_PAYLOAD as never);
    mockedAuthEndpoints.refresh.mockRejectedValue(new Error('401'));
    mockedIsRefreshTokenRejected.mockReturnValue(true);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.sessionExpired).toBe(true);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
    expect(mockedCacheManager.clearAll).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 4. Login flow
  // -------------------------------------------------------------------------

  it('should_StoreTokensAndSetUser_When_LoginSuccessful', async () => {
    // Arrange
    mockedAuthEndpoints.login.mockResolvedValue(MOCK_AUTH_RESPONSE as never);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);
    mockedAsyncStorage.getItem.mockResolvedValue('true');

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
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

  // M4: onboarding state is read from the user-scoped key, so another account's
  // completed flag on the same device does not let this user skip onboarding.
  it('should_RequireOnboarding_When_ScopedKeyMissingForThisUser', async () => {
    // Arrange — a *different* user's flag exists, but not this user's scoped key
    mockedAuthEndpoints.login.mockResolvedValue(MOCK_AUTH_RESPONSE as never);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);
    mockedAsyncStorage.getItem.mockImplementation((key) =>
      key === 'spoonrest.onboardingCompleted.someone-else'
        ? Promise.resolve('true')
        : Promise.resolve(null),
    );

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    // Assert — this user (user-123) has no scoped flag → must onboard
    expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith('spoonrest.onboardingCompleted.user-123');
    expect(result.current.hasCompletedOnboarding).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 5. Logout flow
  // -------------------------------------------------------------------------

  it('should_RemoveTokensAndClearUser_When_LogoutCalled', async () => {
    // Arrange: start with a logged-in user
    mockedSecureStore.getItemAsync.mockResolvedValue(MOCK_ACCESS_TOKEN);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);
    mockedAsyncStorage.getItem.mockResolvedValue('true');

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).not.toBeNull();

    // Act
    await act(async () => {
      await result.current.logout();
    });

    // Assert
    // Server-side refresh-token revocation is attempted before the local purge.
    expect(mockedAuthEndpoints.logout).toHaveBeenCalledTimes(1);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
    // M4: the per-user onboarding flag must survive logout (no removal).
    expect(mockedAsyncStorage.removeItem).not.toHaveBeenCalledWith(
      expect.stringContaining('spoonrest.onboardingCompleted'),
    );
    expect(mockedCacheManager.clearAll).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.sessionExpired).toBe(false);
  });

  // Shared aidant/aidé device: local credentials must be wiped even when the
  // server logout call fails (offline, expired session, server error).
  it('should_PurgeLocalTokensAndClearUser_When_LogoutEndpointFails', async () => {
    // Arrange: start with a logged-in user, but the server call rejects
    mockedSecureStore.getItemAsync.mockResolvedValue(MOCK_ACCESS_TOKEN);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);
    mockedAsyncStorage.getItem.mockResolvedValue('true');
    mockedAuthEndpoints.logout.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).not.toBeNull();

    // Act — should not throw despite the rejected endpoint
    await act(async () => {
      await result.current.logout();
    });

    // Assert — local purge happened regardless of the failed server call
    expect(mockedAuthEndpoints.logout).toHaveBeenCalledTimes(1);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
    expect(mockedCacheManager.clearAll).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });

  it('should_NotExposePreviousUsersQueryData_When_AnotherAccountLogsIn', async () => {
    // Arrange: restore account A and put private data in the in-memory cache.
    mockedSecureStore.getItemAsync.mockResolvedValue(MOCK_ACCESS_TOKEN);
    mockedJwtDecode.mockReturnValue({ ...MOCK_JWT_PAYLOAD, sub: 'user-a' } as never);
    mockedAsyncStorage.getItem.mockResolvedValue('true');

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe('user-a'));

    testQueryClient.setQueryData(['tasks', 'user-a'], [{ id: 'private-task-a' }]);
    expect(testQueryClient.getQueryData(['tasks', 'user-a'])).toBeDefined();

    mockedAuthEndpoints.login.mockResolvedValue({
      data: {
        status: 'success' as const,
        data: {
          accessToken: 'access-token-b',
          refreshToken: 'refresh-token-b',
          userId: 'user-b',
          firstName: 'Béatrice',
        },
        message: null,
      },
    } as never);

    // Act: account A logs out, then account B logs in on the same provider/device.
    await act(async () => {
      await result.current.logout();
      await result.current.login('b@example.com', 'password123');
    });

    // Assert: A's memory and persisted caches were purged before B became active.
    expect(testQueryClient.getQueryData(['tasks', 'user-a'])).toBeUndefined();
    expect(result.current.user?.id).toBe('user-b');
    expect(mockedCacheManager.clearAll).toHaveBeenCalledTimes(2);
  });

  it('should_ExpireOnlyOnceAndNotCallLogout_When_ConcurrentRequestsRejectRefresh', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(MOCK_ACCESS_TOKEN);
    mockedJwtDecode.mockReturnValue({ ...MOCK_JWT_PAYLOAD, sub: 'user-a' } as never);
    mockedAsyncStorage.getItem.mockResolvedValue('true');

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe('user-a'));

    testQueryClient.setQueryData(['energy', 'user-a', 'today'], { spoons: 2 });

    act(() => {
      mockSessionExpiredHandler?.();
      mockSessionExpiredHandler?.();
    });

    await waitFor(() => expect(result.current.user).toBeNull());
    expect(testQueryClient.getQueryData(['energy', 'user-a', 'today'])).toBeUndefined();
    expect(mockedCacheManager.clearAll).toHaveBeenCalledTimes(1);
    expect(mockedAuthEndpoints.logout).not.toHaveBeenCalled();
    expect(result.current.sessionExpired).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 6. Register flow - stores tokens and sets user
  // -------------------------------------------------------------------------

  it('should_StoreTokensAndSetUser_When_RegisterSuccessful', async () => {
    // Arrange
    mockedAuthEndpoints.register.mockResolvedValue(MOCK_AUTH_RESPONSE as never);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
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
  // 6.5. RGPD Art. 9: register sends explicit consentGiven: true
  // -------------------------------------------------------------------------

  it('should_SendConsentGivenTrue_When_RegisterCalled', async () => {
    // Arrange
    mockedAuthEndpoints.register.mockResolvedValue(MOCK_AUTH_RESPONSE as never);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await act(async () => {
      await result.current.register('test@example.com', 'password123', 'Jean');
    });

    // Assert — backend rejects registration without explicit health-data consent
    expect(mockedAuthEndpoints.register).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Jean',
      consentGiven: true,
    });
  });

  // -------------------------------------------------------------------------
  // 7. Register sets hasCompletedOnboarding=false
  // -------------------------------------------------------------------------

  it('should_SetOnboardingFalse_When_RegisterSuccessful', async () => {
    // Arrange
    mockedAuthEndpoints.register.mockResolvedValue(MOCK_AUTH_RESPONSE as never);
    mockedJwtDecode.mockReturnValue(MOCK_JWT_PAYLOAD as never);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
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

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.register('test@example.com', 'password123', 'Jean');
    });
    expect(result.current.hasCompletedOnboarding).toBe(false);

    // Act
    await act(async () => {
      await result.current.completeOnboarding();
    });

    // Assert — M4: persisted under the user-scoped key
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith('spoonrest.onboardingCompleted.user-123', 'true');
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
