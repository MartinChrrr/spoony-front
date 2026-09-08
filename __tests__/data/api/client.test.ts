import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';

import { authEndpoints } from '@/data/api/endpoints/auth';
import {
  api,
  registerSessionExpiredHandler,
  resetSessionExpiration,
} from '@/data/api/client';

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { apiBaseUrl: 'http://localhost:8080' } },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/data/api/endpoints/auth', () => ({
  authEndpoints: {
    refresh: jest.fn(),
  },
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedAuthEndpoints = authEndpoints as jest.Mocked<typeof authEndpoints>;

const OLD_ACCESS_TOKEN = 'old-access-token';
const REFRESH_TOKEN = 'valid-refresh-token';
const NEW_ACCESS_TOKEN = 'new-access-token';
const NEW_REFRESH_TOKEN = 'new-refresh-token';

const successfulRefreshResponse = {
  data: {
    status: 'success' as const,
    data: {
      accessToken: NEW_ACCESS_TOKEN,
      refreshToken: NEW_REFRESH_TOKEN,
      userId: 'user-123',
      firstName: 'Jean',
    },
    message: null,
  },
};

function responseFor(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
    headers: new AxiosHeaders(),
    config,
  };
}

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError(
    'Request failed with status code 401',
    'ERR_BAD_REQUEST',
    config,
    undefined,
    responseFor(config, 401, { status: 'fail' }),
  );
}

function rejectedRefresh(): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(
    'Refresh token rejected',
    'ERR_BAD_REQUEST',
    config,
    undefined,
    responseFor(config, 401, { status: 'fail' }),
  );
}

async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('protected API refresh interceptor', () => {
  let tokenStore: Map<string, string>;
  let onSessionExpired: jest.Mock;
  let unregisterSessionExpiredHandler: () => void;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSessionExpiration();
    tokenStore = new Map([
      ['accessToken', OLD_ACCESS_TOKEN],
      ['refreshToken', REFRESH_TOKEN],
    ]);

    mockedSecureStore.getItemAsync.mockImplementation(async (key) => tokenStore.get(key) ?? null);
    mockedSecureStore.setItemAsync.mockImplementation(async (key, value) => {
      tokenStore.set(key, value);
    });
    mockedSecureStore.deleteItemAsync.mockImplementation(async (key) => {
      tokenStore.delete(key);
    });
    mockedAuthEndpoints.refresh.mockResolvedValue(successfulRefreshResponse as never);

    onSessionExpired = jest.fn();
    unregisterSessionExpiredHandler = registerSessionExpiredHandler(onSessionExpired);
  });

  afterEach(() => {
    unregisterSessionExpiredHandler();
  });

  it('should_RefreshOnceAndRetryAllRequests_When_401sAreConcurrent', async () => {
    let resolveRefresh: ((value: typeof successfulRefreshResponse) => void) | undefined;
    mockedAuthEndpoints.refresh.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }) as never,
    );

    const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.headers.get('Authorization') !== `Bearer ${NEW_ACCESS_TOKEN}`) {
        throw unauthorized(config);
      }
      return responseFor(config, 200, { ok: true });
    });
    api.defaults.adapter = adapter;

    const resultsPromise = Promise.all([api.get('/api/tasks'), api.get('/api/energy/today')]);
    await flushPromises();

    expect(mockedAuthEndpoints.refresh).toHaveBeenCalledTimes(1);
    resolveRefresh?.(successfulRefreshResponse);

    const results = await resultsPromise;
    expect(results.map((response) => response.data)).toEqual([{ ok: true }, { ok: true }]);
    expect(adapter).toHaveBeenCalledTimes(4);
    expect(tokenStore.get('accessToken')).toBe(NEW_ACCESS_TOKEN);
    expect(tokenStore.get('refreshToken')).toBe(NEW_REFRESH_TOKEN);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('should_NotRefresh_When_AnAuthRouteReturns401', async () => {
    api.defaults.adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
      throw unauthorized(config);
    });

    await expect(api.post('/api/auth/logout')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(mockedAuthEndpoints.refresh).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('should_ExpireOnce_When_ASharedRefreshIsRejected', async () => {
    let rejectRefresh: ((error: AxiosError) => void) | undefined;
    mockedAuthEndpoints.refresh.mockReturnValue(
      new Promise((_, reject) => {
        rejectRefresh = reject;
      }) as never,
    );
    api.defaults.adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
      throw unauthorized(config);
    });

    const settledPromise = Promise.allSettled([
      api.get('/api/tasks'),
      api.get('/api/energy/today'),
    ]);
    await flushPromises();
    expect(mockedAuthEndpoints.refresh).toHaveBeenCalledTimes(1);

    rejectRefresh?.(rejectedRefresh());
    const results = await settledPromise;

    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    expect(tokenStore.size).toBe(0);
  });

  it('should_KeepSessionAndTokens_When_RefreshFailsWithoutResponse', async () => {
    mockedAuthEndpoints.refresh.mockRejectedValue(
      new AxiosError('Network Error', 'ERR_NETWORK'),
    );
    api.defaults.adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
      throw unauthorized(config);
    });

    await expect(api.get('/api/tasks')).rejects.toMatchObject({ code: 'ERR_NETWORK' });

    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(tokenStore.get('accessToken')).toBe(OLD_ACCESS_TOKEN);
    expect(tokenStore.get('refreshToken')).toBe(REFRESH_TOKEN);
  });

  it('should_StopAfterOneRefresh_When_TheRotatedAccessTokenIsAlsoRejected', async () => {
    api.defaults.adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
      throw unauthorized(config);
    });

    await expect(api.get('/api/tasks')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(mockedAuthEndpoints.refresh).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
  });
});
