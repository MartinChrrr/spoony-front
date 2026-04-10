import { baseTaskEndpoints, BaseTaskResponse } from '../api/endpoints/baseTasks';

export const baseTaskRepository = {
  getAll: async (category?: string, locale?: string): Promise<BaseTaskResponse[]> => {
    const response = await baseTaskEndpoints.getAll(category, locale);
    return response.data.data ?? [];
  },
};
