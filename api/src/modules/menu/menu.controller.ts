import type { Request, Response } from 'express';
import { menuService } from './menu.service';
import {
  createCampaignSchema,
  createProductSchema,
  updateCampaignSchema,
  updateProductSchema,
} from './menu.schema';
import { BadRequestError } from '@/shared/errors';

const cafeIdOf = (req: Request): number => {
  const id = req.user!.cafeId;
  if (!id) throw new BadRequestError('Hesabınız bir kafeye bağlı değil');
  return id;
};
const parseId = (raw: string): number => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new BadRequestError('Geçersiz ID');
  return id;
};

export const menuController = {
  async listProducts(req: Request, res: Response): Promise<void> {
    res.json(await menuService.listProducts(cafeIdOf(req)));
  },
  async createProduct(req: Request, res: Response): Promise<void> {
    const input = createProductSchema.parse(req.body);
    res.status(201).json(await menuService.createProduct(cafeIdOf(req), input));
  },
  async updateProduct(req: Request, res: Response): Promise<void> {
    const input = updateProductSchema.parse(req.body);
    res.json(await menuService.updateProduct(cafeIdOf(req), parseId(req.params.id), input));
  },
  async deleteProduct(req: Request, res: Response): Promise<void> {
    res.json(await menuService.deleteProduct(cafeIdOf(req), parseId(req.params.id)));
  },

  async listCampaigns(req: Request, res: Response): Promise<void> {
    res.json(await menuService.listCampaigns(cafeIdOf(req)));
  },
  async createCampaign(req: Request, res: Response): Promise<void> {
    const input = createCampaignSchema.parse(req.body);
    res.status(201).json(await menuService.createCampaign(cafeIdOf(req), input));
  },
  async updateCampaign(req: Request, res: Response): Promise<void> {
    const input = updateCampaignSchema.parse(req.body);
    res.json(await menuService.updateCampaign(cafeIdOf(req), parseId(req.params.id), input));
  },
  async deleteCampaign(req: Request, res: Response): Promise<void> {
    res.json(await menuService.deleteCampaign(cafeIdOf(req), parseId(req.params.id)));
  },
};
