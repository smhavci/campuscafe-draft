import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Campaign } from '../../core/services/campaign.service';

@Component({
    selector: 'app-campaign-card',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './campaign-card.html',
    styleUrl: './campaign-card.css'
})
export class CampaignCard {
    @Input({ required: true }) campaign!: Campaign;
}
