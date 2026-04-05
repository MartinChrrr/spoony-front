import { api } from '../client';
import { JSendResponse, Importance } from '../types';

export interface BaseTaskResponse {
  id: string;
  key: string;
  spoonCost: number;
  importance: Importance;
  category: string;
}

export const baseTaskEndpoints = {
  getAll: (category?: string, locale?: string) =>
    api.get<JSendResponse<BaseTaskResponse[]>>('/api/base-tasks', {
      params: {
        ...(category !== undefined && { category }),
        ...(locale !== undefined && { locale }),
      },
    }),
};
