import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampaignService, Campaign } from '../../core/services/campaign.service';
import { CafeService, Cafe } from '../../core/services/cafe.service';
import { CampaignCard } from '../../shared/campaign-card/campaign-card';
import { CafeCard } from '../../shared/cafe-card/cafe-card';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterLink, CampaignCard, CafeCard],
    templateUrl: './home.html',
    styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {
    cafes = signal<Cafe[]>([]);
    featuredCampaigns = signal<Campaign[]>([]);
    currentTime = signal('');
    currentDate = signal('');
    private clockInterval: any;

    constructor(
        private cafeService: CafeService,
        private campaignService: CampaignService
    ) { }

    ngOnInit(): void {
        this.cafeService.getCafes().subscribe(cafes => {
            this.cafes.set(cafes);
        });
        this.campaignService.getCampaigns().subscribe(campaigns => {
            this.featuredCampaigns.set(campaigns.slice(0, 3));
        });

        // Live clock
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 1000);
    }

    ngOnDestroy(): void {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
    }

    private updateClock(): void {
        const now = new Date();
        this.currentTime.set(
            now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
        this.currentDate.set(
            now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        );
    }

    isCafeOpen(cafe: Cafe): boolean {
        const match = cafe.openHours.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
        if (!match) return true;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const openMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);
        const closeMinutes = parseInt(match[3]) * 60 + parseInt(match[4]);
        return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    }
}
