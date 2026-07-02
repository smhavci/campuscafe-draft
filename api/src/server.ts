import { createServer } from 'http';
import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { prisma } from '@/db/prisma';
import { initRealtime } from '@/realtime/socket';

async function bootstrap(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);

  // Realtime (Socket.IO with JWT handshake). Exposed to routes via app.set('io').
  const io = initRealtime(httpServer);
  app.set('io', io);

  httpServer.listen(env.PORT, () => {
    logger.info(`✅ CampusCafe API on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    logger.info('🔌 Socket.IO ready');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down`);
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
