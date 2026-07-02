import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from './orders.api';
import type { CreateOrderInput } from '@/shared/types/api';

export const orderKeys = {
  list: ['orders'] as const,
  detail: (id: number) => ['orders', id] as const,
  timeline: (id: number) => ['orders', id, 'timeline'] as const,
};

export const useOrders = () => useQuery({ queryKey: orderKeys.list, queryFn: ordersApi.list });

export const useOrder = (id: number) =>
  useQuery({ queryKey: orderKeys.detail(id), queryFn: () => ordersApi.get(id), enabled: id > 0 });

export const useOrderTimeline = (id: number) =>
  useQuery({ queryKey: orderKeys.timeline(id), queryFn: () => ordersApi.timeline(id), enabled: id > 0 });

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => ordersApi.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.list });
    },
  });
}

export function useReorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ordersApi.reorder(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: orderKeys.list });
    },
  });
}
