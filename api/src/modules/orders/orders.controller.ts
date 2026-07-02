import type { Request, Response } from 'express';
import type { Server } from 'socket.io';
import { ordersService } from './orders.service';
import { createOrderSchema, notificationsQuerySchema } from './orders.schema';
import { BadRequestError } from '@/shared/errors';

const getIo = (req: Request): Server | undefined => req.app.get('io') as Server | undefined;

const parseId = (raw: string): number => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new BadRequestError('Geçersiz sipariş ID');
  return id;
};

export const ordersController = {
  async create(req: Request, res: Response): Promise<void> {
    const input = createOrderSchema.parse(req.body);
    const order = await ordersService.create(req.user!, input, getIo(req));
    res.status(201).json(order);
  },

  async list(req: Request, res: Response): Promise<void> {
    res.json(await ordersService.listForUser(req.user!.id));
  },

  async notifications(req: Request, res: Response): Promise<void> {
    const { since } = notificationsQuerySchema.parse(req.query);
    res.json(await ordersService.notificationsCount(req.user!.id, since));
  },

  async getById(req: Request, res: Response): Promise<void> {
    res.json(await ordersService.getForUser(parseId(req.params.id), req.user!.id));
  },

  async timeline(req: Request, res: Response): Promise<void> {
    res.json(await ordersService.timeline(parseId(req.params.id), req.user!.id));
  },

  async reorder(req: Request, res: Response): Promise<void> {
    const result = await ordersService.reorder(req.user!, parseId(req.params.id), getIo(req));
    res.status(201).json(result);
  },
};
