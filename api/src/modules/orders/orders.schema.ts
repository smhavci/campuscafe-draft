import { z } from 'zod';

export const orderItemInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  options: z.array(z.number().int().positive()).optional(),
  note: z.string().max(500).optional(),
  // NOTE: no client-supplied discount — prices/discounts are authoritative
  // server-side (derived from campaigns), so a client can't set its own price.
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, 'Sipariş için en az bir ürün gerekli'),
  cafeId: z.number().int().positive().optional(),
  pickupTime: z.coerce.date().optional(),
  paymentMethod: z.enum(['credit_card', 'wallet', 'stars']).default('credit_card'),
});

export const notificationsQuerySchema = z.object({
  since: z.string().optional(),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
