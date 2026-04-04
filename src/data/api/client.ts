import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

const TIMEOUT_MS = 10_000;

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface QueueEntry {
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}

type SessionExpiredHandler = () => void;

let onSessionExpired: SessionExpiredHandler | null = null;

export function registerSessionExpiredHandler(handler: SessionExpiredHandler): void {
  onSessionExpired = handler;
}

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

function processQueue(error: AxiosError | null, token: string | null): void {
  failedQueue.forEach((entry) => {
    if (error !== null) {
      entry.reject(error);
    } else if (token !== null) {
      entry.resolve(token);
    }
  });

  failedQueue = [];
}

const baseURL = Constants.expoConfig?.extra?.apiBaseUrl;

if (typeof baseURL !== 'string' || baseURL.length === 0) {
  throw new Error(
    '[api/client] apiBaseUrl is not defined. Check app.json extra.apiBaseUrl and your API_BASE_URL env variable.'
  );
}

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: TIMEOUT_MS,
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
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry === true) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.set('Authorization', `Bearer ${token}`);
            resolve(api(originalRequest));
          },
          reject: (queueError: AxiosError) => {
            reject(queueError);
          },
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      if (refreshToken === null) {
        throw new AxiosError('NO_REFRESH_TOKEN', 'ERR_NO_REFRESH_TOKEN');
      }

      const response = await axios.post<RefreshTokenResponse>(
        `${baseURL}/auth/refresh`,
        { refreshToken },
        { timeout: TIMEOUT_MS },
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

      originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);

      isRefreshing = false;
      processQueue(null, newAccessToken);

      return api(originalRequest);
    } catch (refreshError) {
      const axiosRefreshError =
        refreshError instanceof AxiosError
          ? refreshError
          : new AxiosError(
              refreshError instanceof Error ? refreshError.message : 'TOKEN_REFRESH_FAILED',
            );

      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      isRefreshing = false;
      processQueue(axiosRefreshError, null);

      onSessionExpired?.();

      return Promise.reject(axiosRefreshError);
    }
  },
);
