import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { OrderService, Order } from '../../core/services/order.service';
import { ReviewService, UserReview } from '../../core/services/review.service';
import { NotificationService } from '../../core/services/notification.service';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-orders',
    standalone: true,
    imports: [RouterLink, FormsModule],
    templateUrl: './orders.html',
    styleUrl: './orders.css'
})
export class Orders implements OnInit, OnDestroy {
    private pollInterval: any;
    orders = signal<Order[]>([]);
    loading = signal<boolean>(true);

    // Timeline
    expandedOrderId = signal<number | null>(null);
    timeline = signal<{ status: string; timestamp: string }[]>([]);
    timelineLoading = signal(false);

    // Reorder
    reorderMsg = signal<string>('');
    reorderLoading = signal<number | null>(null);

    // Reviews
    userReviews = signal<UserReview[]>([]);
    showReviewModal = signal(false);
    reviewProductId = signal(0);
    reviewOrderId = signal(0);
    reviewProductName = signal('');
    reviewRating = signal(0);
    reviewComment = '';
    reviewSubmitting = signal(false);
    reviewMsg = signal('');

    constructor(
        private orderService: OrderService,
        private reviewService: ReviewService,
        private notificationService: NotificationService
    ) { }

    ngOnInit(): void {
        this.notificationService.markOrdersSeen();
        this.loadOrders();

        // Kullanıcının mevcut değerlendirmelerini yükle
        this.reviewService.getUserReviews().subscribe({
            next: (reviews) => this.userReviews.set(reviews),
            error: () => {}
        });

        // Aktif sipariş varsa polling başlat
        this.startPolling();
    }

    ngOnDestroy(): void {
        this.stopPolling();
    }

    loadOrders(): void {
        this.orderService.getOrders().subscribe({
            next: (orders) => {
                this.orders.set(orders);
                this.loading.set(false);
                
                // Sipariş durumları değiştiyse timeline'ı da güncelle
                if (this.expandedOrderId()) {
                    this.refreshTimeline();
                }
            },
            error: () => { this.loading.set(false); }
        });
    }

    private startPolling(): void {
        // Her 10 saniyede bir kontrol et
        this.pollInterval = setInterval(() => {
            const hasActiveOrder = this.orders().some(o => ['preparing', 'ready'].includes(o.status));
            if (hasActiveOrder) {
                this.loadOrders();
            }
        }, 10000);
    }

    private stopPolling(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }

    private refreshTimeline(): void {
        const orderId = this.expandedOrderId();
        if (!orderId) return;
        
        this.orderService.getTimeline(orderId).subscribe({
            next: (res) => this.timeline.set(res.events),
            error: () => {}
        });
    }

    toggleTimeline(orderId: number): void {
        if (this.expandedOrderId() === orderId) {
            this.expandedOrderId.set(null);
            return;
        }
        this.expandedOrderId.set(orderId);
        this.timelineLoading.set(true);
        this.orderService.getTimeline(orderId).subscribe({
            next: (res) => {
                this.timeline.set(res.events);
                this.timelineLoading.set(false);
            },
            error: () => this.timelineLoading.set(false)
        });
    }

    reorder(orderId: number): void {
        this.reorderLoading.set(orderId);
        this.reorderMsg.set('');
        this.orderService.reorder(orderId).subscribe({
            next: (res) => {
                this.reorderLoading.set(null);
                this.reorderMsg.set(`✅ ${res.message} (Sipariş #${res.orderId})`);
                // Siparişleri yeniden yükle
                this.orderService.getOrders().subscribe(orders => this.orders.set(orders));
                setTimeout(() => this.reorderMsg.set(''), 4000);
            },
            error: (err) => {
                this.reorderLoading.set(null);
                this.reorderMsg.set(err.error?.message || 'Tekrar sipariş verilemedi');
                setTimeout(() => this.reorderMsg.set(''), 4000);
            }
        });
    }

    // Reviews
    hasReviewed(productId: number, orderId: number): boolean {
        return this.userReviews().some(r => r.productId === productId && r.orderId === orderId);
    }

    openReviewModal(productId: number, orderId: number, productName: string): void {
        this.reviewProductId.set(productId);
        this.reviewOrderId.set(orderId);
        this.reviewProductName.set(productName);
        this.reviewRating.set(0);
        this.reviewComment = '';
        this.reviewMsg.set('');
        this.showReviewModal.set(true);
    }

    closeReviewModal(): void {
        this.showReviewModal.set(false);
    }

    setRating(star: number): void {
        this.reviewRating.set(star);
    }

    submitReview(): void {
        if (this.reviewRating() === 0) {
            this.reviewMsg.set('Lütfen bir puan seçin');
            return;
        }
        this.reviewSubmitting.set(true);
        this.reviewService.submitReview(
            this.reviewProductId(),
            this.reviewOrderId(),
            this.reviewRating(),
            this.reviewComment
        ).subscribe({
            next: () => {
                this.reviewSubmitting.set(false);
                this.showReviewModal.set(false);
                this.reorderMsg.set('⭐ Değerlendirmeniz kaydedildi!');
                // Değerlendirmeleri güncelle
                this.userReviews.update(r => [...r, {
                    productId: this.reviewProductId(),
                    orderId: this.reviewOrderId(),
                    rating: this.reviewRating()
                }]);
                setTimeout(() => this.reorderMsg.set(''), 3000);
            },
            error: (err) => {
                this.reviewSubmitting.set(false);
                this.reviewMsg.set(err.error?.message || 'Değerlendirme kaydedilemedi');
            }
        });
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'preparing': return '⏳ Hazırlanıyor';
            case 'ready': return '✅ Siparişin Hazır';
            case 'delivered': return '📦 Teslim Edildi';
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

    formatShortTime(dateStr: string): string {
        return new Date(dateStr).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    readonly stars = [1, 2, 3, 4, 5];
}