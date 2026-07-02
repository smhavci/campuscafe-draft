import type { Server } from 'socket.io';
import { ordersRepository, type CreateOrderPlan, type OrderWithRelations } from './orders.repository';
import type { CreateOrderInput } from './orders.schema';
import { BadRequestError, NotFoundError } from '@/shared/errors';
import { num } from '@/shared/serialize';
import { LOYALTY, REWARDS } from '@/config/constants';
import { notifyCafe, notifyUser } from '@/realtime/socket';
import type { JwtPayload } from '@/shared/jwt';

const round2 = (n: number): number => Math.round(n * 100) / 100;

function mapOrder(o: OrderWithRelations) {
  return {
    id: o.id,
    status: o.status,
    totalAmount: num(o.totalAmount),
    starsSpent: o.starsSpent,
    pickupTime: o.pickupTime,
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt,
    cafeName: o.cafe?.name ?? null,
    items: o.items.map((it) => ({
      itemId: it.id,
      quantity: it.quantity,
      unitPrice: num(it.unitPrice),
      lineTotal: num(it.lineTotal),
      note: it.note,
      itemStatus: it.status,
      cancelReason: it.cancelReason,
      productName: it.product.name,
      productImage: it.product.image,
      options: it.options.map((op) => ({ name: op.name, price: num(op.price) })),
    })),
  };
}

export const ordersService = {
  async create(user: JwtPayload, input: CreateOrderInput, io?: Server) {
    const { items, paymentMethod } = input;
    const cafeId = input.cafeId ?? null;
    const pickupTime = input.pickupTime ?? null;

    const products = await ordersRepository.productsForOrder(items.map((i) => i.productId));
    const productById = new Map(products.map((p) => [p.id, p]));

    const optionIds = [...new Set(items.flatMap((i) => i.options ?? []))];
    const optionItems = optionIds.length ? await ordersRepository.optionItems(optionIds) : [];
    const optionById = new Map(optionItems.map((o) => [o.id, o]));

    let totalAmount = 0;
    let totalStarCost = 0;
    let coffeeCountForStamps = 0;
    let allStarRedeemable = true;
    const planItems: CreateOrderPlan['items'] = [];

    for (const item of items) {
      const product = productById.get(item.productId);
      if (!product || !product.isAvailable) {
        throw new BadRequestError(`Ürün bulunamadı: ${item.productId}`);
      }

      let unitPrice = num(product.price);
      const options: CreateOrderPlan['items'][number]['options'] = [];
      for (const optId of item.options ?? []) {
        const opt = optionById.get(optId);
        if (opt) {
          unitPrice += num(opt.extraPrice);
          options.push({ optionItemId: opt.id, name: opt.name, price: num(opt.extraPrice) });
        }
      }

      const lineTotal = round2(unitPrice * item.quantity);
      totalAmount += lineTotal;
      totalStarCost += (product.starCost || 0) * item.quantity;
      if ((product.starCost || 0) <= 0) allStarRedeemable = false;
      if (product.category === LOYALTY.STAMP_CATEGORY) coffeeCountForStamps += item.quantity;

      planItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        note: item.note ?? '',
        options,
      });
    }
    totalAmount = round2(totalAmount);

    let starsToSpend = 0;
    let starsToEarn = 0;

    if (paymentMethod === 'stars') {
      // Only allow star payment when every line item is star-redeemable,
      // otherwise a 0-starCost product would be granted for free.
      if (!allStarRedeemable || totalStarCost <= 0) {
        throw new BadRequestError('Sepetteki tüm ürünler yıldızla alınabilir olmalı');
      }
      const u = await ordersRepository.getUserStars(user.id);
      if (!u || u.stars < totalStarCost) {
        throw new BadRequestError(
          `Yetersiz yıldız bakiyesi. Gerekli: ${totalStarCost}, Mevcut: ${u?.stars ?? 0}`,
        );
      }
      starsToSpend = totalStarCost;
      totalAmount = 0;
    } else {
      if (paymentMethod === 'wallet') {
        const wallet = await ordersRepository.getWalletBalance(user.id);
        if (!wallet || num(wallet.balance) < totalAmount) {
          throw new BadRequestError('Cüzdan bakiyesi yetersiz');
        }
      }
      let multiplier = 1;
      if (cafeId) {
        const campaign = await ordersRepository.activeMultiplier(cafeId);
        if (campaign) multiplier = campaign.starMultiplier;
      }
      starsToEarn = Math.floor(totalAmount / REWARDS.CURRENCY_PER_STAR) * multiplier;
    }

    const orderId = await ordersRepository.createOrder({
      userId: user.id,
      cafeId,
      paymentMethod,
      pickupTime,
      totalAmount,
      starsToEarn,
      starsToSpend,
      coffeeCountForStamps,
      items: planItems,
    });

    const created = await ordersRepository.findByIdForUser(orderId, user.id);
    const mapped = mapOrder(created!);

    if (io) {
      if (cafeId) {
        notifyCafe(io, cafeId, 'new_order', {
          orderId,
          customerName: user.firstName,
          totalAmount: mapped.totalAmount,
          itemCount: planItems.length,
        });
      }
      // L1 fix: notify the ACTUAL earned stars (including campaign multiplier).
      if (paymentMethod !== 'stars' && starsToEarn > 0) {
        const u = await ordersRepository.getUserStars(user.id);
        notifyUser(io, user.id, 'stars_earned', { amount: starsToEarn, total: u?.stars ?? 0 });
      }
    }

    return mapped;
  },

  async listForUser(userId: number) {
    const orders = await ordersRepository.listByUser(userId);
    return orders.map(mapOrder);
  },

  async getForUser(id: number, userId: number) {
    const order = await ordersRepository.findByIdForUser(id, userId);
    if (!order) throw new NotFoundError('Sipariş bulunamadı');
    return mapOrder(order);
  },

  async timeline(id: number, userId: number) {
    const order = await ordersRepository.findBasicForUser(id, userId);
    if (!order) throw new NotFoundError('Sipariş bulunamadı');
    const events = await ordersRepository.timeline(id);
    const list =
      events.length > 0
        ? events.map((e) => ({ status: e.status, timestamp: e.createdAt }))
        : [{ status: 'preparing' as const, timestamp: order.createdAt }];
    return { orderId: id, currentStatus: order.status, events: list };
  },

  async notificationsCount(userId: number, since?: string) {
    const sinceDate = since ? new Date(since) : new Date('2000-01-01T00:00:00Z');
    const count = await ordersRepository.countUpdatedSince(userId, sinceDate);
    return { count };
  },

  /** L3 fix: reorder goes through the normal create path, so payment/stars/stamps stay consistent. */
  async reorder(user: JwtPayload, orderId: number, io?: Server) {
    const order = await ordersRepository.findBasicForUser(orderId, user.id);
    if (!order) throw new NotFoundError('Sipariş bulunamadı');

    const items = await ordersRepository.activeItemsForReorder(orderId);
    const available = items.filter((i) => i.product.isAvailable);
    if (available.length === 0) {
      throw new BadRequestError('Bu siparişten tekrar verilebilecek ürün yok');
    }

    const input: CreateOrderInput = {
      items: available.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        note: i.note || undefined,
        options: i.options
          .map((o) => o.optionItemId)
          .filter((x): x is number => x !== null),
      })),
      cafeId: order.cafeId ?? undefined,
      paymentMethod: 'credit_card',
    };

    const created = await this.create(user, input, io);
    return { message: 'Sipariş tekrar verildi!', orderId: created.id, totalAmount: created.totalAmount };
  },
};
