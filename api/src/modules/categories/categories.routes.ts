import { Router } from 'express';
import { prisma } from '@/db/prisma';
import { asyncHandler } from '@/shared/async-handler';

// Categories are a small read-only reference list — a single thin route.
const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    res.json(categories);
  }),
);

export default router;
