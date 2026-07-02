import { prisma } from '@/db/prisma';
import { BadRequestError, ConflictError } from '@/shared/errors';

export const reviewsService = {
  async create(
    userId: number,
    input: { productId: number; orderId: number; rating: number; comment?: string },
  ): Promise<{ message: string; rating: number; comment: string }> {
    const { productId, orderId, rating } = input;
    const comment = input.comment ?? '';

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId, status: 'delivered' },
      select: { id: true },
    });
    if (!order) throw new BadRequestError('Sadece teslim edilmiş siparişleri değerlendirebilirsiniz');

    const item = await prisma.orderItem.findFirst({
      where: { orderId, productId, status: 'active' },
      select: { id: true },
    });
    if (!item) throw new BadRequestError('Bu ürün bu siparişte bulunamadı');

    const existing = await prisma.review.findUnique({
      where: { userId_productId_orderId: { userId, productId, orderId } },
      select: { id: true },
    });
    if (existing) throw new ConflictError('Bu ürünü zaten değerlendirdiniz');

    // L7 fix: create review + recompute the cafe rating atomically.
    await prisma.$transaction(async (tx) => {
      await tx.review.create({ data: { userId, productId, orderId, rating, comment } });

      const product = await tx.product.findUnique({ where: { id: productId }, select: { cafeId: true } });
      if (product) {
        const agg = await tx.review.aggregate({
          where: { product: { cafeId: product.cafeId } },
          _avg: { rating: true },
        });
        if (agg._avg.rating != null) {
          await tx.cafe.update({
            where: { id: product.cafeId },
            data: { rating: Math.round(agg._avg.rating * 10) / 10 },
          });
        }
      }
    });

    return { message: 'Değerlendirme kaydedildi', rating, comment };
  },

  async forProduct(productId: number) {
    const [reviews, agg] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: { user: { select: { firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.aggregate({ where: { productId }, _count: true, _avg: { rating: true } }),
    ]);

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        userName: `${r.user.firstName} ${r.user.lastName}`,
        userRole: r.user.role,
      })),
      stats: {
        total: agg._count,
        avgRating: agg._avg.rating != null ? Math.round(agg._avg.rating * 10) / 10 : 0,
      },
    };
  },

  async byUser(userId: number) {
    const reviews = await prisma.review.findMany({
      where: { userId },
      select: { productId: true, orderId: true, rating: true },
    });
    return reviews;
  },
};
