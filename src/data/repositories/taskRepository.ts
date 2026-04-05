import axios from 'axios';

import {
  taskEndpoints,
  TaskResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  CreateFromCatalogRequest,
} from '../api/endpoints/tasks';
import { cacheManager } from '../cache/cacheManager';
import { assertOnline } from './utils';

const CACHE_KEYS = {
  ALL: 'tasks:all',
} as const;

export const taskRepository = {
  getAll: async (): Promise<TaskResponse[]> => {
    try {
      const response = await taskEndpoints.getAll();
      const tasks = response.data.data ?? [];
      await cacheManager.set(CACHE_KEYS.ALL, tasks);
      return tasks;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response !== undefined) {
        throw error;
      }
      const cached = await cacheManager.get<TaskResponse[]>(CACHE_KEYS.ALL);
      return cached ?? [];
    }
  },

  getById: async (id: string): Promise<TaskResponse> => {
    try {
      const response = await taskEndpoints.getById(id);
      return response.data.data as TaskResponse;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response !== undefined) {
        throw error;
      }
      const cached = await cacheManager.get<TaskResponse[]>(CACHE_KEYS.ALL);
      const found = cached?.find((t) => t.id === id);
      if (found) return found;
      throw error;
    }
  },

  create: async (data: CreateTaskRequest): Promise<TaskResponse> => {
    await assertOnline();
    const response = await taskEndpoints.create(data);
    return response.data.data as TaskResponse;
  },

  update: async (id: string, data: UpdateTaskRequest): Promise<TaskResponse> => {
    await assertOnline();
    const response = await taskEndpoints.update(id, data);
    return response.data.data as TaskResponse;
  },

  remove: async (id: string): Promise<void> => {
    await assertOnline();
    await taskEndpoints.remove(id);
  },

  fromCatalog: async (data: CreateFromCatalogRequest): Promise<TaskResponse[]> => {
    await assertOnline();
    const response = await taskEndpoints.fromCatalog(data);
    return response.data.data ?? [];
  },
};
