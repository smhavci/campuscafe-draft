import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService, CartItem } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { WalletService } from '../../core/services/wallet.service';
import { CafeService } from '../../core/services/cafe.service';
import { CurrencyPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [RouterLink, CurrencyPipe, FormsModule, CommonModule],
    templateUrl: './cart.html',
    styleUrl: './cart.css'
})
export class Cart implements OnInit {
    orderPlaced = signal(false);
    orderError = signal('');
    loading = signal(false);

    // Enterprise Checkout State
    pickupTime = signal<string>('');
    paymentMethod = signal<'credit_card' | 'wallet' | 'stars'>('credit_card');

    constructor(
        public cartService: CartService,
        public authService: AuthService,
        public walletService: WalletService,
        private orderService: OrderService,
        private cafeService: CafeService
    ) { }

    ngOnInit(): void {
        if (this.authService.isLoggedIn()) {
            this.walletService.loadBalance().subscribe();
            this.authService.getProfile().subscribe(); // Refresh stars
        }
    }

    increaseQty(item: CartItem): void {
        this.cartService.updateQuantity(item.id, item.quantity + 1);
    }

    decreaseQty(item: CartItem): void {
        this.cartService.updateQuantity(item.id, item.quantity - 1);
    }

    removeItem(item: CartItem): void {
        this.cartService.removeFromCart(item.id);
    }

    updateNote(item: CartItem, note: string): void {
        this.cartService.updateNote(item.id, note);
    }

    getItemUnitPrice(item: CartItem): number {
        const base = item.product.price || 0;
        const extras = item.selectedOptions.reduce((sum, opt) => sum + opt.extraPrice, 0);
        return base + extras;
    }

    getItemTotal(item: CartItem): number {
        const unitPrice = this.getItemUnitPrice(item);
        const discounted = unitPrice * (1 - item.discount / 100);
        return discounted * item.quantity;
    }

    get totalStarCost(): number {
        return this.cartService.items().reduce((sum, item) => {
            const starCost = item.product.starCost || 0;
            return sum + (starCost * item.quantity);
        }, 0);
    }

    setPaymentMethod(method: 'credit_card' | 'wallet' | 'stars'): void {
        this.paymentMethod.set(method);
    }

    placeOrder(): void {
        if (!this.authService.isLoggedIn()) {
            this.orderError.set('Sipariş vermek için giriş yapmalısın');
            return;
        }

        const items = this.cartService.items();
        if (items.length === 0) return;

        const cafeId = items[0].product.cafeId || 0;
        
        // Handle Wallet Balance Check
        if (this.paymentMethod() === 'wallet' && this.walletService.balance() < this.cartService.totalPrice()) {
            this.orderError.set('Cüzdan bakiyesi yetersiz. Lütfen bakiye yükleyin veya kartla ödeyin.');
            return;
        }

        // Handle Stars Balance Check
        if (this.paymentMethod() === 'stars') {
            const userStars = this.authService.currentUser()?.stars || 0;
            if (userStars < this.totalStarCost) {
                this.orderError.set('Yeterli yıldız bakiyen yok. Daha fazla sipariş vererek yıldız kazanabilirsin.');
                return;
            }
        }

        this.submitOrder(cafeId);
    }

    private submitOrder(cafeId: number): void {
        this.loading.set(true);
        this.orderError.set('');

        const orderItems = this.cartService.items().map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            note: item.note || '',
            discount: item.discount || 0,
            options: item.selectedOptions.map(o => o.id)
        }));

        this.orderService.createOrder(
            cafeId, 
            orderItems, 
            this.pickupTime() || undefined, 
            this.paymentMethod()
        ).subscribe({
            next: () => {
                this.loading.set(false);
                this.orderPlaced.set(true);
                this.cartService.clearCart();
                this.walletService.loadBalance().subscribe(); // Refresh balance
                this.authService.getProfile().subscribe(); // Refresh stars
            },
            error: (err) => {
                this.loading.set(false);
                this.orderError.set(err.error?.message || 'Sipariş oluşturulamadı');
            }
        });
    }
}
