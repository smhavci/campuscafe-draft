import { Component, OnInit, signal } from '@angular/core';
import { ProductService, Product, SearchProduct, ProductOptionItem } from '../../core/services/product.service';
import { CategoryService, Category } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProductCard } from '../../shared/product-card/product-card';
import { ProductDetail } from '../../shared/product-detail/product-detail';
import { SavedDrinkService } from '../../core/services/saved-drink.service';

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [FormsModule, RouterLink, ProductCard, ProductDetail],
    templateUrl: './search.html',
    styleUrl: './search.css'
})
export class Search implements OnInit {
    results = signal<SearchProduct[]>([]);
    categories = signal<Category[]>([]);
    loading = signal(false);
    hasSearched = signal(false);

    searchQuery = '';
    selectedCategory = 'all';
    minPrice: number | undefined;
    maxPrice: number | undefined;

    // Customization Modal State
    selectedProjectForDetail = signal<Product | null>(null);

    private searchSubject = new Subject<string>();

    constructor(
        private productService: ProductService,
        private categoryService: CategoryService,
        public cartService: CartService,
        public favoriteService: FavoriteService,
        public authService: AuthService,
        private savedDrinkService: SavedDrinkService
    ) {
        this.searchSubject.pipe(
            debounceTime(350),
            distinctUntilChanged()
        ).subscribe(query => {
            this.searchQuery = query;
            this.doSearch();
        });
    }

    ngOnInit(): void {
        this.categoryService.getCategories().subscribe(cats => this.categories.set(cats));
        // İlk yüklemede popüler ürünleri göster
        this.doSearch();
    }

    onQueryChange(value: string): void {
        this.searchSubject.next(value);
    }

    doSearch(): void {
        this.loading.set(true);
        this.hasSearched.set(true);
        this.productService.searchProducts({
            q: this.searchQuery || undefined,
            minPrice: this.minPrice,
            maxPrice: this.maxPrice,
            category: this.selectedCategory !== 'all' ? this.selectedCategory : undefined
        }).subscribe({
            next: (results) => {
                this.results.set(results);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    selectCategory(cat: string): void {
        this.selectedCategory = cat;
        this.doSearch();
    }

    clearFilters(): void {
        this.searchQuery = '';
        this.selectedCategory = 'all';
        this.minPrice = undefined;
        this.maxPrice = undefined;
        this.doSearch();
    }

    // Modal Handlers
    openDetail(product: Product): void {
        this.productService.getProductById(product.id).subscribe(fullProduct => {
            this.selectedProjectForDetail.set(fullProduct);
        });
    }

    closeDetail(): void {
        this.selectedProjectForDetail.set(null);
    }

    onAddToCart(product: Product): void {
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
