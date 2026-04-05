import { api } from '../client';
import { JSendResponse } from '../types';

export interface MessageResponse {
  id: string;
  key: string;
  context: string;
}

export const messageEndpoints = {
  getRandom: (context: string, locale?: string) =>
    api.get<JSendResponse<MessageResponse>>('/api/messages/random', {
      params: {
        context,
        ...(locale !== undefined && { locale }),
      },
    }),
};
