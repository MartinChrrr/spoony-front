import axios from 'axios';

import {
  energyEndpoints,
  EnergyResponse,
  DeclareEnergyRequest,
  UpdateSpoonsRequest,
  UpdateMoodRequest,
} from '../api/endpoints/energy';
import { cacheManager } from '../cache/cacheManager';
import { assertOnline } from './utils';

const CACHE_KEYS = {
  TODAY: 'energy:today',
} as const;

interface CachedEnergy {
  data: EnergyResponse;
  date: string; // ISO date string YYYY-MM-DD
}

export const energyRepository = {
  getToday: async (): Promise<EnergyResponse | null> => {
    try {
      const response = await energyEndpoints.getToday();
      const energy = response.data.data;
      if (energy !== null) {
        await cacheManager.set<CachedEnergy>(CACHE_KEYS.TODAY, {
          data: energy,
          date: new Date().toISOString().split('T')[0],
        });
      }
      return energy;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response !== undefined) {
        throw error;
      }
      const cached = await cacheManager.get<CachedEnergy>(CACHE_KEYS.TODAY);
      const today = new Date().toISOString().split('T')[0];
      if (cached && cached.date === today) {
        return cached.data;
      }
      return null;
    }
  },

  declare: async (data: DeclareEnergyRequest): Promise<EnergyResponse> => {
    await assertOnline();
    const response = await energyEndpoints.declare(data);
    return response.data.data as EnergyResponse;
  },

  updateSpoons: async (data: UpdateSpoonsRequest): Promise<EnergyResponse> => {
    await assertOnline();
    const response = await energyEndpoints.updateSpoons(data);
    return response.data.data as EnergyResponse;
  },

  updateMood: async (data: UpdateMoodRequest): Promise<EnergyResponse> => {
    await assertOnline();
    const response = await energyEndpoints.updateMood(data);
    return response.data.data as EnergyResponse;
  },
};
