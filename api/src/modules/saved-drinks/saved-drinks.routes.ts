import { Router } from 'express';
import { z } from 'zod';
import { savedDrinksService } from './saved-drinks.service';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler } from '@/shared/async-handler';
import { BadRequestError } from '@/shared/errors';

const createSchema = z.object({
  productId: z.number().int().positive(),
  name: z.string().trim().min(1, 'İsim gereklidir'),
  selectedOptions: z.array(z.unknown()).optional(),
  totalPrice: z.number().nonnegative().optional(),
});

const router = Router();
router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await savedDrinksService.list(req.user!.id));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    res.status(201).json(await savedDrinksService.create(req.user!.id, input));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestError('Geçersiz ID');
    res.json(await savedDrinksService.remove(req.user!.id, id));
  }),
);

export default router;
