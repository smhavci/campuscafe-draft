import { Injectable, signal, computed } from '@angular/core';
import { SocketService } from './socket.service';
import { AuthService } from './auth.service';

export interface AppNotification {
    id: string;
    type: 'order_ready' | 'stars_earned' | 'order_item_cancelled' | 'new_order' | 'order_updated';
    title: string;
    message: string;
    read: boolean;
    timestamp: Date;
    link?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
    orderDot = signal(false);
    dashboardDot = signal(false);

    private _notifications = signal<AppNotification[]>([]);
    private _toasts = signal<AppNotification[]>([]);

    readonly notifications = this._notifications.asReadonly();
    readonly toasts = this._toasts.asReadonly();
    readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

    constructor(private socket: SocketService, private auth: AuthService) {
        this.listenToSocketEvents();
    }

    private listenToSocketEvents() {
        this.socket.on<{ orderId: number; status: string }>('order_status_changed').subscribe(data => {
            if (data.status === 'ready') {
                this.add({
                    type: 'order_ready',
                    title: 'Siparişin hazır! ✅',
                    message: `#${data.orderId} numaralı siparişin teslim almaya hazır.`,
                    link: '/orders',
                });
                this.orderDot.set(true);
            }
        });

        this.socket.on<{ amount: number; total: number }>('stars_earned').subscribe(data => {
            // Navbar ve tüm signal bağlantılarını anında güncelle
            this.auth.updateStars(data.total);
            this.add({
                type: 'stars_earned',
                title: `+${data.amount} Yıldız Kazandın!`,
                message: `Toplam yıldızın: ${data.total} ⭐`,
                link: '/rewards',
            });
        });

        this.socket.on<{ orderId: number; itemName: string; refundAmount: number }>('order_item_cancelled').subscribe(data => {
            this.add({
                type: 'order_item_cancelled',
                title: 'Ürün İptal Edildi',
                message: `${data.itemName} iptal edildi. ${data.refundAmount.toFixed(2)} TL iade edildi.`,
                link: '/orders',
            });
            this.orderDot.set(true);
        });

        this.socket.on<{ orderId: number; customerName: string; itemCount: number }>('new_order').subscribe(data => {
            this.add({
                type: 'new_order',
                title: '🛎️ Yeni Sipariş!',
                message: `${data.customerName} · ${data.itemCount} ürün`,
                link: '/dashboard',
            });
            this.dashboardDot.set(true);
        });
    }

    private add(notif: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) {
        const newNotif: AppNotification = {
            ...notif,
            id: crypto.randomUUID(),
            read: false,
            timestamp: new Date(),
        };
        // Kalıcı panel geçmişi
        this._notifications.update(list => [newNotif, ...list].slice(0, 20));
        // Toast: 5 saniye sonra otomatik kapanır
        this._toasts.update(list => [newNotif, ...list]);
        setTimeout(() => this.dismissToast(newNotif.id), 5000);
    }

    dismissToast(id: string) {
        this._toasts.update(list => list.filter(t => t.id !== id));
    }

    markAllRead() {
        this._notifications.update(list => list.map(n => ({ ...n, read: true })));
        this.orderDot.set(false);
        this.dashboardDot.set(false);
    }

    dismiss(id: string) {
        this._notifications.update(list => list.filter(n => n.id !== id));
    }

    dismissAll() {
        this._notifications.set([]);
        this.orderDot.set(false);
        this.dashboardDot.set(false);
    }

    markOrdersSeen() {
        this.orderDot.set(false);
        localStorage.setItem('lastOrderCheck', new Date().toISOString());
    }

    markDashboardSeen() {
        this.dashboardDot.set(false);
        localStorage.setItem('lastOrderCheck', new Date().toISOString());
    }
}
