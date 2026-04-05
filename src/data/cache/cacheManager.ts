import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache:';

export const cacheManager = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (raw === null) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[cacheManager] Failed to get key "${key}":`, error);
      return null;
    }
  },

  set: async <T>(key: string, value: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`[cacheManager] Failed to set key "${key}":`, error);
    }
  },

  remove: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error(`[cacheManager] Failed to remove key "${key}":`, error);
    }
  },

  clear: async (): Promise<void> => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('[cacheManager] clear failed:', error);
    }
  },
};
