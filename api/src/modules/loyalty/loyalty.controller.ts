import type { Request, Response } from 'express';
import type { Server } from 'socket.io';
import { z } from 'zod';
import { loyaltyService } from './loyalty.service';
import { BadRequestError } from '@/shared/errors';

const redeemSchema = z.object({
  cafeId: z.number().int().positive(),
  productId: z.number().int().positive(),
});

const getIo = (req: Request): Server | undefined => req.app.get('io') as Server | undefined;

export const loyaltyController = {
  async cards(req: Request, res: Response): Promise<void> {
    res.json(await loyaltyService.cards(req.user!.id));
  },
  async status(req: Request, res: Response): Promise<void> {
    res.json(await loyaltyService.status(req.user!.id));
  },
  async history(req: Request, res: Response): Promise<void> {
    res.json(await loyaltyService.history(req.user!.id));
  },
  async coffees(req: Request, res: Response): Promise<void> {
    const cafeId = Number(req.params.cafeId);
    if (!Number.isInteger(cafeId) || cafeId <= 0) throw new BadRequestError('Geçersiz kafe ID');
    res.json(await loyaltyService.coffees(cafeId));
  },
  async redeem(req: Request, res: Response): Promise<void> {
    const { cafeId, productId } = redeemSchema.parse(req.body);
    res.json(await loyaltyService.redeem(req.user!.id, cafeId, productId, getIo(req)));
  },
};
