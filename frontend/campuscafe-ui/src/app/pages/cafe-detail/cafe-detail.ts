import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CafeService, Cafe, CafeCampaign } from '../../core/services/cafe.service';
import { Product } from '../../core/services/product.service';
import { CategoryService, Category } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { ProductCard } from '../../shared/product-card/product-card';

@Component({
    selector: 'app-cafe-detail',
    standalone: true,
    imports: [RouterLink, ProductCard],
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
    // All campaigns visible to the current user (filtered by role)
    visibleCampaigns = signal<CafeCampaign[]>([]);

    constructor(
        private route: ActivatedRoute,
        private cafeService: CafeService,
        private categoryService: CategoryService,
        private cartService: CartService,
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
            // Filter campaigns by user role
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
        // Auto-find the best matching campaign for this product based on user role
        const userRole = this.authService.userRole();
        const campaigns = this.campaigns();

        let bestDiscount = 0;
        let bestCampaignTitle = '';

        for (const campaign of campaigns) {
            // Skip campaigns not for this user's role
            if (campaign.targetRole !== 'all' && campaign.targetRole !== userRole) {
                continue;
            }

            // Check if product is in this campaign's related products
            if (campaign.relatedProductIds) {
                const ids = campaign.relatedProductIds.split(',').map(id => parseInt(id.trim()));
                if (ids.includes(product.id)) {
                    const match = campaign.discount.match(/(\d+)/);
                    const discountNum = match ? parseInt(match[1]) : 0;
                    const isPercentage = campaign.discount.includes('%');
                    const effectiveDiscount = isPercentage ? discountNum : 0;

                    if (effectiveDiscount > bestDiscount) {
                        bestDiscount = effectiveDiscount;
                        bestCampaignTitle = campaign.title;
                    }
                }
            }
        }

        this.cartService.addToCart(product, bestDiscount, bestCampaignTitle);
    }
}
