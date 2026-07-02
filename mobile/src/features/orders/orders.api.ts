import { apiClient } from '@/shared/api/client';
import type { CreateOrderInput, Order } from '@/shared/types/api';

export interface OrderTimeline {
  orderId: number;
  currentStatus: string;
  events: { status: string; timestamp: string }[];
}

export const ordersApi = {
  async create(input: CreateOrderInput): Promise<Order> {
    const { data } = await apiClient.post<Order>('/orders', input);
    return data;
  },
  async list(): Promise<Order[]> {
    const { data } = await apiClient.get<Order[]>('/orders');
    return data;
  },
  async get(id: number): Promise<Order> {
    const { data } = await apiClient.get<Order>(`/orders/${id}`);
    return data;
  },
  async timeline(id: number): Promise<OrderTimeline> {
    const { data } = await apiClient.get<OrderTimeline>(`/orders/${id}/timeline`);
    return data;
  },
  async reorder(id: number): Promise<{ message: string; orderId: number; totalAmount: number }> {
    const { data } = await apiClient.post<{ message: string; orderId: number; totalAmount: number }>(
      `/orders/reorder/${id}`,
    );
    return data;
  },
};
