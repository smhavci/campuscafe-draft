import { apiClient } from '@/shared/api/client';
import type { Analytics, DashboardOrder, OrderStatus, WeeklyPoint } from '@/shared/types/api';

export const dashboardApi = {
  async activeOrders(): Promise<DashboardOrder[]> {
    const { data } = await apiClient.get<DashboardOrder[]>('/dashboard/orders');
    return data;
  },
  async history(): Promise<{ orders: DashboardOrder[] }> {
    const { data } = await apiClient.get<{ orders: DashboardOrder[] }>('/dashboard/history', {
      params: { page: 1, limit: 30 },
    });
    return data;
  },
  async updateStatus(orderId: number, status: OrderStatus): Promise<unknown> {
    const { data } = await apiClient.patch(`/dashboard/orders/${orderId}/status`, { status });
    return data;
  },
  async cancelItem(orderId: number, itemId: number, reason: string): Promise<unknown> {
    const { data } = await apiClient.patch(`/dashboard/orders/${orderId}/items/${itemId}/cancel`, { reason });
    return data;
  },
  async analytics(): Promise<Analytics> {
    const { data } = await apiClient.get<Analytics>('/dashboard/analytics');
    return data;
  },
  async weekly(): Promise<WeeklyPoint[]> {
    const { data } = await apiClient.get<WeeklyPoint[]>('/dashboard/analytics/weekly');
    return data;
  },
};
