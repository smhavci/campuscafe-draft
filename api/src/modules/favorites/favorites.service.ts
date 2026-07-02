import { prisma } from '@/db/prisma';
import { NotFoundError } from '@/shared/errors';
import { num } from '@/shared/serialize';

export const favoritesService = {
  async list(userId: number) {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { product: { include: { cafe: { select: { name: true, slug: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map((f) => ({
      id: f.id,
      productId: f.productId,
      createdAt: f.createdAt,
      name: f.product.name,
      category: f.product.category,
      price: num(f.product.price),
      description: f.product.description,
      image: f.product.image,
      cafeId: f.product.cafeId,
      cafeName: f.product.cafe.name,
      cafeSlug: f.product.cafe.slug,
    }));
  },

  async ids(userId: number): Promise<number[]> {
    const rows = await prisma.favorite.findMany({ where: { userId }, select: { productId: true } });
    return rows.map((r) => r.productId);
  },

  async toggle(userId: number, productId: number): Promise<{ action: 'added' | 'removed'; productId: number }> {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundError('Ürün bulunamadı');

    const existing = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { action: 'removed', productId };
    }
    await prisma.favorite.create({ data: { userId, productId } });
    return { action: 'added', productId };
  },
};
