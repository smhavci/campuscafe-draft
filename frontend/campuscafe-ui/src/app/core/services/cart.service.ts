import { Injectable, signal, computed } from '@angular/core';
import { Product } from './product.service';

export interface CartItem {
    product: Product;
    quantity: number;
    note: string;
    discount: number;
    campaignTitle: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
    private cartItems = signal<CartItem[]>([]);

    // Sepetteki ürünlerin hangi kafeye ait olduğunu tutar.
    // İlk ürün eklenince set edilir, sepet temizlenince null olur.
    // Farklı kafeden ürün eklenmeye çalışılınca bunu kontrol ederiz.
    private lockedCafeId = signal<number | null>(null);
    private lockedCafeName = signal<string>('');

    readonly items       = this.cartItems.asReadonly();
    readonly currentCafeId   = this.lockedCafeId.asReadonly();
    readonly currentCafeName = this.lockedCafeName.asReadonly();

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

    // ─────────────────────────────────────────────────────────
    // addToCart() — Ürünü sepete ekler.
    //
    // Dönüş değeri:
    //   'added'        → başarıyla eklendi
    //   'conflict'     → farklı kafe, kullanıcıya sor
    //
    // Neden boolean değil string döndürüyoruz?
    // İleride başka durumlar eklenebilir (ör: stok yok).
    // String daha açıklayıcı ve genişletilebilir.
    // ─────────────────────────────────────────────────────────
    addToCart(
        product: Product,
        discount = 0,
        campaignTitle = '',
        cafeName = ''
    ): 'added' | 'conflict' {
        const cafeId = (product as any).cafeId as number;

        // Sepet doluysa ve farklı kafe geliyorsa — çakışma var
        if (this.cartItems().length > 0 && this.lockedCafeId() !== cafeId) {
            return 'conflict';
        }

        // Sepet boşsa veya aynı kafeyse — kilidi set et
        if (this.cartItems().length === 0) {
            this.lockedCafeId.set(cafeId);
            this.lockedCafeName.set(cafeName);
        }

        const currentItems = this.cartItems();
        const existingIndex = currentItems.findIndex(item => item.product.id === product.id);

        if (existingIndex >= 0) {
            // Ürün zaten sepette — miktarı artır
            const updated = [...currentItems];
            updated[existingIndex] = {
                ...updated[existingIndex],
                quantity: updated[existingIndex].quantity + 1,
                discount: Math.max(updated[existingIndex].discount, discount),
                campaignTitle: updated[existingIndex].campaignTitle || campaignTitle
            };
            this.cartItems.set(updated);
        } else {
            // Yeni ürün ekle
            this.cartItems.set([
                ...currentItems,
                { product, quantity: 1, note: '', discount, campaignTitle }
            ]);
        }

        return 'added';
    }

    removeFromCart(productId: number): void {
        const updated = this.cartItems().filter(item => item.product.id !== productId);
        this.cartItems.set(updated);

        // Sepet boşaldıysa kilidi kaldır
        if (updated.length === 0) {
            this.lockedCafeId.set(null);
            this.lockedCafeName.set('');
        }
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

    // Sepeti tamamen temizle ve kilidi sıfırla
    clearCart(): void {
        this.cartItems.set([]);
        this.lockedCafeId.set(null);
        this.lockedCafeName.set('');
    }
}
