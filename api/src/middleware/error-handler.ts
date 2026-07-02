import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '@/shared/errors';
import { logger } from '@/config/logger';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ message: `Kaynak bulunamadı: ${req.method} ${req.originalUrl}` });
}

/** Central error handler — the single place that shapes error responses. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message, details: err.details });
    return;
  }

  // Request body validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Doğrulama hatası',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Prisma known errors (e.g. unique constraint)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'Bu kayıt zaten mevcut' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Kayıt bulunamadı' });
      return;
    }
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ message: 'Sunucu hatası' });
}
