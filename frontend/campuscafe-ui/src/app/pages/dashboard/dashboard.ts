import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { DashboardService, DashboardOrder, DashboardOrderItem, Analytics } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CurrencyPipe, FormsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
    orders = signal<DashboardOrder[]>([]);
    analytics = signal<Analytics | null>(null);
    loading = signal(true);
    private refreshInterval: any;

    // Per-item cancel
    cancellingItemId = signal<number | null>(null);
    cancelReason = '';

    constructor(
        private dashboardService: DashboardService,
        public authService: AuthService,
        private notificationService: NotificationService
    ) { }

    ngOnInit(): void {
        this.notificationService.markDashboardSeen();
        this.loadData();
        this.refreshInterval = setInterval(() => this.loadData(), 15000);
    }

    ngOnDestroy(): void {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
    }

    loadData(): void {
        this.dashboardService.getActiveOrders().subscribe(orders => {
            this.orders.set(orders);
            this.loading.set(false);
        });
        this.dashboardService.getAnalytics().subscribe(analytics => {
            this.analytics.set(analytics);
        });
    }

    updateStatus(orderId: number, status: string): void {
        this.dashboardService.updateOrderStatus(orderId, status).subscribe(() => {
            this.loadData();
        });
    }

    startCancelItem(itemId: number): void {
        this.cancellingItemId.set(itemId);
        this.cancelReason = '';
    }

    confirmCancelItem(orderId: number, itemId: number): void {
        this.dashboardService.cancelItem(orderId, itemId, this.cancelReason).subscribe(() => {
            this.cancellingItemId.set(null);
            this.cancelReason = '';
            this.loadData();
        });
    }

    abortCancelItem(): void {
        this.cancellingItemId.set(null);
        this.cancelReason = '';
    }

    getStatusLabel(status: string): string {
        const map: Record<string, string> = {
            'preparing': '🔥 Hazırlanıyor',
            'ready': '✅ Hazır',
            'delivered': '📦 Teslim Edildi',
            'cancelled': '❌ İptal'
        };
        return map[status] || status;
    }

    getRoleLabel(role: string): string {
        const map: Record<string, string> = {
            'student': '🎓 Öğrenci',
            'teacher': '👨‍🏫 Öğretmen',
            'cafeOwner': '☕ Kafe Sahibi'
        };
        return map[role] || role;
    }
}
