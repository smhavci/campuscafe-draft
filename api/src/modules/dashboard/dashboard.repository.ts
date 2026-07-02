import { Prisma, type OrderStatus } from '@prisma/client';
import { prisma } from '@/db/prisma';

const dashOrderInclude = {
  user: { select: { firstName: true, lastName: true, role: true } },
  items: {
    include: {
      product: { select: { name: true, image: true } },
      options: { select: { name: true, price: true } },
    },
  },
} satisfies Prisma.OrderInclude;

export type DashOrder = Prisma.OrderGetPayload<{ include: typeof dashOrderInclude }>;

export interface HistoryFilter {
  cafeId: number;
  status: 'all' | OrderStatus;
  dateStart?: Date;
  dateEnd?: Date;
  skip: number;
  take: number;
}

export const dashboardRepository = {
  activeOrders(cafeId: number) {
    return prisma.order.findMany({
      where: { cafeId, status: { in: ['preparing', 'ready'] } },
      include: dashOrderInclude,
      orderBy: [{ pickupTime: 'asc' }, { createdAt: 'desc' }],
    });
  },

  history(f: HistoryFilter) {
    const where: Prisma.OrderWhereInput = { cafeId: f.cafeId };
    if (f.status !== 'all') where.status = f.status;
    if (f.dateStart && f.dateEnd) where.createdAt = { gte: f.dateStart, lt: f.dateEnd };

    return prisma.$transaction([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: dashOrderInclude,
        orderBy: { createdAt: 'desc' },
        skip: f.skip,
        take: f.take,
      }),
    ]);
  },

  findOrderInCafe(orderId: number, cafeId: number) {
    return prisma.order.findFirst({ where: { id: orderId, cafeId }, select: { id: true, userId: true } });
  },

  async updateStatus(orderId: number, status: OrderStatus): Promise<void> {
    await prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { status } }),
      prisma.orderEvent.create({ data: { orderId, status } }),
    ]);
  },

  findActiveItem(orderId: number, itemId: number) {
    return prisma.orderItem.findFirst({
      where: { id: itemId, orderId, status: 'active' },
      include: { product: { select: { name: true } } },
    });
  },

  /** Cancel one item and recompute the order total from remaining active items. */
  async cancelItem(orderId: number, itemId: number, reason: string): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.update({
        where: { id: itemId },
        data: { status: 'cancelled', cancelReason: reason },
        select: { lineTotal: true },
      });

      // Refund wallet-paid orders by the cancelled item's amount.
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { userId: true, paymentMethod: true },
      });
      if (order?.paymentMethod === 'wallet') {
        await tx.userWallet.update({
          where: { userId: order.userId },
          data: { balance: { increment: item.lineTotal } },
        });
      }
      // NOTE: star-paid orders aren't auto-refunded here — per-item star cost
      // isn't tracked; handle separately if star redemptions become cancellable.

      const agg = await tx.orderItem.aggregate({
        where: { orderId, status: 'active' },
        _sum: { lineTotal: true },
      });
      const newTotal = Number(agg._sum.lineTotal ?? 0);
      await tx.order.update({ where: { id: orderId }, data: { totalAmount: newTotal } });
      return newTotal;
    });
  },

  notificationsCount(cafeId: number, since: Date) {
    return prisma.order.count({
      where: { cafeId, createdAt: { gt: since }, status: { in: ['preparing', 'ready'] } },
    });
  },

  // ── Analytics (raw SQL for date grouping; container runs UTC) ──────────
  dailySummary(cafeId: number, start: Date, end: Date) {
    return prisma.$queryRaw<{ orderCount: number; totalRevenue: number }[]>`
      SELECT COUNT(*)::int AS "orderCount",
             COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0)::float AS "totalRevenue"
      FROM orders
      WHERE cafe_id = ${cafeId} AND created_at >= ${start} AND created_at < ${end} AND status <> 'cancelled'`;
  },

  byStatus(cafeId: number, start: Date, end: Date) {
    return prisma.$queryRaw<{ status: string; count: number }[]>`
      SELECT status::text AS status, COUNT(*)::int AS count
      FROM orders
      WHERE cafe_id = ${cafeId} AND created_at >= ${start} AND created_at < ${end} AND status <> 'cancelled'
      GROUP BY status`;
  },

  topProducts(cafeId: number, start: Date, end: Date) {
    return prisma.$queryRaw<{ name: string; totalQty: number; totalSales: number }[]>`
      SELECT p.name AS name, SUM(oi.quantity)::int AS "totalQty", SUM(oi.line_total)::float AS "totalSales"
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.cafe_id = ${cafeId} AND o.created_at >= ${start} AND o.created_at < ${end}
        AND o.status = 'delivered' AND oi.status = 'active'
      GROUP BY p.id, p.name
      ORDER BY "totalQty" DESC
      LIMIT 5`;
  },

  weekly(cafeId: number, start: Date) {
    return prisma.$queryRaw<{ date: string; orderCount: number; revenue: number }[]>`
      SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS "orderCount",
             COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0)::float AS revenue
      FROM orders
      WHERE cafe_id = ${cafeId} AND created_at >= ${start} AND status <> 'cancelled'
      GROUP BY created_at::date
      ORDER BY created_at::date`;
  },

  hourly(cafeId: number, start: Date, end: Date) {
    return prisma.$queryRaw<{ hour: number; count: number }[]>`
      SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count
      FROM orders
      WHERE cafe_id = ${cafeId} AND created_at >= ${start} AND created_at < ${end} AND status <> 'cancelled'
      GROUP BY hour ORDER BY hour`;
  },

  customers(cafeId: number) {
    return prisma.$queryRaw<
      { role: string; customerCount: number; orderCount: number; totalSpent: number }[]
    >`
      SELECT u.role::text AS role,
             COUNT(DISTINCT o.user_id)::int AS "customerCount",
             COUNT(o.id)::int AS "orderCount",
             COALESCE(SUM(o.total_amount), 0)::float AS "totalSpent"
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.cafe_id = ${cafeId} AND o.status <> 'cancelled'
      GROUP BY u.role`;
  },
};
