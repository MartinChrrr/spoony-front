import { api } from '../client';
import { JSendResponse } from '../types';

export const userEndpoints = {
  deleteMe: () =>
    api.delete<JSendResponse<null>>('/api/users/me'),
};
