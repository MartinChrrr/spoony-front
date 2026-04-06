import { api } from '../client';
import { JSendResponse } from '../types';

export interface SuggestionResponse {
  userTaskId: string;
  name: string;
  spoonCost: number;
  category: string | null;
  exceedsBudget: boolean;
}

export const suggestionEndpoints = {
  getAll: () =>
    api.get<JSendResponse<SuggestionResponse[]>>('/api/suggestions'),
};
