import { Component, OnInit, signal } from '@angular/core';
import { CampaignService, Campaign } from '../../core/services/campaign.service';
import { CampaignCard } from '../../shared/campaign-card/campaign-card';

@Component({
    selector: 'app-campaigns',
    standalone: true,
    imports: [CampaignCard],
    templateUrl: './campaigns.html',
    styleUrl: './campaigns.css'
})
export class Campaigns implements OnInit {
    campaigns = signal<Campaign[]>([]);

    constructor(private campaignService: CampaignService) { }

    ngOnInit(): void {
        this.campaignService.getCampaigns().subscribe(campaigns => {
            this.campaigns.set(campaigns);
        });
    }
}
