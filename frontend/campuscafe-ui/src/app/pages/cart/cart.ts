import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService, CartItem } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { CafeService } from '../../core/services/cafe.service';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [RouterLink, CurrencyPipe, FormsModule],
    templateUrl: './cart.html',
    styleUrl: './cart.css'
})
export class Cart {
    orderPlaced = signal(false);
    orderError = signal('');
    loading = signal(false);

    constructor(
        public cartService: CartService,
        public authService: AuthService,
        private orderService: OrderService,
        private cafeService: CafeService
    ) { }

    increaseQty(item: CartItem): void {
        this.cartService.updateQuantity(item.product.id, item.quantity + 1);
    }

    decreaseQty(item: CartItem): void {
        this.cartService.updateQuantity(item.product.id, item.quantity - 1);
    }

    removeItem(item: CartItem): void {
        this.cartService.removeFromCart(item.product.id);
    }

    updateNote(item: CartItem, note: string): void {
        this.cartService.updateNote(item.product.id, note);
    }

    getDiscountedPrice(item: CartItem): number {
        return item.product.price * (1 - item.discount / 100);
    }

    getItemTotal(item: CartItem): number {
        return this.getDiscountedPrice(item) * item.quantity;
    }

    placeOrder(): void {
        if (!this.authService.isLoggedIn()) {
            this.orderError.set('Sipariş vermek için giriş yapmalısın');
            return;
        }

        // ── SAAT KONTROLÜ (yorum satırından çıkarınca aktif olur) ──
        // const cafeId = (this.cartService.items()[0]?.product as any)?.cafeId || null;
        // if (cafeId) {
        //     this.checkCafeHoursAndOrder(cafeId);
        // } else {
        //     this.submitOrder(cafeId);
        // }

        // Saat kontrolü kapalıyken doğrudan sipariş ver:
        const cafeId = (this.cartService.items()[0]?.product as any)?.cafeId || null;
        this.submitOrder(cafeId);
    }

    private checkCafeHoursAndOrder(cafeId: number): void {
        // Get all cafes and find the one matching
        this.cafeService.getCafes().subscribe(cafes => {
            const cafe = cafes.find(c => c.id === cafeId);
            if (cafe) {
                const isOpen = this.isCafeOpen(cafe.openHours);
                if (!isOpen) {
                    this.orderError.set(`☕ Şu an ${cafe.name} kapalı (Çalışma saatleri: ${cafe.openHours}). Lütfen çalışma saatleri içinde tekrar deneyin.`);
                    return;
                }
            }
            this.submitOrder(cafeId);
        });
    }

    private isCafeOpen(openHours: string): boolean {
        // Parse "08:00 - 22:00" format
        const match = openHours.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
        if (!match) return true; // If we can't parse, assume open

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const openMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);
        const closeMinutes = parseInt(match[3]) * 60 + parseInt(match[4]);

        return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }

    private submitOrder(cafeId: number): void {
        this.loading.set(true);
        this.orderError.set('');

        const items = this.cartService.items().map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            note: item.note || '',
            discount: item.discount || 0
        }));

        this.orderService.createOrder(cafeId, items).subscribe({
            next: () => {
                this.loading.set(false);
                this.orderPlaced.set(true);
                this.cartService.clearCart();
            },
            error: (err) => {
                this.loading.set(false);
                this.orderError.set(err.error?.message || 'Sipariş oluşturulamadı');
            }
        });
    }
}
