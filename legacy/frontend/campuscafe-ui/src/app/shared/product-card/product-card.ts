import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Product } from '../../core/services/product.service';
import { CurrencyPipe } from '@angular/common';
import { FavoriteService } from '../../core/services/favorite.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [CurrencyPipe],
    templateUrl: './product-card.html',
    styleUrl: './product-card.css'
})
export class ProductCard {
    @Input({ required: true }) product!: Product;
    @Output() addToCart = new EventEmitter<Product>();
    @Output() explore = new EventEmitter<Product>();

    constructor(
        public favoriteService: FavoriteService,
        public authService: AuthService
    ) {}

    onAddToCart(event: Event): void {
        event.stopPropagation();
        this.addToCart.emit(this.product);
    }

    onExplore(): void {
        this.explore.emit(this.product);
    }

    toggleFavorite(event: Event): void {
        event.stopPropagation();
        if (!this.authService.isLoggedIn()) return;
        this.favoriteService.toggleFavorite(this.product.id).subscribe();
    }

    get isFav(): boolean {
        return this.favoriteService.isFavorite(this.product.id);
    }

    getAllergens(allergens: string): string[] {
        return allergens.split(',').map(a => a.trim()).filter(Boolean);
    }

    getCategoryLabel(cat: string): string {
        const map: Record<string, string> = {
            coffee: '☕ Kahve',
            'cold drinks': '🧊 Soğuk',
            dessert: '🍰 Tatlı',
            food: '🥪 Yemek',
            bakery: '🥐 Unlu',
        };
        return map[cat] ?? cat;
    }
}
