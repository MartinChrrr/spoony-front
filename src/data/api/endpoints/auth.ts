import * as SecureStore from 'expo-secure-store';

import { authApi } from '../authClient';
import { JSendResponse } from '../types';

const ACCESS_TOKEN_KEY = 'accessToken';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  // RGPD Art. 9 — explicit consent to processing of health/energy data.
  // Backend rejects registration if absent or false.
  consentGiven: boolean;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  firstName: string;
}

export const authEndpoints = {
  register: (data: RegisterRequest) =>
    authApi.post<JSendResponse<AuthResponse>>('/api/auth/register', data),

  login: (data: LoginRequest) =>
    authApi.post<JSendResponse<AuthResponse>>('/api/auth/login', data),

  refresh: (data: RefreshRequest) =>
    authApi.post<JSendResponse<AuthResponse>>('/api/auth/refresh', data),

  // Revokes the refresh token server-side. Authenticated via the access token
  // (attached by the request interceptor). Backend replies 204 No Content.
  // The access token stays valid until expiry (stateless JWT), so the caller
  // MUST purge local tokens after this call.
  logout: async () => {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    return authApi.post<void>(
      '/api/auth/logout',
      undefined,
      accessToken === null
        ? undefined
        : { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  },
};
