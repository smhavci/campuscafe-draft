import { Prisma } from '@prisma/client';
import { prisma } from '@/db/prisma';
import type { SearchQuery } from './products.schema';

export const productsRepository = {
  listAvailable() {
    return prisma.product.findMany({ where: { isAvailable: true }, orderBy: { id: 'asc' } });
  },

  findByIdWithOptions(id: number) {
    return prisma.product.findUnique({
      where: { id },
      include: { options: { include: { items: true } } },
    });
  },

  search(query: SearchQuery) {
    const where: Prisma.ProductWhereInput = { isAvailable: true };

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { category: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }
    if (query.category && query.category !== 'all') {
      where.category = query.category;
    }

    return prisma.product.findMany({
      where,
      include: { cafe: { select: { name: true, slug: true } } },
      orderBy: { name: 'asc' },
      take: 50,
    });
  },
};
