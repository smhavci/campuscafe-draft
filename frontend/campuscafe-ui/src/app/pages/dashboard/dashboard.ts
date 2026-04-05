import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { DashboardService, DashboardOrder, DashboardOrderItem, Analytics, HistoryResponse } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

type ActiveTab = 'active' | 'history';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CurrencyPipe, FormsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
    activeTab = signal<ActiveTab>('active');

    // Aktif siparişler
    orders = signal<DashboardOrder[]>([]);
    analytics = signal<Analytics | null>(null);
    loading = signal(true);
    private refreshInterval: any;

    // Per-item cancel
    cancellingItemId = signal<number | null>(null);
    cancelReason = '';

    // Sipariş geçmişi
    historyOrders = signal<DashboardOrder[]>([]);
    historyLoading = signal(false);
    historyPagination = signal<HistoryResponse['pagination'] | null>(null);
    historyPage = signal(1);
    historyStatusFilter = signal('all');
    historyDateFilter = signal('');
    expandedHistoryOrderId = signal<number | null>(null);

    readonly statusOptions = [
        { value: 'all',       label: 'Tümü' },
        { value: 'preparing', label: '🔥 Hazırlanıyor' },
        { value: 'ready',     label: '✅ Hazır' },
        { value: 'delivered', label: '📦 Teslim Edildi' },
        { value: 'cancelled', label: '❌ İptal' },
    ];

    constructor(
        private dashboardService: DashboardService,
        public authService: AuthService,
        private notificationService: NotificationService
    ) { }

    ngOnInit(): void {
        this.notificationService.markDashboardSeen();
        this.loadData();
        this.refreshInterval = setInterval(() => {
            if (this.activeTab() === 'active') this.loadData();
        }, 15000);
    }

    ngOnDestroy(): void {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
    }

    // ── Sekme yönetimi ─────────────────────────────────
    setTab(tab: ActiveTab): void {
        this.activeTab.set(tab);
        if (tab === 'history' && this.historyOrders().length === 0) {
            this.loadHistory(1);
        }
        if (tab === 'active') {
            this.loadData();
        }
    }

    // ── Aktif siparişler ────────────────────────────────
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

    // ── Sipariş geçmişi ─────────────────────────────────
    loadHistory(page = 1): void {
        this.historyLoading.set(true);
        this.historyPage.set(page);
        this.dashboardService.getHistory({
            status: this.historyStatusFilter(),
            date:   this.historyDateFilter(),
            page,
            limit: 15
        }).subscribe({
            next: (res) => {
                this.historyOrders.set(res.orders);
                this.historyPagination.set(res.pagination);
                this.historyLoading.set(false);
                this.expandedHistoryOrderId.set(null);
            },
            error: () => this.historyLoading.set(false)
        });
    }

    applyHistoryFilters(): void {
        this.loadHistory(1);
    }

    clearHistoryFilters(): void {
        this.historyStatusFilter.set('all');
        this.historyDateFilter.set('');
        this.loadHistory(1);
    }

    toggleHistoryOrder(orderId: number): void {
        this.expandedHistoryOrderId.set(
            this.expandedHistoryOrderId() === orderId ? null : orderId
        );
    }

    prevPage(): void {
        if (this.historyPage() > 1) this.loadHistory(this.historyPage() - 1);
    }

    nextPage(): void {
        const p = this.historyPagination();
        if (p && this.historyPage() < p.totalPages) this.loadHistory(this.historyPage() + 1);
    }

    // ── Yardımcılar ─────────────────────────────────────
    getStatusLabel(status: string): string {
        const map: Record<string, string> = {
            'preparing': '🔥 Hazırlanıyor',
            'ready':     '✅ Hazır',
            'delivered': '📦 Teslim Edildi',
            'cancelled': '❌ İptal'
        };
        return map[status] || status;
    }

    getRoleLabel(role: string): string {
        const map: Record<string, string> = {
            'student':   '🎓 Öğrenci',
            'teacher':   '👨‍🏫 Öğretmen',
            'cafeOwner': '☕ Kafe Sahibi'
        };
        return map[role] || role;
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // FIX: UTC yerine local saat kullan (timezone sorunu)
    get todayISO(): string {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
}
