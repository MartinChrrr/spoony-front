import axios, { AxiosInstance } from 'axios';

import { API_BASE_URL, API_TIMEOUT_MS } from './config';

/**
 * Authentication transport deliberately has no interceptors.
 *
 * In particular, a 401 returned by login, refresh or logout must never enter
 * the protected API's refresh cycle and recursively attempt another refresh.
 */
export const authApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});
