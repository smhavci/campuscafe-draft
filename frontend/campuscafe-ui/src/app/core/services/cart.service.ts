import { Injectable, signal, computed } from '@angular/core';
import { Product, ProductOptionItem } from './product.service';

export interface CartItem {
    id: string; // Unique ID for the item entry in cart (productId + options hash)
    product: Product;
    quantity: number;
    note: string;
    discount: number;
    campaignTitle: string;
    selectedOptions: ProductOptionItem[];
}

@Injectable({ providedIn: 'root' })
export class CartService {
    private cartItems = signal<CartItem[]>([]);

    private lockedCafeId = signal<number | null>(null);
    private lockedCafeName = signal<string>('');

    readonly items       = this.cartItems.asReadonly();
    readonly currentCafeId   = this.lockedCafeId.asReadonly();
    readonly currentCafeName = this.lockedCafeName.asReadonly();

    readonly totalItems = computed(() =>
        this.cartItems().reduce((sum, item) => sum + item.quantity, 0)
    );

    // Calculates base price + option extra prices
    private getItemUnitPrice(item: CartItem): number {
        const basePrice = item.product.price;
        const extraPrice = item.selectedOptions.reduce((sum, opt) => sum + opt.extraPrice, 0);
        return basePrice + extraPrice;
    }

    readonly subtotalPrice = computed(() =>
        this.cartItems().reduce((sum, item) => {
            const unitPrice = this.getItemUnitPrice(item);
            return sum + unitPrice * item.quantity;
        }, 0)
    );

    readonly discountAmount = computed(() =>
        this.cartItems().reduce((sum, item) => {
            const unitPrice = this.getItemUnitPrice(item);
            const discountPerUnit = unitPrice * (item.discount / 100);
            return sum + discountPerUnit * item.quantity;
        }, 0)
    );

    readonly totalPrice = computed(() =>
        this.subtotalPrice() - this.discountAmount()
    );

    addToCart(
        product: Product,
        options: ProductOptionItem[] = [],
        discount = 0,
        campaignTitle = '',
        cafeName = ''
    ): 'added' | 'conflict' {
        const cafeId = (product as any).cafeId as number;

        if (this.cartItems().length > 0 && this.lockedCafeId() !== cafeId) {
            return 'conflict';
        }

        if (this.cartItems().length === 0) {
            this.lockedCafeId.set(cafeId);
            this.lockedCafeName.set(cafeName);
        }

        // Create a unique key based on productId and options IDs to distinguish items
        const optionsKey = options.map(o => o.id).sort().join('-');
        const cartItemId = `${product.id}_${optionsKey}`;

        const currentItems = this.cartItems();
        const existingIndex = currentItems.findIndex(item => item.id === cartItemId);

        if (existingIndex >= 0) {
            const updated = [...currentItems];
            updated[existingIndex] = {
                ...updated[existingIndex],
                quantity: updated[existingIndex].quantity + 1,
                discount: Math.max(updated[existingIndex].discount, discount),
                campaignTitle: updated[existingIndex].campaignTitle || campaignTitle
            };
            this.cartItems.set(updated);
        } else {
            this.cartItems.set([
                ...currentItems,
                { 
                    id: cartItemId,
                    product, 
                    quantity: 1, 
                    note: '', 
                    discount, 
                    campaignTitle,
                    selectedOptions: options
                }
            ]);
        }

        return 'added';
    }

    removeFromCart(cartItemId: string): void {
        const updated = this.cartItems().filter(item => item.id !== cartItemId);
        this.cartItems.set(updated);

        if (updated.length === 0) {
            this.lockedCafeId.set(null);
            this.lockedCafeName.set('');
        }
    }

    updateQuantity(cartItemId: string, quantity: number): void {
        if (quantity <= 0) {
            this.removeFromCart(cartItemId);
            return;
        }
        const updated = this.cartItems().map(item =>
            item.id === cartItemId ? { ...item, quantity } : item
        );
        this.cartItems.set(updated);
    }

    updateNote(cartItemId: string, note: string): void {
        const updated = this.cartItems().map(item =>
            item.id === cartItemId ? { ...item, note } : item
        );
        this.cartItems.set(updated);
    }

    clearCart(): void {
        this.cartItems.set([]);
        this.lockedCafeId.set(null);
        this.lockedCafeName.set('');
    }
}
