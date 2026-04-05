import axios from 'axios';

import {
  taskLogEndpoints,
  TaskLogResponse,
  CreateTaskLogsRequest,
  UpdateTaskLogStatusRequest,
  BulkPostponeRequest,
  BulkPostponeResponse,
} from '../api/endpoints/taskLogs';
import { cacheManager } from '../cache/cacheManager';
import { assertOnline } from './utils';

const CACHE_KEYS = {
  ALL: 'task-logs:all',
  ALL_ARCHIVED: 'task-logs:all:archived',
} as const;

export const taskLogRepository = {
  getAll: async (includeArchived?: boolean): Promise<TaskLogResponse[]> => {
    const cacheKey = includeArchived ? CACHE_KEYS.ALL_ARCHIVED : CACHE_KEYS.ALL;
    try {
      const response = await taskLogEndpoints.getAll(includeArchived);
      const logs = response.data.data ?? [];
      await cacheManager.set(cacheKey, logs);
      return logs;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response !== undefined) {
        throw error;
      }
      const cached = await cacheManager.get<TaskLogResponse[]>(cacheKey);
      return cached ?? [];
    }
  },

  create: async (data: CreateTaskLogsRequest): Promise<TaskLogResponse[]> => {
    await assertOnline();
    const response = await taskLogEndpoints.create(data);
    return response.data.data ?? [];
  },

  createManual: async (userTaskId: string): Promise<TaskLogResponse> => {
    await assertOnline();
    const response = await taskLogEndpoints.createManual(userTaskId);
    return response.data.data as TaskLogResponse;
  },

  updateStatus: async (
    id: string,
    data: UpdateTaskLogStatusRequest,
  ): Promise<TaskLogResponse> => {
    await assertOnline();
    const response = await taskLogEndpoints.updateStatus(id, data);
    return response.data.data as TaskLogResponse;
  },

  bulkPostpone: async (data?: BulkPostponeRequest): Promise<BulkPostponeResponse> => {
    await assertOnline();
    const response = await taskLogEndpoints.bulkPostpone(data);
    return response.data.data as BulkPostponeResponse;
  },
};
