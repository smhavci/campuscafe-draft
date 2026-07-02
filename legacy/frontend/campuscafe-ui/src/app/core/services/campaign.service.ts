import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Campaign {
    id: number;
    title: string;
    description: string;
    discount: string;
    badge: string;
    validUntil: string;
    image: string;
    cafeId: number;
    cafeName: string;
    cafeSlug: string;
    relatedProductIds: string;
}

@Injectable({ providedIn: 'root' })
export class CampaignService {
    private apiUrl = `${API_BASE_URL}/campaigns`;

    constructor(private http: HttpClient) { }

    getCampaigns(): Observable<Campaign[]> {
        return this.http.get<Campaign[]>(this.apiUrl);
    }
}
