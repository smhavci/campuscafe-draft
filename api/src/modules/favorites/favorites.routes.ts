import { Router } from 'express';
import { favoritesService } from './favorites.service';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler } from '@/shared/async-handler';
import { BadRequestError } from '@/shared/errors';

const router = Router();
router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await favoritesService.list(req.user!.id));
  }),
);

router.get(
  '/ids',
  asyncHandler(async (req, res) => {
    res.json(await favoritesService.ids(req.user!.id));
  }),
);

router.post(
  '/:productId',
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) throw new BadRequestError('Geçersiz ürün ID');
    res.json(await favoritesService.toggle(req.user!.id, productId));
  }),
);

export default router;
