import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoyaltyService, LoyaltyCard, CoffeeOption } from '../../core/services/loyalty.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-rewards',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './rewards.html',
    styleUrl: './rewards.css'
})
export class Rewards implements OnInit {
    cards = signal<LoyaltyCard[]>([]);
    loading = signal(true);
    redeemMsg = signal('');
    redeemError = signal('');

    // Coffee picker modal
    showPicker = signal(false);
    pickerCafeId = signal(0);
    coffeeOptions = signal<CoffeeOption[]>([]);
    pickerLoading = signal(false);
    redeemLoading = signal(false);

    constructor(
        private loyaltyService: LoyaltyService,
        public authService: AuthService
    ) { }

    ngOnInit(): void {
        if (this.authService.isLoggedIn()) {
            this.loadCards();
        } else {
            this.loading.set(false);
        }
    }

    loadCards(): void {
        this.loyaltyService.getCards().subscribe({
            next: cards => {
                this.cards.set(cards);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    getStampArray(stamps: number): boolean[] {
        return Array.from({ length: 9 }, (_, i) => i < stamps);
    }

    canRedeem(card: LoyaltyCard): boolean {
        return card.stamps >= 9;
    }

    openPicker(card: LoyaltyCard): void {
        this.pickerCafeId.set(card.cafeId);
        this.pickerLoading.set(true);
        this.showPicker.set(true);
        this.redeemMsg.set('');
        this.redeemError.set('');

        this.loyaltyService.getCoffees(card.cafeId).subscribe({
            next: coffees => {
                this.coffeeOptions.set(coffees);
                this.pickerLoading.set(false);
            },
            error: () => {
                this.pickerLoading.set(false);
            }
        });
    }

    closePicker(): void {
        this.showPicker.set(false);
        this.coffeeOptions.set([]);
    }

    selectCoffee(coffee: CoffeeOption): void {
        this.redeemLoading.set(true);
        this.loyaltyService.redeemFreeCoffee(this.pickerCafeId(), coffee.id).subscribe({
            next: res => {
                this.redeemLoading.set(false);
                this.redeemMsg.set(res.message);
                this.closePicker();
                this.loadCards();
            },
            error: err => {
                this.redeemLoading.set(false);
                this.redeemError.set(err.error?.message || 'Hata oluştu');
                this.closePicker();
            }
        });
    }
}
