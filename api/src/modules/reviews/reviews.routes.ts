import { Router } from 'express';
import { z } from 'zod';
import { reviewsService } from './reviews.service';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler } from '@/shared/async-handler';
import { BadRequestError } from '@/shared/errors';

const createSchema = z.object({
  productId: z.number().int().positive(),
  orderId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const router = Router();

router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    res.status(201).json(await reviewsService.create(req.user!.id, input));
  }),
);

router.get(
  '/product/:productId',
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) throw new BadRequestError('Geçersiz ürün ID');
    res.json(await reviewsService.forProduct(productId));
  }),
);

router.get(
  '/user',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json(await reviewsService.byUser(req.user!.id));
  }),
);

export default router;
