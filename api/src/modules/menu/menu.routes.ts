import { Router } from 'express';
import { menuController } from './menu.controller';
import { authMiddleware, requireRole } from '@/middleware/auth';
import { asyncHandler } from '@/shared/async-handler';

const router = Router();
router.use(authMiddleware, requireRole('cafeOwner'));

router.get('/products', asyncHandler(menuController.listProducts));
router.post('/products', asyncHandler(menuController.createProduct));
router.patch('/products/:id', asyncHandler(menuController.updateProduct));
router.delete('/products/:id', asyncHandler(menuController.deleteProduct));

router.get('/campaigns', asyncHandler(menuController.listCampaigns));
router.post('/campaigns', asyncHandler(menuController.createCampaign));
router.patch('/campaigns/:id', asyncHandler(menuController.updateCampaign));
router.delete('/campaigns/:id', asyncHandler(menuController.deleteCampaign));

export default router;
