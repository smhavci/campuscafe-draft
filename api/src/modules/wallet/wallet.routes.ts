import { Router } from 'express';
import { z } from 'zod';
import { walletService } from './wallet.service';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler } from '@/shared/async-handler';

const topUpSchema = z.object({ amount: z.number().positive('Geçersiz tutar') });

const router = Router();
router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await walletService.getBalance(req.user!.id));
  }),
);

router.post(
  '/topup',
  asyncHandler(async (req, res) => {
    const { amount } = topUpSchema.parse(req.body);
    res.json(await walletService.topUp(req.user!.id, amount));
  }),
);

export default router;
