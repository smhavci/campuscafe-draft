import type { Request, Response } from 'express';
import { productsService } from './products.service';
import { searchQuerySchema } from './products.schema';
import { BadRequestError } from '@/shared/errors';

export const productsController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await productsService.list());
  },

  async search(req: Request, res: Response): Promise<void> {
    const query = searchQuerySchema.parse(req.query);
    res.json(await productsService.search(query));
  },

  async getById(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new BadRequestError('Geçersiz ürün ID');
    res.json(await productsService.getById(id));
  },
};
