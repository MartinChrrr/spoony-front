import { api } from '../client';
import { JSendResponse, Importance, TaskStatus } from '../types';

export interface TaskResponse {
  id: string;
  name: string;
  spoonCost: number;
  importance: Importance;
  category: string | null;
  dueDate: string;
  notes: string | null;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  name: string;
  spoonCost?: number;
  importance?: Importance;
  category?: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateTaskRequest {
  name?: string;
  spoonCost?: number;
  importance?: Importance;
  category?: string;
  dueDate?: string;
  notes?: string;
  status?: TaskStatus;
}

export interface CreateFromCatalogRequest {
  tasks: Array<{ baseTaskId: string; name?: string }>;
}

export const taskEndpoints = {
  getAll: () =>
    api.get<JSendResponse<TaskResponse[]>>('/api/tasks'),

  getById: (id: string) =>
    api.get<JSendResponse<TaskResponse>>(`/api/tasks/${id}`),

  create: (data: CreateTaskRequest) =>
    api.post<JSendResponse<TaskResponse>>('/api/tasks', data),

  update: (id: string, data: UpdateTaskRequest) =>
    api.put<JSendResponse<TaskResponse>>(`/api/tasks/${id}`, data),

  remove: (id: string) =>
    api.delete<JSendResponse<null>>(`/api/tasks/${id}`),

  fromCatalog: (data: CreateFromCatalogRequest) =>
    api.post<JSendResponse<TaskResponse[]>>('/api/tasks/from-catalog', data),
};
