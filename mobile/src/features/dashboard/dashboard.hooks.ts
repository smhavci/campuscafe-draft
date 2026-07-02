import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from './dashboard.api';
import type { OrderStatus } from '@/shared/types/api';

export const dashboardKeys = {
  active: ['dashboard', 'orders'] as const,
  history: ['dashboard', 'history'] as const,
  analytics: ['dashboard', 'analytics'] as const,
  weekly: ['dashboard', 'weekly'] as const,
};

export const useActiveOrders = () => useQuery({ queryKey: dashboardKeys.active, queryFn: dashboardApi.activeOrders });
export const useOrderHistory = () => useQuery({ queryKey: dashboardKeys.history, queryFn: dashboardApi.history });
export const useAnalytics = () => useQuery({ queryKey: dashboardKeys.analytics, queryFn: dashboardApi.analytics });
export const useWeekly = () => useQuery({ queryKey: dashboardKeys.weekly, queryFn: dashboardApi.weekly });

function useDashboardInvalidate() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useUpdateOrderStatus() {
  const invalidate = useDashboardInvalidate();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: OrderStatus }) =>
      dashboardApi.updateStatus(orderId, status),
    onSuccess: invalidate,
  });
}

export function useCancelItem() {
  const invalidate = useDashboardInvalidate();
  return useMutation({
    mutationFn: ({ orderId, itemId, reason }: { orderId: number; itemId: number; reason: string }) =>
      dashboardApi.cancelItem(orderId, itemId, reason),
    onSuccess: invalidate,
  });
}
