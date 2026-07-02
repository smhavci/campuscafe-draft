import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { walletApi } from './wallet.api';

export const walletKeys = { balance: ['wallet', 'balance'] as const };

export const useWallet = () => useQuery({ queryKey: walletKeys.balance, queryFn: walletApi.balance });

export function useTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => walletApi.topUp(amount),
    onSuccess: () => void qc.invalidateQueries({ queryKey: walletKeys.balance }),
  });
}
