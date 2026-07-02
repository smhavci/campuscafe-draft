import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyToken } from '@/shared/jwt';
import { ForbiddenError, UnauthorizedError } from '@/shared/errors';

/** Requires a valid Bearer token; attaches the decoded payload to req.user. */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError();
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    throw new UnauthorizedError('Geçersiz veya süresi dolmuş token');
  }
}

/** Role-based access control. Use after authMiddleware. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}
