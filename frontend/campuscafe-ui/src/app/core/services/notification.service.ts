import { Injectable, signal, computed } from '@angular/core';
import { SocketService } from './socket.service';

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
    // Geriye dönük uyumluluk — eski polling dot'ları (navbar hâlâ bunları kullanıyor)
    orderDot = signal(false);
    dashboardDot = signal(false);

    private _notifications = signal<AppNotification[]>([]);
    readonly notifications = this._notifications.asReadonly();
    readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

    constructor(private socket: SocketService) {
        this.listenToSocketEvents();
    }

    private listenToSocketEvents() {
        // Sipariş durumu değişti
        this.socket.on<{ orderId: number; status: string }>('order_status_changed').subscribe(data => {
            if (data.status === 'ready') {
                this.add({
                    type: 'order_ready',
                    title: 'Siparişin hazır!',
                    message: `#${data.orderId} numaralı siparişin teslim almaya hazır.`,
                    link: '/orders',
                });
                this.orderDot.set(true);
            }
        });

        // Yıldız kazanıldı
        this.socket.on<{ amount: number; total: number }>('stars_earned').subscribe(data => {
            this.add({
                type: 'stars_earned',
                title: `+${data.amount} Yıldız Kazandın!`,
                message: `Toplam yıldızın: ${data.total} ⭐`,
                link: '/rewards',
            });
        });

        // Sipariş ürünü iptal edildi
        this.socket.on<{ orderId: number; itemName: string; refundAmount: number }>('order_item_cancelled').subscribe(data => {
            this.add({
                type: 'order_item_cancelled',
                title: 'Ürün İptal Edildi',
                message: `${data.itemName} iptal edildi. ${data.refundAmount.toFixed(2)} TL iade edildi.`,
                link: '/orders',
            });
            this.orderDot.set(true);
        });

        // Kafe sahibi — yeni sipariş
        this.socket.on<{ orderId: number; customerName: string; itemCount: number }>('new_order').subscribe(data => {
            this.add({
                type: 'new_order',
                title: 'Yeni Sipariş!',
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
        this._notifications.update(list => [newNotif, ...list].slice(0, 20));
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

    // Geriye dönük uyumluluk metodları
    markOrdersSeen() {
        this.orderDot.set(false);
        localStorage.setItem('lastOrderCheck', new Date().toISOString());
    }

    markDashboardSeen() {
        this.dashboardDot.set(false);
        localStorage.setItem('lastOrderCheck', new Date().toISOString());
    }
}
