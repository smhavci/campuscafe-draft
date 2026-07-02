import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { asyncHandler } from '@/shared/async-handler';

const router = Router();

// Every dashboard route is cafe-owner only.
router.use(authMiddleware, requireRole('cafeOwner'));

router.get('/orders', asyncHandler(dashboardController.activeOrders));
router.get('/history', asyncHandler(dashboardController.history));
router.patch('/orders/:id/status', asyncHandler(dashboardController.updateStatus));
router.patch('/orders/:orderId/items/:itemId/cancel', asyncHandler(dashboardController.cancelItem));
router.get('/notifications', asyncHandler(dashboardController.notifications));
router.get('/analytics', asyncHandler(dashboardController.analytics));
router.get('/analytics/weekly', asyncHandler(dashboardController.weekly));
router.get('/analytics/hourly', asyncHandler(dashboardController.hourly));
router.get('/analytics/customers', asyncHandler(dashboardController.customers));

export default router;
