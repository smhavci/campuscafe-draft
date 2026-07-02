import { Router } from 'express';
import { prisma } from '@/db/prisma';
import { asyncHandler } from '@/shared/async-handler';

/**
 * Public, read-only campaign listing. Campaign CREATION lives in the
 * cafe-owner "menu" module (authenticated). The legacy unauthenticated
 * POST /api/campaigns (for the removed AI crew) is intentionally gone.
 */
const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const campaigns = await prisma.campaign.findMany({
      where: { isActive: true },
      include: { cafe: { select: { name: true, slug: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(
      campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        discount: c.discount,
        badge: c.badge,
        validUntil: c.validUntil,
        image: c.image,
        cafeId: c.cafeId,
        relatedProductIds: c.relatedProductIds,
        targetRole: c.targetRole,
        starMultiplier: c.starMultiplier,
        cafeName: c.cafe.name,
        cafeSlug: c.cafe.slug,
      })),
    );
  }),
);

export default router;
