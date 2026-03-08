import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Product } from '../../core/services/product.service';
import { CurrencyPipe } from '@angular/common';

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

    onAddToCart(): void {
        this.addToCart.emit(this.product);
    }
}
