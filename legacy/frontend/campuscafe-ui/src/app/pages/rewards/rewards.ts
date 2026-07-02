import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoyaltyService, LoyaltyCard, CoffeeOption, LoyaltyStatus, StarHistory } from '../../core/services/loyalty.service';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';

@Component({
    selector: 'app-rewards',
    standalone: true,
    imports: [RouterLink, CommonModule, DatePipe],
    templateUrl: './rewards.html',
    styleUrl: './rewards.css'
})
export class Rewards implements OnInit, OnDestroy {
    cards = signal<LoyaltyCard[]>([]);
    starStatus = signal<LoyaltyStatus | null>(null);
    starHistory = signal<StarHistory[]>([]);
    loading = signal(true);
    redeemMsg = signal('');
    redeemError = signal('');

    // Coffee picker modal
    showPicker = signal(false);
    pickerCafeId = signal(0);
    coffeeOptions = signal<CoffeeOption[]>([]);
    pickerLoading = signal(false);
    redeemLoading = signal(false);

    private sub?: Subscription;

    constructor(
        private loyaltyService: LoyaltyService,
        public authService: AuthService,
        private socket: SocketService,
    ) { }

    ngOnInit(): void {
        if (this.authService.isLoggedIn()) {
            this.loadLoyaltyData();
        } else {
            this.loading.set(false);
        }

        // Yıldız kazanılınca sayfa açıksa status'u canlı yenile
        this.sub = this.socket.on<{ amount: number; total: number }>('stars_earned')
            .subscribe(() => {
                this.loyaltyService.getStatus().subscribe(s => this.starStatus.set(s));
                this.loyaltyService.getHistory().subscribe(h => this.starHistory.set(h));
            });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    loadLoyaltyData(): void {
        this.loading.set(true);
        this.loyaltyService.getCards().subscribe(cards => this.cards.set(cards));
        this.loyaltyService.getStatus().subscribe(status => this.starStatus.set(status));
        this.loyaltyService.getHistory().subscribe(history => this.starHistory.set(history));
        
        // Wait a bit to hide loader
        setTimeout(() => this.loading.set(false), 800);
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
                this.loadLoyaltyData();
            },
            error: err => {
                this.redeemLoading.set(false);
                this.redeemError.set(err.error?.message || 'Hata oluştu');
                this.closePicker();
            }
        });
    }
}
