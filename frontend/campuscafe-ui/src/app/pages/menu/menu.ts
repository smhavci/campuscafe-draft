import { Component, OnInit, signal } from '@angular/core';
import { ProductService, Product, ProductOptionItem } from '../../core/services/product.service';
import { CategoryService, Category } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { ProductCard } from '../../shared/product-card/product-card';
import { ProductDetail } from '../../shared/product-detail/product-detail';
import { SavedDrinkService } from '../../core/services/saved-drink.service';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [ProductCard, ProductDetail],
    templateUrl: './menu.html',
    styleUrl: './menu.css'
})
export class Menu implements OnInit {
    products = signal<Product[]>([]);
    categories = signal<Category[]>([]);
    filteredProducts = signal<Product[]>([]);
    activeCategory = signal<string>('all');

    // Customization Modal State
    selectedProjectForDetail = signal<Product | null>(null);

    constructor(
        private productService: ProductService,
        private categoryService: CategoryService,
        private cartService: CartService,
        private savedDrinkService: SavedDrinkService
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

    openDetail(product: Product): void {
        // Fetch full product details (including options) from backend
        this.productService.getProductById(product.id).subscribe(fullProduct => {
            this.selectedProjectForDetail.set(fullProduct);
        });
    }

    closeDetail(): void {
        this.selectedProjectForDetail.set(null);
    }

    onAddToCart(product: Product): void {
        // Direct add to cart (no options)
        this.cartService.addToCart(product);
    }

    onConfirmCustomization(options: ProductOptionItem[]): void {
        const product = this.selectedProjectForDetail();
        if (product) {
            this.cartService.addToCart(product, options);
            this.closeDetail();
        }
    }

    onSaveFavorite(data: { name: string; options: ProductOptionItem[]; totalPrice: number }): void {
        const product = this.selectedProjectForDetail();
        if (product) {
            this.savedDrinkService.saveDrink({
                productId: product.id,
                name: data.name,
                selectedOptions: data.options,
                totalPrice: data.totalPrice
            }).subscribe({
                next: () => {
                    alert(`'${data.name}' favori tariflerinize eklendi!`);
                },
                error: (err) => {
                    console.error('Favori kaydedilemedi:', err);
                    alert('Bir hata oluştu, lütfen tekrar deneyin.');
                }
            });
        }
    }
}
