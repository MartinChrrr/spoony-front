import * as SecureStore from 'expo-secure-store';

import { authApi } from '@/data/api/authClient';
import { authEndpoints } from '@/data/api/endpoints/auth';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
}));

jest.mock('@/data/api/authClient', () => ({
  authApi: {
    post: jest.fn(),
  },
}));

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('authEndpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should_UseTheDedicatedAuthClient_ForPublicAuthCalls', () => {
    authEndpoints.login({ email: 'user@example.com', password: 'password' });
    authEndpoints.register({
      email: 'user@example.com',
      password: 'password',
      firstName: 'Jean',
      consentGiven: true,
    });
    authEndpoints.refresh({ refreshToken: 'refresh-token' });

    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(1, '/api/auth/login', {
      email: 'user@example.com',
      password: 'password',
    });
    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(2, '/api/auth/register', {
      email: 'user@example.com',
      password: 'password',
      firstName: 'Jean',
      consentGiven: true,
    });
    expect(mockedAuthApi.post).toHaveBeenNthCalledWith(3, '/api/auth/refresh', {
      refreshToken: 'refresh-token',
    });
  });

  it('should_AttachTheCurrentAccessTokenToLogoutWithoutARefreshInterceptor', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue('access-token');

    await authEndpoints.logout();

    expect(mockedAuthApi.post).toHaveBeenCalledWith(
      '/api/auth/logout',
      undefined,
      { headers: { Authorization: 'Bearer access-token' } },
    );
  });

  it('should_SendLogoutWithoutAuthorization_When_NoAccessTokenExists', async () => {
    mockedSecureStore.getItemAsync.mockResolvedValue(null);

    await authEndpoints.logout();

    expect(mockedAuthApi.post).toHaveBeenCalledWith(
      '/api/auth/logout',
      undefined,
      undefined,
    );
  });
});
