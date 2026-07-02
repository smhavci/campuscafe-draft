import { apiClient } from '@/shared/api/client';
import type { CoffeeOption, LoyaltyCard, LoyaltyStatus, StarHistory } from '@/shared/types/api';

export const loyaltyApi = {
  async status(): Promise<LoyaltyStatus> {
    const { data } = await apiClient.get<LoyaltyStatus>('/loyalty/status');
    return data;
  },
  async cards(): Promise<LoyaltyCard[]> {
    const { data } = await apiClient.get<LoyaltyCard[]>('/loyalty');
    return data;
  },
  async history(): Promise<StarHistory[]> {
    const { data } = await apiClient.get<StarHistory[]>('/loyalty/history');
    return data;
  },
  async coffees(cafeId: number): Promise<CoffeeOption[]> {
    const { data } = await apiClient.get<CoffeeOption[]>(`/loyalty/coffees/${cafeId}`);
    return data;
  },
  async redeem(input: { cafeId: number; productId: number }): Promise<{ message: string; orderId: number }> {
    const { data } = await apiClient.post<{ message: string; orderId: number }>('/loyalty/redeem', input);
    return data;
  },
};
