import { Component, OnInit, OnDestroy, signal, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { DashboardService, DashboardOrder, DashboardOrderItem, Analytics, HistoryResponse } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

type ActiveTab = 'active' | 'history' | 'analytics';

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

    // Weekly Analytics
    weeklyData = signal<{ date: string; orderCount: number; revenue: number }[]>([]);
    hourlyData = signal<{ hour: number; count: number }[]>([]);
    customerSegments = signal<{ role: string; customerCount: number; orderCount: number; totalSpent: number }[]>([]);
    analyticsLoading = signal(false);

    readonly statusOptions = [
        { value: 'all',       label: 'Tümü' },
        { value: 'preparing', label: '🔥 Hazırlanıyor' },
        { value: 'ready',     label: '✅ Hazır' },
        { value: 'delivered', label: '📦 Teslim Edildi' },
        { value: 'cancelled', label: '❌ İptal' },
    ];

    @ViewChild('weeklyChart') weeklyChartRef!: ElementRef<HTMLCanvasElement>;
    @ViewChild('hourlyChart') hourlyChartRef!: ElementRef<HTMLCanvasElement>;

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
        if (tab === 'history') {
            // Her geçişte taze veri çek — aktif sekmede yapılan değişiklikler anında yansısın
            this.loadHistory(1);
        }
        if (tab === 'active') {
            this.loadData();
        }
        if (tab === 'analytics') {
            this.loadWeeklyAnalytics();
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

    // ── Weekly Analytics ─────────────────────────────────
    loadWeeklyAnalytics(): void {
        this.analyticsLoading.set(true);

        this.dashboardService.getWeeklyAnalytics().subscribe({
            next: (data) => {
                this.weeklyData.set(data);
                this.analyticsLoading.set(false);
                setTimeout(() => this.drawWeeklyChart(), 50);
            },
            error: () => this.analyticsLoading.set(false)
        });

        this.dashboardService.getHourlyDistribution().subscribe({
            next: (data) => {
                this.hourlyData.set(data);
                setTimeout(() => this.drawHourlyChart(), 50);
            }
        });

        this.dashboardService.getCustomerSegments().subscribe({
            next: (data) => this.customerSegments.set(data)
        });
    }

    get weeklyTotalOrders(): number {
        return this.weeklyData().reduce((sum, d) => sum + d.orderCount, 0);
    }

    get weeklyTotalRevenue(): number {
        return this.weeklyData().reduce((sum, d) => sum + d.revenue, 0);
    }

    get peakHour(): number {
        const data = this.hourlyData();
        if (data.length === 0) return 0;
        return data.reduce((max, d) => d.count > max.count ? d : max, data[0]).hour;
    }

    getWeekdayName(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('tr-TR', { weekday: 'short' });
    }

    getRoleLabelShort(role: string): string {
        const map: Record<string, string> = {
            'student': '🎓 Öğrenci',
            'teacher': '👨‍🏫 Öğretmen',
            'cafeOwner': '☕ Kafe Sahibi'
        };
        return map[role] || role;
    }

    // ── Canvas Charts ────────────────────────────────────
    drawWeeklyChart(): void {
        if (!this.weeklyChartRef) return;
        const canvas = this.weeklyChartRef.nativeElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const data = this.weeklyData();
        if (data.length === 0) return;

        const w = canvas.width = canvas.offsetWidth * 2;
        const h = canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        const cw = w / 2;
        const ch = h / 2;

        ctx.clearRect(0, 0, cw, ch);

        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartW = cw - padding.left - padding.right;
        const chartH = ch - padding.top - padding.bottom;

        const maxRev = Math.max(...data.map(d => d.revenue), 1);
        const barW = chartW / data.length * 0.6;
        const gap = chartW / data.length;

        // Bars
        data.forEach((d, i) => {
            const barH = (d.revenue / maxRev) * chartH;
            const x = padding.left + i * gap + (gap - barW) / 2;
            const y = padding.top + chartH - barH;

            // Gradient bar
            const grad = ctx.createLinearGradient(x, y, x, y + barH);
            grad.addColorStop(0, 'rgba(200, 169, 126, 0.9)');
            grad.addColorStop(1, 'rgba(200, 169, 126, 0.3)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, barW, barH, 4);
            ctx.fill();

            // Day label
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.getWeekdayName(d.date), padding.left + i * gap + gap / 2, ch - 10);

            // Value label
            if (d.revenue > 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = '9px Inter, sans-serif';
                ctx.fillText(`₺${d.revenue}`, padding.left + i * gap + gap / 2, y - 5);
            }
        });

        // Y-axis line
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartH);
        ctx.stroke();
    }

    drawHourlyChart(): void {
        if (!this.hourlyChartRef) return;
        const canvas = this.hourlyChartRef.nativeElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const data = this.hourlyData().filter(d => d.hour >= 7 && d.hour <= 22);
        if (data.length === 0) return;

        const w = canvas.width = canvas.offsetWidth * 2;
        const h = canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        const cw = w / 2;
        const ch = h / 2;

        ctx.clearRect(0, 0, cw, ch);

        const padding = { top: 20, right: 20, bottom: 35, left: 30 };
        const chartW = cw - padding.left - padding.right;
        const chartH = ch - padding.top - padding.bottom;

        const maxCount = Math.max(...data.map(d => d.count), 1);
        const gap = chartW / (data.length - 1 || 1);

        // Area fill
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartH);
        data.forEach((d, i) => {
            const x = padding.left + i * gap;
            const y = padding.top + chartH - (d.count / maxCount) * chartH;
            if (i === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(padding.left + (data.length - 1) * gap, padding.top + chartH);
        ctx.closePath();
        const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        areaGrad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
        areaGrad.addColorStop(1, 'rgba(99, 102, 241, 0.02)');
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Line
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((d, i) => {
            const x = padding.left + i * gap;
            const y = padding.top + chartH - (d.count / maxCount) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Points & labels
        data.forEach((d, i) => {
            const x = padding.left + i * gap;
            const y = padding.top + chartH - (d.count / maxCount) * chartH;

            if (d.count > 0) {
                ctx.fillStyle = '#6366f1';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Hour label
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '9px Inter, sans-serif';
            ctx.textAlign = 'center';
            if (i % 2 === 0) {
                ctx.fillText(`${d.hour}:00`, x, ch - 8);
            }
        });
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

    formatShortTime(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
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
