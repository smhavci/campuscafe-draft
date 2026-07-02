import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  price: z.number().nonnegative(),
  description: z.string().optional(),
  image: z.string().optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    price: z.number().nonnegative().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    isAvailable: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Güncellenecek alan bulunamadı' });

export const createCampaignSchema = z.object({
  title: z.string().trim().min(1, 'Kampanya başlığı zorunludur'),
  description: z.string().optional(),
  discount: z.string().optional(),
  badge: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  image: z.string().optional(),
  relatedProductIds: z.array(z.number().int().positive()).optional(),
  targetRole: z.enum(['all', 'student', 'teacher']).optional(),
  starMultiplier: z.number().int().min(1).optional(),
});

export const updateCampaignSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    discount: z.string().optional(),
    badge: z.string().optional(),
    validUntil: z.coerce.date().nullable().optional(),
    image: z.string().optional(),
    relatedProductIds: z.array(z.number().int().positive()).optional(),
    targetRole: z.enum(['all', 'student', 'teacher']).optional(),
    starMultiplier: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Güncellenecek alan bulunamadı' });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
