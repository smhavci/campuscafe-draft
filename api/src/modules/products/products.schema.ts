import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().trim().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  category: z.string().trim().optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
