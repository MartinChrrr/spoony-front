import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';

import { authEndpoints } from './endpoints/auth';
import { API_BASE_URL, API_TIMEOUT_MS } from './config';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

type SessionExpiredHandler = () => void | Promise<void>;
type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

class MissingRefreshTokenError extends Error {
  constructor() {
    super('NO_REFRESH_TOKEN');
    this.name = 'MissingRefreshTokenError';
  }
}

class InvalidRefreshResponseError extends Error {
  constructor() {
    super('INVALID_REFRESH_RESPONSE');
    this.name = 'InvalidRefreshResponseError';
  }
}

let onSessionExpired: SessionExpiredHandler | null = null;
let refreshPromise: Promise<string> | null = null;
let sessionExpirationNotified = false;
let sessionExpirationPromise: Promise<void> | null = null;

/** Register the single app-level transition to an expired session. */
export function registerSessionExpiredHandler(handler: SessionExpiredHandler): () => void {
  onSessionExpired = handler;

  return () => {
    if (onSessionExpired === handler) {
      onSessionExpired = null;
    }
  };
}

/** A successful login/register/refresh starts a fresh expiration lifecycle. */
export function resetSessionExpiration(): void {
  sessionExpirationNotified = false;
  sessionExpirationPromise = null;
}

/**
 * The backend documents 401 for a rejected refresh token. 400/403 are also
 * definitive credential failures; network errors, timeouts, 429 and 5xx are
 * transient and must preserve the local session for offline use.
 */
export function isRefreshTokenRejected(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 400 || status === 401 || status === 403;
}

function isAuthenticationRoute(url: string | undefined): boolean {
  return typeof url === 'string' && url.split('?')[0].includes('/api/auth/');
}

function isDefinitiveRefreshFailure(error: unknown): boolean {
  return (
    error instanceof MissingRefreshTokenError ||
    error instanceof InvalidRefreshResponseError ||
    isRefreshTokenRejected(error)
  );
}

function asAxiosError(error: unknown): AxiosError {
  if (axios.isAxiosError(error)) return error;

  const wrapped = new AxiosError(
    error instanceof Error ? error.message : 'TOKEN_REFRESH_FAILED',
    'ERR_REFRESH_FAILED',
  );
  (wrapped as { cause?: unknown }).cause = error;
  return wrapped;
}

/**
 * Delete credentials and notify React exactly once, even when several API
 * requests all observe the same rejected refresh concurrently.
 */
async function expireSessionOnce(): Promise<void> {
  if (sessionExpirationNotified) {
    await sessionExpirationPromise;
    return;
  }

  sessionExpirationNotified = true;
  sessionExpirationPromise = (async () => {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
    await onSessionExpired?.();
  })();

  await sessionExpirationPromise;
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

  if (refreshToken === null) {
    throw new MissingRefreshTokenError();
  }

  const response = await authEndpoints.refresh({ refreshToken });
  const tokens = response.data.data;

  if (
    tokens === null ||
    typeof tokens.accessToken !== 'string' ||
    tokens.accessToken.length === 0 ||
    typeof tokens.refreshToken !== 'string' ||
    tokens.refreshToken.length === 0
  ) {
    throw new InvalidRefreshResponseError();
  }

  await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  resetSessionExpiration();

  return tokens.accessToken;
}

/** All 401s raised together await the same rotating refresh token request. */
function getRefreshedAccessToken(): Promise<string> {
  if (refreshPromise === null) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);

    if (accessToken !== null) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;

    if (
      originalRequest === undefined ||
      error.response?.status !== 401 ||
      isAuthenticationRoute(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    // A freshly rotated access token was rejected too: stop here rather than
    // entering a second refresh cycle.
    if (originalRequest._retry === true) {
      await expireSessionOnce();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await getRefreshedAccessToken();
      originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
      return api(originalRequest);
    } catch (refreshError) {
      if (isDefinitiveRefreshFailure(refreshError)) {
        await expireSessionOnce();
      }

      // A transient refresh failure deliberately leaves both tokens intact.
      // Repositories receive the network error and can serve the current user's
      // isolated offline cache instead of forcing a logout.
      return Promise.reject(asAxiosError(refreshError));
    }
  },
);
