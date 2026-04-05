import { api } from '../client';
import { JSendResponse, TaskLogStatus } from '../types';

export interface TaskLogResponse {
  id: string;
  userTaskId: string;
  date: string;
  status: TaskLogStatus;
  suggested: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskLogsRequest {
  userTaskIds: string[];
}

export interface UpdateTaskLogStatusRequest {
  status: TaskLogStatus;
}

export interface BulkPostponeRequest {
  targetDate?: string;
}

export interface BulkPostponeResponse {
  postponedCount: number;
  newDate: string;
}

export const taskLogEndpoints = {
  getAll: (includeArchived?: boolean) =>
    api.get<JSendResponse<TaskLogResponse[]>>('/api/task-logs', {
      params: includeArchived !== undefined ? { include_archived: includeArchived } : undefined,
    }),

  create: (data: CreateTaskLogsRequest) =>
    api.post<JSendResponse<TaskLogResponse[]>>('/api/task-logs', data),

  createManual: (userTaskId: string) =>
    api.post<JSendResponse<TaskLogResponse>>(`/api/task-logs/manual`, { userTaskId }),

  updateStatus: (id: string, data: UpdateTaskLogStatusRequest) =>
    api.patch<JSendResponse<TaskLogResponse>>(`/api/task-logs/${id}/status`, data),

  bulkPostpone: (data?: BulkPostponeRequest) =>
    api.post<JSendResponse<BulkPostponeResponse>>('/api/task-logs/bulk-postpone', data ?? {}),
};
