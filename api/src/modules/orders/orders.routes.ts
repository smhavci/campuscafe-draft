import { Router } from 'express';
import { ordersController } from './orders.controller';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler } from '@/shared/async-handler';

const router = Router();

// All order routes require authentication.
router.use(authMiddleware);

router.post('/', asyncHandler(ordersController.create));
router.get('/', asyncHandler(ordersController.list));
router.get('/notifications', asyncHandler(ordersController.notifications));
router.post('/reorder/:id', asyncHandler(ordersController.reorder));
router.get('/:id', asyncHandler(ordersController.getById));
router.get('/:id/timeline', asyncHandler(ordersController.timeline));

export default router;
