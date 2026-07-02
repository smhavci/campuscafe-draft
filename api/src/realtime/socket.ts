import type { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { verifyToken } from '@/shared/jwt';

/**
 * Socket.IO with authenticated handshake.
 *
 * SECURITY: rooms are derived server-side from the verified JWT — the client
 * cannot ask to join an arbitrary user's or cafe's room (the legacy bug where
 * anyone could emit `join_user(anyId)` and eavesdrop is gone).
 */
export function initRealtime(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: env.corsOrigins, methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    try {
      const user = verifyToken(token);
      socket.data.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as ReturnType<typeof verifyToken>;

    // Personal room — for order status / stars notifications.
    socket.join(`user_${user.id}`);

    // Cafe owners additionally join their cafe room — for new-order alerts.
    if (user.role === 'cafeOwner' && user.cafeId) {
      socket.join(`cafe_${user.cafeId}`);
    }

    logger.debug({ userId: user.id, role: user.role }, 'socket connected');
  });

  return io;
}

/** Notify a cafe-owner dashboard (new/updated orders). */
export function notifyCafe(io: SocketServer, cafeId: number, event: string, payload: unknown): void {
  io.to(`cafe_${cafeId}`).emit(event, payload);
}

/** Notify a specific user (order status change, stars earned, item cancelled). */
export function notifyUser(io: SocketServer, userId: number, event: string, payload: unknown): void {
  io.to(`user_${userId}`).emit(event, payload);
}
