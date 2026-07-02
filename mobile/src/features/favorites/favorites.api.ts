import { apiClient } from '@/shared/api/client';
import type { Favorite } from '@/shared/types/api';

export const favoritesApi = {
  async ids(): Promise<number[]> {
    const { data } = await apiClient.get<number[]>('/favorites/ids');
    return data;
  },
  async list(): Promise<Favorite[]> {
    const { data } = await apiClient.get<Favorite[]>('/favorites');
    return data;
  },
  async toggle(productId: number): Promise<{ action: 'added' | 'removed'; productId: number }> {
    const { data } = await apiClient.post<{ action: 'added' | 'removed'; productId: number }>(
      `/favorites/${productId}`,
    );
    return data;
  },
};
