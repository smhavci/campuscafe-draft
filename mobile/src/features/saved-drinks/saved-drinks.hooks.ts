import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client';
import type { SavedDrink } from '@/shared/types/api';

const savedDrinkKeys = { list: ['saved-drinks'] as const };

export const useSavedDrinks = () =>
  useQuery({
    queryKey: savedDrinkKeys.list,
    queryFn: async () => (await apiClient.get<SavedDrink[]>('/saved-drinks')).data,
  });

export function useDeleteSavedDrink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/saved-drinks/${id}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: savedDrinkKeys.list }),
  });
}
