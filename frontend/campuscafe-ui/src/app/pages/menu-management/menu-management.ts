import { Component, OnInit, signal } from '@angular/core';
import { MenuService, MenuProduct, MenuCampaign } from '../../core/services/menu.service';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';

type ActiveTab = 'products' | 'campaigns';

@Component({
    selector: 'app-menu-management',
    standalone: true,
    imports: [FormsModule, CurrencyPipe],
    templateUrl: './menu-management.html',
    styleUrl: './menu-management.css'
})
export class MenuManagement implements OnInit {
    activeTab = signal<ActiveTab>('products');
    products = signal<MenuProduct[]>([]);
    campaigns = signal<MenuCampaign[]>([]);
    loading = signal(true);
    saving = signal(false);
    message = signal<{ text: string; type: 'success' | 'error' } | null>(null);

    // Ürün formu
    showProductForm = signal(false);
    editingProduct = signal<MenuProduct | null>(null);
    productForm: Partial<MenuProduct> = this.emptyProductForm();

    // Kampanya formu
    showCampaignForm = signal(false);
    editingCampaign = signal<MenuCampaign | null>(null);
    campaignForm: Partial<MenuCampaign> = this.emptyCampaignForm();

    categories = ['coffee', 'cold drinks', 'dessert', 'food', 'bakery'];
    targetRoles = [
        { value: 'all', label: 'Herkes' },
        { value: 'student', label: 'Öğrenciler' },
        { value: 'teacher', label: 'Akademisyenler' }
    ];

    constructor(private menuService: MenuService) { }

    ngOnInit(): void {
        this.loadAll();
    }

