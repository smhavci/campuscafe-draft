import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getSocket } from './socket';
import { showToast } from '@/shared/ui/toast';
import { ORDER_STATUS } from '@/shared/theme/tokens';
import type { OrderStatus } from '@/shared/types/api';

/**
 * Bridges Socket.IO events → React Query invalidation + toasts.
 * Rendered once at the app root; re-attaches when the auth token changes.
 */
export function RealtimeBridge() {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onStatus = (p: { orderId: number; status: OrderStatus }) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      showToast(`Sipariş #${p.orderId}: ${ORDER_STATUS[p.status]?.label ?? p.status}`, p.status === 'ready' ? 'success' : 'info');
    };
    const onStars = (p: { amount: number; total: number }) => {
      void qc.invalidateQueries({ queryKey: ['me'] });
      void qc.invalidateQueries({ queryKey: ['loyalty'] });
      showToast(`+${p.amount} yıldız kazandın! ⭐`, 'success');
    };
    const onCancel = (p: { orderId: number; itemName: string }) => {
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['wallet', 'balance'] });
      showToast(`${p.itemName} iptal edildi`, 'error');
    };
    // Cafe-owner events (only delivered to owner rooms).
    const onNewOrder = (p: { orderId: number }) => {
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      showToast(`Yeni sipariş geldi! #${p.orderId}`, 'success');
    };
    const onOrderUpdated = () => void qc.invalidateQueries({ queryKey: ['dashboard'] });

    socket.on('order_status_changed', onStatus);
    socket.on('stars_earned', onStars);
    socket.on('order_item_cancelled', onCancel);
    socket.on('new_order', onNewOrder);
    socket.on('order_updated', onOrderUpdated);
    return () => {
      socket.off('order_status_changed', onStatus);
      socket.off('stars_earned', onStars);
      socket.off('order_item_cancelled', onCancel);
      socket.off('new_order', onNewOrder);
      socket.off('order_updated', onOrderUpdated);
    };
  }, [token, qc]);

  return null;
}
