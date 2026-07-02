import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '@/middleware/auth';
import { asyncHandler } from '@/shared/async-handler';

const router = Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', authMiddleware, asyncHandler(authController.me));
router.patch('/me', authMiddleware, asyncHandler(authController.updateMe));

export default router;