    loadAll(): void {
        this.loading.set(true);
        this.menuService.getProducts().subscribe({
            next: (products) => {
                this.products.set(products);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
        this.menuService.getCampaigns().subscribe(campaigns => this.campaigns.set(campaigns));
    }

    setTab(tab: ActiveTab): void {
        this.activeTab.set(tab);
        this.closeAllForms();
    }

    // ── Ürün işlemleri ─────────────────────────────────────
    emptyProductForm(): Partial<MenuProduct> {
        return { name: '', category: 'coffee', price: 0, description: '', image: '', isAvailable: true };
    }

    openAddProduct(): void {
        this.editingProduct.set(null);
        this.productForm = this.emptyProductForm();
        this.showProductForm.set(true);
    }

    openEditProduct(product: MenuProduct): void {
        this.editingProduct.set(product);
        this.productForm = { ...product };
        this.showProductForm.set(true);
    }

    closeProductForm(): void {
        this.showProductForm.set(false);
        this.editingProduct.set(null);
        this.productForm = this.emptyProductForm();
    }

    saveProduct(): void {
        if (!this.productForm.name || !this.productForm.category || this.productForm.price === undefined) {
            this.showMessage('İsim, kategori ve fiyat zorunludur', 'error');
            return;
        }
        this.saving.set(true);
        const editing = this.editingProduct();

        const obs = editing
            ? this.menuService.updateProduct(editing.id, this.productForm)
            : this.menuService.addProduct(this.productForm);

        obs.subscribe({
            next: () => {
                this.showMessage(editing ? 'Ürün güncellendi' : 'Ürün eklendi', 'success');
                this.closeProductForm();
                this.menuService.getProducts().subscribe(p => this.products.set(p));
                this.saving.set(false);
            },
            error: () => {
                this.showMessage('İşlem başarısız', 'error');
                this.saving.set(false);
            }
        });
    }

    deleteProduct(product: MenuProduct): void {
        if (!confirm(`"${product.name}" ürününü silmek istediğinizden emin misiniz?`)) return;
        this.menuService.deleteProduct(product.id).subscribe({
            next: (res) => {
                const msg = res.deactivated ? `"${product.name}" aktif siparişlerde olduğu için pasif yapıldı` : `"${product.name}" silindi`;
                this.showMessage(msg, 'success');
                this.menuService.getProducts().subscribe(p => this.products.set(p));
            },
            error: () => this.showMessage('Silme işlemi başarısız', 'error')
        });
    }

    toggleProductAvailability(product: MenuProduct): void {
        this.menuService.updateProduct(product.id, { isAvailable: !product.isAvailable }).subscribe({
            next: (updated) => {
                this.products.update(list => list.map(p => p.id === updated.id ? updated : p));
                this.showMessage(updated.isAvailable ? `"${product.name}" aktif edildi` : `"${product.name}" pasif yapıldı`, 'success');
            },
            error: () => this.showMessage('Güncelleme başarısız', 'error')
        });
    }

    // ── Kampanya işlemleri ─────────────────────────────────
    emptyCampaignForm(): Partial<MenuCampaign> {
        return { title: '', description: '', discount: '', badge: '', validUntil: '', image: '', relatedProductIds: '', targetRole: 'all' };
    }

    openAddCampaign(): void {
        this.editingCampaign.set(null);
        this.campaignForm = this.emptyCampaignForm();
        this.showCampaignForm.set(true);
    }

    openEditCampaign(campaign: MenuCampaign): void {
        this.editingCampaign.set(campaign);
        this.campaignForm = { ...campaign };
        this.showCampaignForm.set(true);
    }

    closeCampaignForm(): void {
        this.showCampaignForm.set(false);
        this.editingCampaign.set(null);
        this.campaignForm = this.emptyCampaignForm();
    }

    saveCampaign(): void {
        if (!this.campaignForm.title) {
            this.showMessage('Kampanya başlığı zorunludur', 'error');
            return;
        }
        this.saving.set(true);
        const editing = this.editingCampaign();

        const obs = editing
            ? this.menuService.updateCampaign(editing.id, this.campaignForm)
            : this.menuService.addCampaign(this.campaignForm);

        obs.subscribe({
            next: () => {
                this.showMessage(editing ? 'Kampanya güncellendi' : 'Kampanya oluşturuldu', 'success');
                this.closeCampaignForm();
                this.menuService.getCampaigns().subscribe(c => this.campaigns.set(c));
                this.saving.set(false);
            },
            error: () => {
                this.showMessage('İşlem başarısız', 'error');
                this.saving.set(false);
            }
        });
    }

    toggleCampaign(campaign: MenuCampaign): void {
        this.menuService.toggleCampaign(campaign.id, !campaign.isActive).subscribe({
            next: (updated) => {
                this.campaigns.update(list => list.map(c => c.id === updated.id ? updated : c));
                this.showMessage(updated.isActive ? 'Kampanya yayına alındı' : 'Kampanya durduruldu', 'success');
            },
            error: () => this.showMessage('Güncelleme başarısız', 'error')
        });
    }

    deleteCampaign(campaign: MenuCampaign): void {
        if (!confirm(`"${campaign.title}" kampanyasını silmek istediğinizden emin misiniz?`)) return;
        this.menuService.deleteCampaign(campaign.id).subscribe({
            next: () => {
                this.showMessage('Kampanya silindi', 'success');
                this.campaigns.update(list => list.filter(c => c.id !== campaign.id));
            },
            error: () => this.showMessage('Silme başarısız', 'error')
        });
    }

    // ── Yardımcı ───────────────────────────────────────────
    closeAllForms(): void {
        this.closeProductForm();
        this.closeCampaignForm();
    }

    showMessage(text: string, type: 'success' | 'error'): void {
        this.message.set({ text, type });
        setTimeout(() => this.message.set(null), 3000);
    }

    getCategoryLabel(cat: string): string {
        const map: Record<string, string> = {
            coffee: '☕ Kahve',
            'cold drinks': '🧊 Soğuk İçecek',
            dessert: '🍰 Tatlı',
            food: '🍽️ Yiyecek',
            bakery: '🥐 Fırın'
        };
        return map[cat] || cat;
    }

    getTargetLabel(role: string): string {
        const map: Record<string, string> = { all: 'Herkes', student: '🎓 Öğrenciler', teacher: '👨‍🏫 Akademisyenler' };
        return map[role] || role;
    }
}