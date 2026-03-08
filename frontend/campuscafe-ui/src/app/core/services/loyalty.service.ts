import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

export interface LoyaltyCard {
    id: number;
    stamps: number;
    totalRedeemed: number;
    cafeId: number;
    cafeName: string;
    cafeSlug: string;
    cafeImage: string;
    cafeColor: string;
}

export interface CoffeeOption {
    id: number;
    name: string;
    price: number;
    description: string;
    image: string;
}

export interface RedeemResponse {
    message: string;
    card: LoyaltyCard;
    orderId: number;
}

@Injectable({ providedIn: 'root' })
export class LoyaltyService {
    private apiUrl = `${API_BASE_URL}/loyalty`;

    constructor(private http: HttpClient, private authService: AuthService) { }

    getCards(): Observable<LoyaltyCard[]> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.get<LoyaltyCard[]>(this.apiUrl, { headers });
    }

    getCoffees(cafeId: number): Observable<CoffeeOption[]> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.get<CoffeeOption[]>(`${this.apiUrl}/coffees/${cafeId}`, { headers });
    }

    redeemFreeCoffee(cafeId: number, productId: number): Observable<RedeemResponse> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.post<RedeemResponse>(`${this.apiUrl}/redeem`, { cafeId, productId }, { headers });
    }
}
