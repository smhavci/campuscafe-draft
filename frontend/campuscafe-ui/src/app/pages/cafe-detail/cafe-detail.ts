import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CafeService, Cafe, CafeCampaign } from '../../core/services/cafe.service';
import { Product, ProductOptionItem, ProductService } from '../../core/services/product.service';
import { CategoryService, Category } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { ProductCard } from '../../shared/product-card/product-card';
import { ProductDetail } from '../../shared/product-detail/product-detail';

@Component({
    selector: 'app-cafe-detail',
    standalone: true,
    imports: [RouterLink, ProductCard, ProductDetail],
    templateUrl: './cafe-detail.html',
    styleUrl: './cafe-detail.css'
})
export class CafeDetail implements OnInit {
    cafe = signal<Cafe | null>(null);
    products = signal<Product[]>([]);
    filteredProducts = signal<Product[]>([]);
    categories = signal<Category[]>([]);
    activeCategory = signal<string>('all');
    campaigns = signal<CafeCampaign[]>([]);
    activeCampaign = signal<CafeCampaign | null>(null);
    visibleCampaigns = signal<CafeCampaign[]>([]);

    showConflictModal = signal(false);
    selectedProduct = signal<Product | null>(null);
    pendingProduct = signal<{ product: Product; selectedOptions: ProductOptionItem[]; discount: number; campaignTitle: string } | null>(null);

    constructor(
        private route: ActivatedRoute,
        private cafeService: CafeService,
        private productService: ProductService,
        private categoryService: CategoryService,
        public cartService: CartService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        const slug = this.route.snapshot.paramMap.get('slug')!;

        this.cafeService.getCafeBySlug(slug).subscribe(cafe => {
            this.cafe.set(cafe);
        });

        this.cafeService.getCafeProducts(slug).subscribe(products => {
            this.products.set(products);
            this.filteredProducts.set(products);

            const uniqueCats = [...new Set(products.map(p => p.category))];
            this.categories.set(uniqueCats.map((name, i) => ({
                id: i + 1,
                name,
                displayName: name.charAt(0).toUpperCase() + name.slice(1),
                icon: name === 'coffee' ? '☕' : name === 'cold drinks' ? '🧊' : name === 'dessert' ? '🍰' : name === 'bakery' ? '🥐' : '🍽️',
                description: ''
            })));
        });

        this.cafeService.getCafeCampaigns(slug).subscribe(campaigns => {
            this.campaigns.set(campaigns);
            const userRole = this.authService.userRole();
            this.visibleCampaigns.set(
                campaigns.filter(c => c.targetRole === 'all' || c.targetRole === userRole)
            );
        });
    }

    filterByCategory(categoryName: string): void {
        this.activeCampaign.set(null);
        this.activeCategory.set(categoryName);
        if (categoryName === 'all') {
            this.filteredProducts.set(this.products());
        } else {
            this.filteredProducts.set(this.products().filter(p => p.category === categoryName));
        }
    }

    selectCampaign(campaign: CafeCampaign): void {
        this.activeCampaign.set(campaign);
        this.activeCategory.set('');
        if (campaign.relatedProductIds) {
            const ids = campaign.relatedProductIds.split(',').map(id => parseInt(id.trim()));
            this.filteredProducts.set(this.products().filter(p => ids.includes(p.id)));
        } else {
            this.filteredProducts.set(this.products());
        }
    }

    clearCampaignFilter(): void {
        this.activeCampaign.set(null);
        this.filterByCategory('all');
    }

    onAddToCart(product: Product): void {
        // If product has options, we should open modal instead of adding directly
        // But some simple products might not have options. 
        // We'll check via getProductById or just use the modal for everything to be safe.
        this.openProductDetail(product);
    }

    openProductDetail(product: Product): void {
        // Fetch full product with options
        this.productService.getProductById(product.id).subscribe(fullProduct => {
            this.selectedProduct.set(fullProduct);
        });
    }

    closeProductDetail(): void {
        this.selectedProduct.set(null);
    }

    onProductDetailConfirm(selectedOptions: ProductOptionItem[]): void {
        const product = this.selectedProduct();
        if (!product) return;

        const { discount, campaignTitle } = this.getBestCampaign(product);
        const cafeName = this.cafe()?.name || '';

        const result = this.cartService.addToCart(product, selectedOptions, discount, campaignTitle, cafeName);

        if (result === 'conflict') {
            this.pendingProduct.set({ product, selectedOptions, discount, campaignTitle });
            this.showConflictModal.set(true);
        }

        this.closeProductDetail();
    }

    confirmClearAndAdd(): void {
        const pending = this.pendingProduct();
        if (!pending) return;

        const cafeName = this.cafe()?.name || '';
        this.cartService.clearCart();
        this.cartService.addToCart(pending.product, pending.selectedOptions, pending.discount, pending.campaignTitle, cafeName);

        this.showConflictModal.set(false);
        this.pendingProduct.set(null);
    }

    cancelConflict(): void {
        this.showConflictModal.set(false);
        this.pendingProduct.set(null);
    }

    private getBestCampaign(product: Product): { discount: number; campaignTitle: string } {
        const userRole = this.authService.userRole();
        let bestDiscount = 0;
        let bestCampaignTitle = '';

        for (const campaign of this.campaigns()) {
            if (campaign.targetRole !== 'all' && campaign.targetRole !== userRole) continue;

            if (campaign.relatedProductIds) {
                const ids = campaign.relatedProductIds.split(',').map(id => parseInt(id.trim()));
                if (ids.includes(product.id)) {
                    const match = campaign.discount.match(/(\d+)/);
                    const discountNum = match ? parseInt(match[1]) : 0;
                    const effectiveDiscount = campaign.discount.includes('%') ? discountNum : 0;

                    if (effectiveDiscount > bestDiscount) {
                        bestDiscount = effectiveDiscount;
                        bestCampaignTitle = campaign.title;
                    }
                }
            }
        }

        return { discount: bestDiscount, campaignTitle: bestCampaignTitle };
    }
}
