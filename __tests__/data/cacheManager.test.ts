import AsyncStorage from '@react-native-async-storage/async-storage';

import { cacheManager } from '@/data/cache/cacheManager';

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStore.delete(key);
    }),
    getAllKeys: jest.fn(async () => [...mockStore.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((key) => mockStore.delete(key));
    }),
  },
}));

describe('cacheManager account isolation', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it('stores the same logical key separately for two users', async () => {
    await cacheManager.setForUser('user-a', 'tasks:all', [{ id: 'task-a' }]);
    await cacheManager.setForUser('user-b', 'tasks:all', [{ id: 'task-b' }]);

    await expect(cacheManager.getForUser('user-a', 'tasks:all')).resolves.toEqual([
      { id: 'task-a' },
    ]);
    await expect(cacheManager.getForUser('user-b', 'tasks:all')).resolves.toEqual([
      { id: 'task-b' },
    ]);
    expect(mockStore.has('cache:v2:user:user-a:tasks:all')).toBe(true);
    expect(mockStore.has('cache:v2:user:user-b:tasks:all')).toBe(true);
  });

  it('clears only the requested user namespace', async () => {
    await cacheManager.setForUser('user-a', 'energy:today', { spoons: 3 });
    await cacheManager.setForUser('user-b', 'energy:today', { spoons: 8 });

    await cacheManager.clearUser('user-a');

    await expect(cacheManager.getForUser('user-a', 'energy:today')).resolves.toBeNull();
    await expect(cacheManager.getForUser('user-b', 'energy:today')).resolves.toEqual({
      spoons: 8,
    });
  });

  it('removes unsafe legacy cache keys without touching scoped or unrelated data', async () => {
    await AsyncStorage.setItem('cache:tasks:all', JSON.stringify([{ id: 'legacy-task' }]));
    await AsyncStorage.setItem('cache:v2:user:user-a:tasks:all', JSON.stringify([{ id: 'task-a' }]));
    await AsyncStorage.setItem('spoonrest.onboardingCompleted.user-a', 'true');

    await cacheManager.clearLegacy();

    expect(mockStore.has('cache:tasks:all')).toBe(false);
    expect(mockStore.has('cache:v2:user:user-a:tasks:all')).toBe(true);
    expect(mockStore.has('spoonrest.onboardingCompleted.user-a')).toBe(true);
  });

  it('clears every cache namespace while preserving non-cache preferences', async () => {
    await cacheManager.setForUser('user-a', 'task-logs:all', [{ id: 'log-a' }]);
    await cacheManager.setForUser('user-b', 'task-logs:all', [{ id: 'log-b' }]);
    await AsyncStorage.setItem('spoonrest.onboardingCompleted.user-a', 'true');

    await cacheManager.clearAll();

    expect([...mockStore.keys()]).toEqual(['spoonrest.onboardingCompleted.user-a']);
  });
});
