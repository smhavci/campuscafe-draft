import { Injectable, OnDestroy, effect } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
    private socket: Socket | null = null;
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
        if (this.socket?.connected) return;

        this.socket = io(this.SERVER_URL, { transports: ['polling', 'websocket'] });

        this.socket.on('connect', () => {
            this.socket!.emit('join_user', userId);
            if (role === 'cafeOwner' && cafeId) {
                this.socket!.emit('join_cafe', cafeId);
            }
        });
    }

    private disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }

    on<T>(event: string): Observable<T> {
        return new Observable((observer) => {
            this.socket?.on(event, (data: T) => observer.next(data));
            return () => this.socket?.off(event);
        });
    }

    ngOnDestroy() {
        this.disconnect();
    }
}
