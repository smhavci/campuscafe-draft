import { Component, OnInit, signal } from '@angular/core';
import { ProductService, Product } from '../../core/services/product.service';
import { CategoryService, Category } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { ProductCard } from '../../shared/product-card/product-card';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [ProductCard],
    templateUrl: './menu.html',
    styleUrl: './menu.css'
})
export class Menu implements OnInit {
    products = signal<Product[]>([]);
    categories = signal<Category[]>([]);
    filteredProducts = signal<Product[]>([]);
    activeCategory = signal<string>('all');

    constructor(
        private productService: ProductService,
        private categoryService: CategoryService,
        private cartService: CartService
    ) { }

    ngOnInit(): void {
        this.productService.getProducts().subscribe(products => {
            this.products.set(products);
            this.filteredProducts.set(products);
        });
        this.categoryService.getCategories().subscribe(categories => {
            this.categories.set(categories);
        });
    }

    filterByCategory(categoryName: string): void {
        this.activeCategory.set(categoryName);
        if (categoryName === 'all') {
            this.filteredProducts.set(this.products());
        } else {
            this.filteredProducts.set(this.products().filter(p => p.category === categoryName));
        }
    }

    onAddToCart(product: Product): void {
        this.cartService.addToCart(product);
    }
}
