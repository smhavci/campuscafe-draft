import { z } from 'zod';

export const historyQuerySchema = z.object({
  status: z.enum(['all', 'preparing', 'ready', 'delivered', 'cancelled']).default('all'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD olmalı').optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(15),
});

export const updateStatusSchema = z.object({
  status: z.enum(['preparing', 'ready', 'delivered', 'cancelled']),
});

export const cancelItemSchema = z.object({
  reason: z.string().max(300).optional(),
});

export const notificationsQuerySchema = z.object({ since: z.string().optional() });

export type HistoryQuery = z.infer<typeof historyQuerySchema>;
