import type { JwtPayload } from '@/shared/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by authMiddleware after verifying the Bearer token. */
      user?: JwtPayload;
    }
  }
}

export {};
