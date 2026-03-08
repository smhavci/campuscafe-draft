import { Injectable, signal, computed } from '@angular/core';
import { Product } from './product.service';

export interface CartItem {
    product: Product;
    quantity: number;
    note: string;
    discount: number; // percentage, e.g. 20 means 20%
    campaignTitle: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
    private cartItems = signal<CartItem[]>([]);

    readonly items = this.cartItems.asReadonly();

    readonly totalItems = computed(() =>
        this.cartItems().reduce((sum, item) => sum + item.quantity, 0)
    );

    readonly subtotalPrice = computed(() =>
        this.cartItems().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    );

    readonly discountAmount = computed(() =>
        this.cartItems().reduce((sum, item) => {
            const discountPerUnit = item.product.price * (item.discount / 100);
            return sum + discountPerUnit * item.quantity;
        }, 0)
    );

    readonly totalPrice = computed(() =>
        this.subtotalPrice() - this.discountAmount()
    );

    addToCart(product: Product, discount = 0, campaignTitle = ''): void {
        const currentItems = this.cartItems();
        const existingIndex = currentItems.findIndex(item => item.product.id === product.id);

        if (existingIndex >= 0) {
            const updated = [...currentItems];
            updated[existingIndex] = {
                ...updated[existingIndex],
                quantity: updated[existingIndex].quantity + 1,
                // Keep existing discount if already set, or update if new discount is higher
                discount: Math.max(updated[existingIndex].discount, discount),
                campaignTitle: updated[existingIndex].campaignTitle || campaignTitle
            };
            this.cartItems.set(updated);
        } else {
            this.cartItems.set([...currentItems, { product, quantity: 1, note: '', discount, campaignTitle }]);
        }
    }

    removeFromCart(productId: number): void {
        this.cartItems.set(this.cartItems().filter(item => item.product.id !== productId));
    }

    updateQuantity(productId: number, quantity: number): void {
        if (quantity <= 0) {
            this.removeFromCart(productId);
            return;
        }
        const updated = this.cartItems().map(item =>
            item.product.id === productId ? { ...item, quantity } : item
        );
        this.cartItems.set(updated);
    }

    updateNote(productId: number, note: string): void {
        const updated = this.cartItems().map(item =>
            item.product.id === productId ? { ...item, note } : item
        );
        this.cartItems.set(updated);
    }

    clearCart(): void {
        this.cartItems.set([]);
    }
}
