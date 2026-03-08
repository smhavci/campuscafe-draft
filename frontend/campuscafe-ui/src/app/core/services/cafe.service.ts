import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from './product.service';

export interface Cafe {
    id: number;
    name: string;
    slug: string;
    description: string;
    image: string;
    rating: number;
    openHours: string;
    location: string;
    color: string;
}

export interface CafeCampaign {
    id: number;
    title: string;
    description: string;
    discount: string;
    badge: string;
    validUntil: string;
    image: string;
    relatedProductIds: string;
    targetRole: string;
}

@Injectable({ providedIn: 'root' })
export class CafeService {
    private apiUrl = 'http://localhost:3000/api/cafes';

    constructor(private http: HttpClient) { }

    getCafes(): Observable<Cafe[]> {
        return this.http.get<Cafe[]>(this.apiUrl);
    }

    getCafeBySlug(slug: string): Observable<Cafe> {
        return this.http.get<Cafe>(`${this.apiUrl}/${slug}`);
    }

    getCafeProducts(slug: string): Observable<Product[]> {
        return this.http.get<Product[]>(`${this.apiUrl}/${slug}/products`);
    }

    getCafeCampaigns(slug: string): Observable<CafeCampaign[]> {
        return this.http.get<CafeCampaign[]>(`${this.apiUrl}/${slug}/campaigns`);
    }
}

