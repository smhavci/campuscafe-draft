import { Router } from 'express';
import { productsController } from './products.controller';
import { asyncHandler } from '@/shared/async-handler';

const router = Router();

// /search must be registered before /:id so it is not captured as an id.
router.get('/', asyncHandler(productsController.list));
router.get('/search', asyncHandler(productsController.search));
router.get('/:id', asyncHandler(productsController.getById));

export default router;
