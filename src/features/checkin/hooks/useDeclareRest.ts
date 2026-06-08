import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  energyEndpoints,
  DeclareEnergyRequest,
  UpdateSpoonsRequest,
  EnergyResponse,
} from '@/data/api/endpoints/energy';
import { energyRepository } from '@/data/repositories/energyRepository';

/**
 * Hook partagé entre step1 et step2 pour déclarer/réviser l'énergie.
 *
 * - Détecte automatiquement si une énergie existe déjà aujourd'hui (POST vs PUT).
 * - Invalide ['energy','today'] ET ['task-logs'] après succès.
 *
 * Expose :
 *  - `declareRest()` — appelle l'API à spoons=0 (journée de repos)
 *  - `declareEnergy(spoons)` — appelle l'API avec la valeur donnée (step2 générique)
 *  - `isPending` — true pendant l'appel réseau
 *  - `hasEnergyToday` — booléen exposé pour que step2 puisse adapter son label si besoin
 */
export function useDeclareRest(): {
  declareRest: () => Promise<void>;
  declareEnergy: (spoons: number) => Promise<void>;
  isPending: boolean;
  hasEnergyToday: boolean;
} {
  const queryClient = useQueryClient();

  const { data: todayEnergy } = useQuery<EnergyResponse | null>({
    queryKey: ['energy', 'today'],
    queryFn: () => energyRepository.getToday(),
  });

  const hasEnergyToday = todayEnergy != null;

  function invalidateQueries() {
    queryClient.invalidateQueries({ queryKey: ['energy', 'today'] });
    queryClient.invalidateQueries({ queryKey: ['task-logs'] });
  }

  const { mutateAsync: createEnergy, isPending: isDeclaring } = useMutation<
    unknown,
    Error,
    DeclareEnergyRequest
  >({
    mutationFn: (data) => energyEndpoints.declare(data),
    onSuccess: invalidateQueries,
  });

  const { mutateAsync: reviseEnergy, isPending: isRevising } = useMutation<
    unknown,
    Error,
    UpdateSpoonsRequest
  >({
    mutationFn: (data) => energyEndpoints.updateSpoons(data),
    onSuccess: invalidateQueries,
  });

  const isPending = isDeclaring || isRevising;

  async function declareEnergy(spoons: number): Promise<void> {
    if (hasEnergyToday) {
      await reviseEnergy({ spoons });
    } else {
      await createEnergy({ spoons });
    }
  }

  async function declareRest(): Promise<void> {
    await declareEnergy(0);
  }

  return { declareRest, declareEnergy, isPending, hasEnergyToday };
}
