import type { Server } from 'socket.io';
import { loyaltyRepository } from './loyalty.repository';
import { BadRequestError } from '@/shared/errors';
import { num } from '@/shared/serialize';
import { LOYALTY, REWARDS } from '@/config/constants';
import { notifyCafe } from '@/realtime/socket';

function mapCard(c: Awaited<ReturnType<typeof loyaltyRepository.cards>>[number]) {
  return {
    id: c.id,
    stamps: c.stamps,
    totalRedeemed: c.totalRedeemed,
    cafeId: c.cafe.id,
    cafeName: c.cafe.name,
    cafeSlug: c.cafe.slug,
    cafeImage: c.cafe.image,
    cafeColor: c.cafe.color,
    stampsRequired: LOYALTY.STAMPS_REQUIRED,
  };
}

export const loyaltyService = {
  async cards(userId: number) {
    return (await loyaltyRepository.cards(userId)).map(mapCard);
  },

  async status(userId: number) {
    const [user, cards] = await Promise.all([
      loyaltyRepository.userStars(userId),
      loyaltyRepository.cards(userId),
    ]);
    const stars = user?.stars ?? 0;
    return {
      stars,
      cards: cards.map((c) => ({ stamps: c.stamps, cafeName: c.cafe.name, cafeId: c.cafe.id })),
      nextRewardThreshold: stars < 15 ? 15 : 30,
    };
  },

  async history(userId: number) {
    const orders = await loyaltyRepository.recentOrders(userId);
    return orders.map((o) => {
      const isRedeem = o.paymentMethod === 'stars';
      // L5 fix: star spend is now recorded on the order (starsSpent).
      const earned = Math.floor(num(o.totalAmount) / REWARDS.CURRENCY_PER_STAR);
      return {
        id: o.id,
        date: o.createdAt,
        description: isRedeem ? `${o.cafe?.name ?? ''} Ödül Kullanımı` : `${o.cafe?.name ?? ''} Siparişi`,
        change: isRedeem ? `-${o.starsSpent}` : `+${earned}`,
        type: isRedeem ? 'redeem' : 'earn',
      };
    });
  },

  async coffees(cafeId: number) {
    return (await loyaltyRepository.coffees(cafeId)).map((p) => ({
      id: p.id,
      name: p.name,
      price: num(p.price),
      description: p.description,
      image: p.image,
    }));
  },

  async redeem(userId: number, cafeId: number, productId: number, io?: Server) {
    const card = await loyaltyRepository.card(userId, cafeId);
    if (!card || card.stamps < LOYALTY.STAMPS_REQUIRED) {
      throw new BadRequestError(
        `Ücretsiz kahve için ${LOYALTY.STAMPS_REQUIRED} damga gerekiyor. Şu an ${card?.stamps ?? 0} damganız var.`,
      );
    }

    const product = await loyaltyRepository.coffeeProduct(productId, cafeId);
    if (!product) throw new BadRequestError('Geçersiz kahve seçimi');

    const orderId = await loyaltyRepository.redeem(userId, cafeId, productId);

    if (io) {
      notifyCafe(io, cafeId, 'new_order', { orderId, customerName: 'Ödül', totalAmount: 0, itemCount: 1 });
    }

    const updatedCards = await this.cards(userId);
    const card2 = updatedCards.find((c) => c.cafeId === cafeId);
    return { message: `🎉 Ücretsiz ${product.name} siparişiniz oluşturuldu!`, card: card2, orderId };
  },
};
