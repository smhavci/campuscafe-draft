import type { Server } from 'socket.io';
import type { OrderStatus } from '@prisma/client';
import { dashboardRepository, type DashOrder } from './dashboard.repository';
import type { HistoryQuery } from './dashboard.schema';
import { NotFoundError } from '@/shared/errors';
import { num } from '@/shared/serialize';
import { notifyCafe, notifyUser } from '@/realtime/socket';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function mapDashOrder(o: DashOrder) {
  return {
    id: o.id,
    status: o.status,
    totalAmount: num(o.totalAmount),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    pickupTime: o.pickupTime,
    paymentMethod: o.paymentMethod,
    customerName: `${o.user.firstName} ${o.user.lastName}`,
    customerRole: o.user.role,
    items: o.items.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      unitPrice: num(it.unitPrice),
      lineTotal: num(it.lineTotal),
      note: it.note,
      status: it.status,
      cancelReason: it.cancelReason,
      productName: it.product.name,
      productImage: it.product.image,
      options: it.options.map((op) => ({ name: op.name, price: num(op.price) })),
    })),
  };
}

export const dashboardService = {
  async activeOrders(cafeId: number) {
    return (await dashboardRepository.activeOrders(cafeId)).map(mapDashOrder);
  },

  async history(cafeId: number, query: HistoryQuery) {
    let dateStart: Date | undefined;
    let dateEnd: Date | undefined;
    if (query.date) {
      dateStart = new Date(`${query.date}T00:00:00.000Z`);
      dateEnd = new Date(dateStart.getTime() + DAY_MS);
    }

    const [total, orders] = await dashboardRepository.history({
      cafeId,
      status: query.status,
      dateStart,
      dateEnd,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      orders: orders.map(mapDashOrder),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async updateStatus(cafeId: number, orderId: number, status: OrderStatus, io?: Server) {
    const order = await dashboardRepository.findOrderInCafe(orderId, cafeId);
    if (!order) throw new NotFoundError('Sipariş bulunamadı');

    await dashboardRepository.updateStatus(orderId, status);

    if (io) {
      notifyUser(io, order.userId, 'order_status_changed', { orderId, status });
      notifyCafe(io, cafeId, 'order_updated', { orderId, status });
    }
    return { message: 'Sipariş durumu güncellendi', orderId, status };
  },

  async cancelItem(cafeId: number, orderId: number, itemId: number, reason: string, io?: Server) {
    const order = await dashboardRepository.findOrderInCafe(orderId, cafeId);
    if (!order) throw new NotFoundError('Sipariş bulunamadı');

    const item = await dashboardRepository.findActiveItem(orderId, itemId);
    if (!item) throw new NotFoundError('Ürün bulunamadı veya zaten iptal edilmiş');

    const newTotal = await dashboardRepository.cancelItem(orderId, itemId, reason);

    if (io) {
      notifyUser(io, order.userId, 'order_item_cancelled', {
        orderId,
        itemName: item.product.name,
        refundAmount: num(item.lineTotal),
        reason,
      });
    }
    return { message: 'Ürün iptal edildi', orderId, itemId, newTotal };
  },

  async notifications(cafeId: number, since?: string) {
    const sinceDate = since ? new Date(since) : new Date('2000-01-01T00:00:00Z');
    return { count: await dashboardRepository.notificationsCount(cafeId, sinceDate) };
  },

  async analytics(cafeId: number) {
    const start = startOfToday();
    const end = new Date(start.getTime() + DAY_MS);

    const [summaryRows, byStatus, topProducts] = await Promise.all([
      dashboardRepository.dailySummary(cafeId, start, end),
      dashboardRepository.byStatus(cafeId, start, end),
      dashboardRepository.topProducts(cafeId, start, end),
    ]);

    const summary = summaryRows[0] ?? { orderCount: 0, totalRevenue: 0 };
    return {
      date: start.toISOString().slice(0, 10),
      orderCount: summary.orderCount,
      totalRevenue: summary.totalRevenue,
      byStatus,
      topProducts,
    };
  },

  async weekly(cafeId: number) {
    const start = startOfToday();
    const weekStart = new Date(start.getTime() - 6 * DAY_MS);
    const rows = await dashboardRepository.weekly(cafeId, weekStart);
    const byDate = new Map(rows.map((r) => [r.date, r]));

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart.getTime() + i * DAY_MS).toISOString().slice(0, 10);
      const row = byDate.get(date);
      return { date, orderCount: row?.orderCount ?? 0, revenue: row?.revenue ?? 0 };
    });
  },

  async hourly(cafeId: number) {
    const start = startOfToday();
    const end = new Date(start.getTime() + DAY_MS);
    const rows = await dashboardRepository.hourly(cafeId, start, end);
    const byHour = new Map(rows.map((r) => [r.hour, r.count]));
    return Array.from({ length: 24 }, (_, hour) => ({ hour, count: byHour.get(hour) ?? 0 }));
  },

  async customers(cafeId: number) {
    return dashboardRepository.customers(cafeId);
  },
};
