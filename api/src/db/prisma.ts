import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

/**
 * Single shared PrismaClient instance.
 * In dev with tsx watch, cache it on globalThis to avoid exhausting the
 * connection pool across hot reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
