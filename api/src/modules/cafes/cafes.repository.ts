import { prisma } from '@/db/prisma';

export const cafesRepository = {
  list() {
    return prisma.cafe.findMany({ orderBy: { id: 'asc' } });
  },

  findBySlug(slug: string) {
    return prisma.cafe.findUnique({ where: { slug } });
  },

  productsBySlug(slug: string) {
    return prisma.product.findMany({
      where: { cafe: { slug }, isAvailable: true },
      orderBy: { id: 'asc' },
    });
  },

  campaignsBySlug(slug: string) {
    return prisma.campaign.findMany({
      where: { cafe: { slug }, isActive: true },
      orderBy: { id: 'asc' },
    });
  },
};
