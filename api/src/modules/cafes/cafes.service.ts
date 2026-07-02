import { cafesRepository } from './cafes.repository';
import { NotFoundError } from '@/shared/errors';
import { num } from '@/shared/serialize';

function mapCafe(c: Awaited<ReturnType<typeof cafesRepository.findBySlug>>) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image,
    rating: c.rating,
    openHours: c.openHours,
    location: c.location,
    latitude: c.latitude,
    longitude: c.longitude,
    color: c.color,
  };
}

export const cafesService = {
  async list() {
    return (await cafesRepository.list()).map(mapCafe);
  },

  async getBySlug(slug: string) {
    const cafe = mapCafe(await cafesRepository.findBySlug(slug));
    if (!cafe) throw new NotFoundError('Kafe bulunamadı');
    return cafe;
  },

  async products(slug: string) {
    const products = await cafesRepository.productsBySlug(slug);
    return products.map((p) => ({
      id: p.id,
      cafeId: p.cafeId,
      name: p.name,
      category: p.category,
      price: num(p.price),
      description: p.description,
      image: p.image,
    }));
  },

  async campaigns(slug: string) {
    const campaigns = await cafesRepository.campaignsBySlug(slug);
    return campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      discount: c.discount,
      badge: c.badge,
      validUntil: c.validUntil,
      image: c.image,
      relatedProductIds: c.relatedProductIds,
      targetRole: c.targetRole,
    }));
  },
};
