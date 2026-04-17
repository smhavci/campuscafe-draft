import { Component, OnInit, signal } from '@angular/core';
import { AuthService, User } from '../../core/services/auth.service';
import { FavoriteService, FavoriteProduct } from '../../core/services/favorite.service';
import { WalletService } from '../../core/services/wallet.service';
import { SavedDrinkService, SavedDrink } from '../../core/services/saved-drink.service';
import { CartService } from '../../core/services/cart.service';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, CommonModule } from '@angular/common';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [FormsModule, RouterLink, CurrencyPipe, CommonModule],
    templateUrl: './profile.html',
    styleUrl: './profile.css'
})
export class Profile implements OnInit {
    user = signal<User | null>(null);
    loading = signal(true);
    saving  = signal(false);
    message = signal<{ text: string; type: 'success' | 'error' } | null>(null);
    activeSection = signal<'info' | 'password' | 'favorites' | 'saved_drinks' | 'wallet'>('info');

    infoForm = { firstName: '', lastName: '' };
    passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

    favorites = signal<FavoriteProduct[]>([]);
    savedDrinks = signal<SavedDrink[]>([]);
    favLoading = signal(false);

    // Wallet State
    topUpAmount = 50;

    constructor(
        private authService: AuthService,
        public favoriteService: FavoriteService,
        public walletService: WalletService,
        private savedDrinkService: SavedDrinkService,
        private cartService: CartService
    ) { }

    ngOnInit(): void {
        this.authService.getProfile().subscribe({
            next: (user) => {
                this.user.set(user);
                this.infoForm.firstName = user.firstName;
                this.infoForm.lastName  = user.lastName;
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
        
        this.walletService.loadBalance().subscribe();
    }

    saveInfo(): void {
        if (!this.infoForm.firstName.trim() || !this.infoForm.lastName.trim()) {
            this.showMessage('Ad ve soyad boş olamaz', 'error');
            return;
        }

        this.saving.set(true);
        this.authService.updateProfile({
            firstName: this.infoForm.firstName.trim(),
            lastName:  this.infoForm.lastName.trim()
        }).subscribe({
            next: (res) => {
                this.user.set(res.user);
                this.showMessage('Bilgiler güncellendi', 'success');
                this.saving.set(false);
            },
            error: (err) => {
                this.showMessage(err.error?.message || 'Güncelleme başarısız', 'error');
                this.saving.set(false);
            }
        });
    }

    savePassword(): void {
        if (!this.passwordForm.currentPassword) {
            this.showMessage('Mevcut şifrenizi girin', 'error');
            return;
        }
        if (this.passwordForm.newPassword.length < 6) {
            this.showMessage('Yeni şifre en az 6 karakter olmalıdır', 'error');
            return;
        }
        if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
            this.showMessage('Yeni şifreler eşleşmiyor', 'error');
            return;
        }

        this.saving.set(true);
        this.authService.updateProfile({
            currentPassword: this.passwordForm.currentPassword,
            newPassword:     this.passwordForm.newPassword
        }).subscribe({
            next: () => {
                this.showMessage('Şifre değiştirildi', 'success');
                this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
                this.saving.set(false);
            },
            error: (err) => {
                this.showMessage(err.error?.message || 'Şifre değiştirilemedi', 'error');
                this.saving.set(false);
            }
        });
    }

    // Wallet methods
    handleTopUp(): void {
        if (this.topUpAmount <= 0) return;
        this.saving.set(true);
        this.walletService.topUp(this.topUpAmount).subscribe({
            next: () => {
                this.showMessage(`₺${this.topUpAmount} cüzdanınıza eklendi!`, 'success');
                this.saving.set(false);
            },
            error: () => {
                this.showMessage('Bakiye yüklenemedi', 'error');
                this.saving.set(false);
            }
        });
    }

    loadFavorites(): void {
        this.favLoading.set(true);
        this.favoriteService.getFavorites().subscribe({
            next: (favs) => {
                this.favorites.set(favs);
                this.favLoading.set(false);
            },
            error: () => this.favLoading.set(false)
        });
    }

    loadSavedDrinks(): void {
        this.favLoading.set(true);
        this.savedDrinkService.getSavedDrinks().subscribe({
            next: (drinks) => {
                this.savedDrinks.set(drinks);
                this.favLoading.set(false);
            },
            error: () => this.favLoading.set(false)
        });
    }

    setSection(section: 'info' | 'password' | 'favorites' | 'saved_drinks' | 'wallet'): void {
        this.activeSection.set(section);
        if (section === 'favorites' && this.favorites().length === 0) {
            this.loadFavorites();
        }
        if (section === 'saved_drinks' && this.savedDrinks().length === 0) {
            this.loadSavedDrinks();
        }
    }

    removeFavorite(productId: number): void {
        this.favoriteService.toggleFavorite(productId).subscribe(() => {
            this.favorites.update(favs => favs.filter(f => f.productId !== productId));
        });
    }

    removeSavedDrink(drinkId: number): void {
        this.savedDrinkService.deleteSavedDrink(drinkId).subscribe(() => {
            this.savedDrinks.update(drinks => drinks.filter(d => d.id !== drinkId));
            this.showMessage('Kişiselleştirilmiş tarif silindi', 'success');
        });
    }

    orderSavedDrink(drink: SavedDrink): void {
        const product = {
            id: drink.productId,
            name: drink.productName,
            price: drink.basePrice,
            image: drink.productImage,
            category: 'coffee' // varsayılan
        } as any;
        
        this.cartService.addToCart(product, drink.selectedOptions);
        this.showMessage('Tarifiniz sepete eklendi!', 'success');
    }

    getRoleLabel(role: string): string {
        const map: Record<string, string> = {
            student:   '🎓 Öğrenci',
            teacher:   '👨‍🏫 Akademisyen',
            cafeOwner: '☕ Kafe Sahibi'
        };
        return map[role] || role;
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    showMessage(text: string, type: 'success' | 'error'): void {
        this.message.set({ text, type });
        setTimeout(() => this.message.set(null), 3000);
    }
}
