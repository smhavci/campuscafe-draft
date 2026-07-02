import { Router } from 'express';
import { cafesController } from './cafes.controller';
import { asyncHandler } from '@/shared/async-handler';

const router = Router();

router.get('/', asyncHandler(cafesController.list));
router.get('/:slug', asyncHandler(cafesController.getBySlug));
router.get('/:slug/products', asyncHandler(cafesController.products));
router.get('/:slug/campaigns', asyncHandler(cafesController.campaigns));

export default router;
