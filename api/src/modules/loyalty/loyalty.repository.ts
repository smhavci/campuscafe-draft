import { prisma } from '@/db/prisma';
import { LOYALTY } from '@/config/constants';
import { BadRequestError } from '@/shared/errors';

export const loyaltyRepository = {
  cards(userId: number) {
    return prisma.loyaltyCard.findMany({
      where: { userId },
      include: { cafe: { select: { id: true, name: true, slug: true, image: true, color: true } } },
    });
  },

  userStars(userId: number) {
    return prisma.user.findUnique({ where: { id: userId }, select: { stars: true } });
  },

  recentOrders(userId: number) {
    return prisma.order.findMany({
      where: { userId, status: { not: 'cancelled' } },
      include: { cafe: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  },

  coffees(cafeId: number) {
    return prisma.product.findMany({
      where: { cafeId, category: LOYALTY.STAMP_CATEGORY, isAvailable: true },
      select: { id: true, name: true, price: true, description: true, image: true },
      orderBy: { id: 'asc' },
    });
  },

  card(userId: number, cafeId: number) {
    return prisma.loyaltyCard.findUnique({ where: { userId_cafeId: { userId, cafeId } } });
  },

  coffeeProduct(productId: number, cafeId: number) {
    return prisma.product.findFirst({
      where: { id: productId, cafeId, category: LOYALTY.STAMP_CATEGORY },
      select: { id: true, name: true },
    });
  },

  /** Redeem: reset stamps, bump redeemed count, create a free coffee order. */
  async redeem(userId: number, cafeId: number, productId: number): Promise<number> {
    return prisma.$transaction(async (tx) => {
      // Conditional decrement: only redeem if the card still has enough stamps,
      // so two concurrent redeems can't both succeed. Surplus stamps are kept.
      const upd = await tx.loyaltyCard.updateMany({
        where: { userId, cafeId, stamps: { gte: LOYALTY.STAMPS_REQUIRED } },
        data: { stamps: { decrement: LOYALTY.STAMPS_REQUIRED }, totalRedeemed: { increment: 1 } },
      });
      if (upd.count !== 1) throw new BadRequestError('Yeterli damga yok');

      const order = await tx.order.create({
        data: {
          userId,
          cafeId,
          status: 'preparing',
          totalAmount: 0,
          paymentMethod: 'credit_card',
          items: {
            create: {
              productId,
              quantity: 1,
              unitPrice: 0,
              lineTotal: 0,
              note: '🎁 Sadakat kartı ile ücretsiz kahve',
            },
          },
          events: { create: { status: 'preparing' } },
        },
        select: { id: true },
      });
      return order.id;
    });
  },
};
