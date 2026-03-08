import { Component, OnInit, signal } from '@angular/core';
import { OrderService, Order } from '../../core/services/order.service';
import { NotificationService } from '../../core/services/notification.service';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-orders',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './orders.html',
    styleUrl: './orders.css'
})
export class Orders implements OnInit {
    orders = signal<Order[]>([]);
    loading = signal<boolean>(true);

    constructor(private orderService: OrderService, private notificationService: NotificationService) { }

    ngOnInit(): void {
        this.notificationService.markOrdersSeen();
        this.orderService.getOrders().subscribe({
            next: (orders) => {
                this.orders.set(orders);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'preparing': return '⏳ Hazırlanıyor';
            case 'ready': return '✅ Siparişin Hazır';
            case 'cancelled': return '❌ İptal Edildi';
            default: return status;
        }
    }

    getStatusClass(status: string): string {
        return `status-${status}`;
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
