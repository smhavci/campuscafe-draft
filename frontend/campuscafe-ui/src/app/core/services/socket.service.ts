import { Injectable, OnDestroy, effect } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

interface SocketEvent { name: string; data: unknown; }

// Bilinen tüm event isimleri — yeni event eklenince buraya da ekle
const KNOWN_EVENTS = [
    'order_status_changed',
    'stars_earned',
    'order_item_cancelled',
    'new_order',
    'order_updated',
] as const;

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
    private socket: Socket | null = null;
    // Bu Subject her zaman yaşar — socket açık/kapalı fark etmez
    private readonly events$ = new Subject<SocketEvent>();
    private readonly SERVER_URL = 'http://localhost:3000';

    constructor(private auth: AuthService) {
        effect(() => {
            const user = this.auth.currentUser();
            if (user) {
                this.connect(user.id, user.role, user.cafeId);
            } else {
                this.disconnect();
            }
        });
    }

    private connect(userId: number, role: string, cafeId?: number) {
        // Zaten bağlıysa tekrar bağlanma
        if (this.socket?.connected) return;
        this.disconnect(); // önceki socket varsa temizle

        this.socket = io(this.SERVER_URL, {
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] bağlandı:', this.socket?.id);
            this.socket!.emit('join_user', userId);
            if (role === 'cafeOwner' && cafeId) {
                this.socket!.emit('join_cafe', cafeId);
            }
        });

        this.socket.on('connect_error', (err) => {
            console.warn('[Socket] bağlantı hatası:', err.message);
        });

        // Tüm bilinen event'leri Subject'e aktar
        for (const eventName of KNOWN_EVENTS) {
            this.socket.on(eventName, (data: unknown) => {
                console.log('[Socket] event alındı:', eventName, data);
                this.events$.next({ name: eventName, data });
            });
        }
    }

    private disconnect() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /** Belirli bir event'i Observable olarak dinle — her zaman çalışır */
    on<T>(event: string): Observable<T> {
        return this.events$.pipe(
            filter(e => e.name === event),
            map(e => e.data as T),
        );
    }

    ngOnDestroy() {
        this.disconnect();
        this.events$.complete();
    }
}
