import { api } from '../client';
import { JSendResponse, Mood } from '../types';

export interface EnergyResponse {
  id: string;
  date: string;
  spoons: number;
  spoonsUsed: number;
  moodEnd: Mood | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeclareEnergyRequest {
  spoons: number;
}

export interface UpdateSpoonsRequest {
  spoons: number;
}

export interface UpdateMoodRequest {
  moodEnd: Mood;
}

export const energyEndpoints = {
  getToday: () =>
    api.get<JSendResponse<EnergyResponse>>('/api/energy/today'),

  declare: (data: DeclareEnergyRequest) =>
    api.post<JSendResponse<EnergyResponse>>('/api/energy', data),

  updateSpoons: (data: UpdateSpoonsRequest) =>
    api.put<JSendResponse<EnergyResponse>>('/api/energy/today', data),

  updateMood: (data: UpdateMoodRequest) =>
    api.patch<JSendResponse<EnergyResponse>>('/api/energy/today/mood', data),
};
