import { apiClient } from '@/shared/api/client';

export const walletApi = {
  async balance(): Promise<{ balance: number }> {
    const { data } = await apiClient.get<{ balance: number }>('/wallet');
    return data;
  },
  async topUp(amount: number): Promise<{ message: string; balance: number }> {
    const { data } = await apiClient.post<{ message: string; balance: number }>('/wallet/topup', { amount });
    return data;
  },
};
