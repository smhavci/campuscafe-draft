import type { Request, Response } from 'express';
import { cafesService } from './cafes.service';

export const cafesController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await cafesService.list());
  },
  async getBySlug(req: Request, res: Response): Promise<void> {
    res.json(await cafesService.getBySlug(req.params.slug));
  },
  async products(req: Request, res: Response): Promise<void> {
    res.json(await cafesService.products(req.params.slug));
  },
  async campaigns(req: Request, res: Response): Promise<void> {
    res.json(await cafesService.campaigns(req.params.slug));
  },
};
