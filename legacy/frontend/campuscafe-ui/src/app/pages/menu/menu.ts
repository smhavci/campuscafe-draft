import { Component, OnInit, signal, computed } from '@angular/core';
import { ProductService, Product, ProductOptionItem } from '../../core/services/product.service';
import { CategoryService, Category } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { ProductCard } from '../../shared/product-card/product-card';
import { ProductDetail } from '../../shared/product-detail/product-detail';
import { SavedDrinkService } from '../../core/services/saved-drink.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [ProductCard, ProductDetail, FormsModule],
    templateUrl: './menu.html',
    styleUrl: './menu.css'
})
export class Menu implements OnInit {
    products = signal<Product[]>([]);
    categories = signal<Category[]>([]);
    activeCategory = signal<string>('all');
    searchQuery = signal<string>('');

    filteredProducts = computed(() => {
        let list = this.products();
        if (this.activeCategory() !== 'all') {
            list = list.filter(p => p.category === this.activeCategory());
        }
        const q = this.searchQuery().trim().toLowerCase();
        if (q) {
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q)
            );
        }
        return list;
    });

    countByCategory = computed(() => {
        const counts: Record<string, number> = { all: this.products().length };
        for (const p of this.products()) {
            counts[p.category] = (counts[p.category] ?? 0) + 1;
        }
        return counts;
    });

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
        });
        this.categoryService.getCategories().subscribe(categories => {
            this.categories.set(categories);
        });
    }

    filterByCategory(categoryName: string): void {
        this.activeCategory.set(categoryName);
    }

    onSearch(query: string): void {
        this.searchQuery.set(query);
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
