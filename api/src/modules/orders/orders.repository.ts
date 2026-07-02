import { Prisma, type PaymentMethod } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { BadRequestError } from '@/shared/errors';

export interface OrderItemPlan {
  productId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note: string;
  options: { optionItemId: number; name: string; price: number }[];
}

export interface CreateOrderPlan {
  userId: number;
  cafeId: number | null;
  paymentMethod: PaymentMethod;
  pickupTime: Date | null;
  totalAmount: number;
  starsToEarn: number;
  starsToSpend: number;
  coffeeCountForStamps: number;
  items: OrderItemPlan[];
}

const orderInclude = {
  cafe: { select: { name: true } },
  items: {
    include: {
      product: { select: { name: true, image: true } },
      options: { select: { name: true, price: true } },
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export const ordersRepository = {
  productsForOrder(ids: number[]) {
    return prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, price: true, name: true, category: true, starCost: true, isAvailable: true },
    });
  },

  optionItems(ids: number[]) {
    return prisma.productOptionItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, extraPrice: true },
    });
  },

  getUserStars(userId: number) {
    return prisma.user.findUnique({ where: { id: userId }, select: { stars: true } });
  },

  getWalletBalance(userId: number) {
    return prisma.userWallet.findUnique({ where: { userId }, select: { balance: true } });
  },

  activeMultiplier(cafeId: number) {
    return prisma.campaign.findFirst({
      where: {
        cafeId,
        isActive: true,
        starMultiplier: { gt: 1 },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      orderBy: { starMultiplier: 'desc' },
      select: { starMultiplier: true },
    });
  },

  listByUser(userId: number) {
    return prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  findByIdForUser(id: number, userId: number) {
    return prisma.order.findFirst({ where: { id, userId }, include: orderInclude });
  },

  findBasicForUser(id: number, userId: number) {
    return prisma.order.findFirst({
      where: { id, userId },
      select: { id: true, cafeId: true, status: true, createdAt: true },
    });
  },

  timeline(orderId: number) {
    return prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      select: { status: true, createdAt: true },
    });
  },

  activeItemsForReorder(orderId: number) {
    return prisma.orderItem.findMany({
      where: { orderId, status: 'active' },
      include: {
        product: { select: { isAvailable: true } },
        options: { select: { optionItemId: true } },
      },
    });
  },

  countUpdatedSince(userId: number, since: Date) {
    // Orders that changed after `since` AND have actually been updated at least
    // once (updatedAt strictly after createdAt).
    return prisma.order.count({
      where: {
        userId,
        AND: [{ updatedAt: { gt: since } }, { updatedAt: { gt: prisma.order.fields.createdAt } }],
      },
    });
  },

  /** Atomically create the order and apply all payment/reward/stamp side effects. */
  async createOrder(plan: CreateOrderPlan): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: plan.userId,
          cafeId: plan.cafeId,
          status: 'preparing',
          totalAmount: plan.totalAmount,
          starsSpent: plan.starsToSpend,
          pickupTime: plan.pickupTime,
          paymentMethod: plan.paymentMethod,
        },
        select: { id: true },
      });

      if (plan.paymentMethod === 'stars') {
        // Conditional decrement guards against TOCTOU / going negative under
        // concurrent orders — only succeeds if the balance still covers it.
        const r = await tx.user.updateMany({
          where: { id: plan.userId, stars: { gte: plan.starsToSpend } },
          data: { stars: { decrement: plan.starsToSpend } },
        });
        if (r.count !== 1) throw new BadRequestError('Yetersiz yıldız bakiyesi');
      } else {
        if (plan.starsToEarn > 0) {
          await tx.user.update({
            where: { id: plan.userId },
            data: { stars: { increment: plan.starsToEarn } },
          });
        }
        if (plan.paymentMethod === 'wallet') {
          const r = await tx.userWallet.updateMany({
            where: { userId: plan.userId, balance: { gte: plan.totalAmount } },
            data: { balance: { decrement: plan.totalAmount } },
          });
          if (r.count !== 1) throw new BadRequestError('Cüzdan bakiyesi yetersiz');
        }
      }

      // Loyalty stamps — for ANY cafe (legacy bug fixed), never for star payments.
      if (plan.coffeeCountForStamps > 0 && plan.paymentMethod !== 'stars' && plan.cafeId) {
        await tx.loyaltyCard.upsert({
          where: { userId_cafeId: { userId: plan.userId, cafeId: plan.cafeId } },
          create: { userId: plan.userId, cafeId: plan.cafeId, stamps: plan.coffeeCountForStamps },
          update: { stamps: { increment: plan.coffeeCountForStamps } },
        });
      }

      for (const item of plan.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            note: item.note,
            options: {
              create: item.options.map((o) => ({
                optionItemId: o.optionItemId,
                name: o.name,
                price: o.price,
              })),
            },
          },
        });
      }

      await tx.orderEvent.create({ data: { orderId: order.id, status: 'preparing' } });

      return order.id;
    });
  },
};
