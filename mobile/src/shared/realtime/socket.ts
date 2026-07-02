import { io, type Socket } from 'socket.io-client';
import { env } from '@/shared/config/env';

/**
 * Socket.IO client. The backend requires an authenticated handshake, so the
 * JWT is passed via `auth.token`. Rooms are derived server-side from the token
 * — the client never asks to join a specific user/cafe room.
 */
let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  socket = io(env.apiUrl, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
