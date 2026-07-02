import { prisma } from '@/db/prisma';
import { NotFoundError } from '@/shared/errors';
import { num } from '@/shared/serialize';
import type {
  CreateCampaignInput,
  CreateProductInput,
  UpdateCampaignInput,
  UpdateProductInput,
} from './menu.schema';

const productView = {
  id: true,
  name: true,
  category: true,
  price: true,
  description: true,
  image: true,
  isAvailable: true,
} as const;

function mapProduct(p: {
  id: number;
  name: string;
  category: string;
  price: unknown;
  description: string | null;
  image: string | null;
  isAvailable: boolean;
}) {
  return { ...p, price: num(p.price as never) };
}

export const menuService = {
  // ── Products ──────────────────────────────────────────────
  async listProducts(cafeId: number) {
    const rows = await prisma.product.findMany({
      where: { cafeId },
      select: productView,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return rows.map(mapProduct);
  },

  async createProduct(cafeId: number, input: CreateProductInput) {
    const p = await prisma.product.create({
      data: {
        cafeId,
        name: input.name,
        category: input.category,
        price: input.price,
        description: input.description ?? '',
        image: input.image ?? '',
        isAvailable: true,
      },
      select: productView,
    });
    return mapProduct(p);
  },

  async updateProduct(cafeId: number, productId: number, input: UpdateProductInput) {
    const existing = await prisma.product.findFirst({ where: { id: productId, cafeId }, select: { id: true } });
    if (!existing) throw new NotFoundError('Ürün bulunamadı');

    const p = await prisma.product.update({ where: { id: productId }, data: input, select: productView });
    return mapProduct(p);
  },

  async deleteProduct(cafeId: number, productId: number) {
    const existing = await prisma.product.findFirst({ where: { id: productId, cafeId }, select: { id: true } });
    if (!existing) throw new NotFoundError('Ürün bulunamadı');

    // If the product is referenced by any order (history included), we cannot
    // hard-delete without breaking foreign keys — soft-disable instead.
    const referenced = await prisma.orderItem.findFirst({ where: { productId }, select: { id: true } });
    if (referenced) {
      await prisma.product.update({ where: { id: productId }, data: { isAvailable: false } });
      return { message: 'Siparişlerde geçtiği için ürün pasif yapıldı', deactivated: true };
    }
    await prisma.product.delete({ where: { id: productId } });
    return { message: 'Ürün silindi', deleted: true };
  },

  // ── Campaigns ─────────────────────────────────────────────
  async listCampaigns(cafeId: number) {
    return prisma.campaign.findMany({ where: { cafeId }, orderBy: { id: 'desc' } });
  },

  async createCampaign(cafeId: number, input: CreateCampaignInput) {
    return prisma.campaign.create({
      data: {
        cafeId,
        title: input.title,
        description: input.description ?? '',
        discount: input.discount ?? '',
        badge: input.badge ?? '',
        validUntil: input.validUntil ?? null,
        image: input.image ?? '',
        relatedProductIds: input.relatedProductIds ?? [],
        targetRole: input.targetRole ?? 'all',
        starMultiplier: input.starMultiplier ?? 1,
        isActive: true,
      },
    });
  },

  async updateCampaign(cafeId: number, campaignId: number, input: UpdateCampaignInput) {
    const existing = await prisma.campaign.findFirst({ where: { id: campaignId, cafeId }, select: { id: true } });
    if (!existing) throw new NotFoundError('Kampanya bulunamadı');
    return prisma.campaign.update({ where: { id: campaignId }, data: input });
  },

  async deleteCampaign(cafeId: number, campaignId: number) {
    const existing = await prisma.campaign.findFirst({ where: { id: campaignId, cafeId }, select: { id: true } });
    if (!existing) throw new NotFoundError('Kampanya bulunamadı');
    await prisma.campaign.delete({ where: { id: campaignId } });
    return { message: 'Kampanya silindi' };
  },
};
