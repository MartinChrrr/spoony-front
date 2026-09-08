import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache:';
const CACHE_VERSION = 'v2';
const USER_CACHE_PREFIX = `${CACHE_PREFIX}${CACHE_VERSION}:user:`;

function userCacheKey(userId: string, key: string): string {
  if (userId.trim() === '') {
    throw new Error('[cacheManager] A userId is required for user data');
  }

  return `${USER_CACHE_PREFIX}${encodeURIComponent(userId)}:${key}`;
}

export const cacheManager = {
  getForUser: async <T>(userId: string, key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(userCacheKey(userId, key));
      if (raw === null) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[cacheManager] Failed to get user key "${key}":`, error);
      return null;
    }
  },

  setForUser: async <T>(userId: string, key: string, value: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(userCacheKey(userId, key), JSON.stringify(value));
    } catch (error) {
      console.error(`[cacheManager] Failed to set user key "${key}":`, error);
    }
  },

  removeForUser: async (userId: string, key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(userCacheKey(userId, key));
    } catch (error) {
      console.error(`[cacheManager] Failed to remove user key "${key}":`, error);
    }
  },

  clearUser: async (userId: string): Promise<void> => {
    try {
      const prefix = `${USER_CACHE_PREFIX}${encodeURIComponent(userId)}:`;
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) => key.startsWith(prefix));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('[cacheManager] clearUser failed:', error);
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('[cacheManager] clearAll failed:', error);
    }
  },

  /**
   * Remove values written by versions that did not scope health-related data
   * by account. This migration deliberately leaves the new user namespaces.
   */
  clearLegacy: async (): Promise<void> => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const legacyKeys = allKeys.filter(
        (key) => key.startsWith(CACHE_PREFIX) && !key.startsWith(USER_CACHE_PREFIX),
      );
      if (legacyKeys.length > 0) {
        await AsyncStorage.multiRemove(legacyKeys);
      }
    } catch (error) {
      console.error('[cacheManager] clearLegacy failed:', error);
    }
  },
};
