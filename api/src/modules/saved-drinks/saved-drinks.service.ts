import type { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import { NotFoundError } from '@/shared/errors';
import { num } from '@/shared/serialize';

export const savedDrinksService = {
  async list(userId: number) {
    const drinks = await prisma.savedDrink.findMany({
      where: { userId },
      include: { product: { include: { cafe: { select: { name: true, slug: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return drinks.map((d) => ({
      id: d.id,
      name: d.name,
      selectedOptions: d.selectedOptions,
      totalPrice: num(d.totalPrice),
      createdAt: d.createdAt,
      productId: d.productId,
      productName: d.product.name,
      productImage: d.product.image,
      basePrice: num(d.product.price),
      cafeName: d.product.cafe.name,
      cafeSlug: d.product.cafe.slug,
    }));
  },

  async create(
    userId: number,
    input: { productId: number; name: string; selectedOptions?: unknown; totalPrice?: number },
  ): Promise<{ message: string; id: number }> {
    const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } });
    if (!product) throw new NotFoundError('Ürün bulunamadı');

    const created = await prisma.savedDrink.create({
      data: {
        userId,
        productId: input.productId,
        name: input.name,
        selectedOptions: (input.selectedOptions ?? []) as Prisma.InputJsonValue,
        totalPrice: input.totalPrice ?? 0,
      },
      select: { id: true },
    });
    return { message: 'İçecek tarifi kaydedildi!', id: created.id };
  },

  async remove(userId: number, id: number): Promise<{ message: string }> {
    const drink = await prisma.savedDrink.findFirst({ where: { id, userId }, select: { id: true } });
    if (!drink) throw new NotFoundError('Kayıtlı içecek bulunamadı');
    await prisma.savedDrink.delete({ where: { id } });
    return { message: 'İçecek tarifi silindi' };
  },
};
