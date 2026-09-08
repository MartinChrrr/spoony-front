import Constants from 'expo-constants';

export const API_TIMEOUT_MS = 10_000;

const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl;

if (typeof configuredBaseUrl !== 'string' || configuredBaseUrl.length === 0) {
  throw new Error(
    '[api/config] apiBaseUrl is not defined. Check app.config.ts extra.apiBaseUrl and your API_BASE_URL env variable.',
  );
}

export const API_BASE_URL = configuredBaseUrl;
