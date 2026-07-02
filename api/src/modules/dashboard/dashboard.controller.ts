import type { Request, Response } from 'express';
import type { Server } from 'socket.io';
import { dashboardService } from './dashboard.service';
import {
  cancelItemSchema,
  historyQuerySchema,
  notificationsQuerySchema,
  updateStatusSchema,
} from './dashboard.schema';
import { BadRequestError } from '@/shared/errors';

const getIo = (req: Request): Server | undefined => req.app.get('io') as Server | undefined;
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

export const dashboardController = {
  async activeOrders(req: Request, res: Response): Promise<void> {
    res.json(await dashboardService.activeOrders(cafeIdOf(req)));
  },

  async history(req: Request, res: Response): Promise<void> {
    const query = historyQuerySchema.parse(req.query);
    res.json(await dashboardService.history(cafeIdOf(req), query));
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const { status } = updateStatusSchema.parse(req.body);
    res.json(await dashboardService.updateStatus(cafeIdOf(req), parseId(req.params.id), status, getIo(req)));
  },

  async cancelItem(req: Request, res: Response): Promise<void> {
    const { reason } = cancelItemSchema.parse(req.body);
    res.json(
      await dashboardService.cancelItem(
        cafeIdOf(req),
        parseId(req.params.orderId),
        parseId(req.params.itemId),
        reason ?? '',
        getIo(req),
      ),
    );
  },

  async notifications(req: Request, res: Response): Promise<void> {
    const { since } = notificationsQuerySchema.parse(req.query);
    res.json(await dashboardService.notifications(cafeIdOf(req), since));
  },

  async analytics(req: Request, res: Response): Promise<void> {
    res.json(await dashboardService.analytics(cafeIdOf(req)));
  },
  async weekly(req: Request, res: Response): Promise<void> {
    res.json(await dashboardService.weekly(cafeIdOf(req)));
  },
  async hourly(req: Request, res: Response): Promise<void> {
    res.json(await dashboardService.hourly(cafeIdOf(req)));
  },
  async customers(req: Request, res: Response): Promise<void> {
    res.json(await dashboardService.customers(cafeIdOf(req)));
  },
};
