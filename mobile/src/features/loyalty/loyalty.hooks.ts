import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loyaltyApi } from './loyalty.api';

export const loyaltyKeys = {
  status: ['loyalty', 'status'] as const,
  cards: ['loyalty', 'cards'] as const,
  history: ['loyalty', 'history'] as const,
  coffees: (cafeId: number) => ['loyalty', 'coffees', cafeId] as const,
};

export const useLoyaltyStatus = () => useQuery({ queryKey: loyaltyKeys.status, queryFn: loyaltyApi.status });
export const useLoyaltyCards = () => useQuery({ queryKey: loyaltyKeys.cards, queryFn: loyaltyApi.cards });
export const useStarHistory = () => useQuery({ queryKey: loyaltyKeys.history, queryFn: loyaltyApi.history });
export const useCafeCoffees = (cafeId: number) =>
  useQuery({ queryKey: loyaltyKeys.coffees(cafeId), queryFn: () => loyaltyApi.coffees(cafeId), enabled: cafeId > 0 });

export function useRedeem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { cafeId: number; productId: number }) => loyaltyApi.redeem(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['loyalty'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
