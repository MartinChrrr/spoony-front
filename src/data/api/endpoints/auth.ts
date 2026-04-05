import { api } from '../client';
import { JSendResponse } from '../types';

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
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
    api.post<JSendResponse<AuthResponse>>('/api/auth/register', data),

  login: (data: LoginRequest) =>
    api.post<JSendResponse<AuthResponse>>('/api/auth/login', data),

  refresh: (data: RefreshRequest) =>
    api.post<JSendResponse<AuthResponse>>('/api/auth/refresh', data),
};
