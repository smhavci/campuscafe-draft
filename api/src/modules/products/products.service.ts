import { productsRepository } from './products.repository';
import type { SearchQuery } from './products.schema';
import { NotFoundError } from '@/shared/errors';
import { num } from '@/shared/serialize';

type ProductRow = Awaited<ReturnType<typeof productsRepository.listAvailable>>[number];

function mapProduct(p: ProductRow) {
  return {
    id: p.id,
    cafeId: p.cafeId,
    name: p.name,
    category: p.category,
    price: num(p.price),
    description: p.description,
    image: p.image,
    calories: p.calories,
    allergens: p.allergens,
    ingredients: p.ingredients,
    starCost: p.starCost,
  };
}

export const productsService = {
  async list() {
    return (await productsRepository.listAvailable()).map(mapProduct);
  },

  async getById(id: number) {
    const p = await productsRepository.findByIdWithOptions(id);
    if (!p) throw new NotFoundError('Ürün bulunamadı');
    return {
      ...mapProduct(p),
      options: p.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        type: opt.type,
        isRequired: opt.isRequired,
        items: opt.items.map((it) => ({ id: it.id, name: it.name, extraPrice: num(it.extraPrice) })),
      })),
    };
  },

  async search(query: SearchQuery) {
    const rows = await productsRepository.search(query);
    return rows.map((p) => ({
      ...mapProduct(p),
      cafeName: p.cafe.name,
      cafeSlug: p.cafe.slug,
    }));
  },
};
