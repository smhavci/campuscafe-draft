import { Router } from 'express';
import { loyaltyController } from './loyalty.controller';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler } from '@/shared/async-handler';

const router = Router();
router.use(authMiddleware);

router.get('/', asyncHandler(loyaltyController.cards));
router.get('/status', asyncHandler(loyaltyController.status));
router.get('/history', asyncHandler(loyaltyController.history));
router.get('/coffees/:cafeId', asyncHandler(loyaltyController.coffees));
router.post('/redeem', asyncHandler(loyaltyController.redeem));

export default router;
