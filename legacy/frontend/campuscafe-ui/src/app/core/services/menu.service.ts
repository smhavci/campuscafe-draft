import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

export interface MenuProduct {
    id: number;
    name: string;
    category: string;
    price: number;
    description: string;
    image: string;
    isAvailable: boolean;
}

export interface MenuCampaign {
    id: number;
    title: string;
    description: string;
    discount: string;
    badge: string;
    validUntil: string;
    image: string;
    relatedProductIds: string;
    targetRole: string;
    isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class MenuService {
    private apiUrl = `${API_BASE_URL}/menu`;

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders(this.authService.getAuthHeaders());
    }

    // ── Ürün işlemleri ─────────────────────────────────────
    getProducts(): Observable<MenuProduct[]> {
        return this.http.get<MenuProduct[]>(`${this.apiUrl}/products`, { headers: this.getHeaders() });
    }

    addProduct(data: Partial<MenuProduct>): Observable<MenuProduct> {
        return this.http.post<MenuProduct>(`${this.apiUrl}/products`, data, { headers: this.getHeaders() });
    }

    updateProduct(id: number, data: Partial<MenuProduct>): Observable<MenuProduct> {
        return this.http.patch<MenuProduct>(`${this.apiUrl}/products/${id}`, data, { headers: this.getHeaders() });
    }

    deleteProduct(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/products/${id}`, { headers: this.getHeaders() });
    }

    // ── Kampanya işlemleri ─────────────────────────────────
    getCampaigns(): Observable<MenuCampaign[]> {
        return this.http.get<MenuCampaign[]>(`${this.apiUrl}/campaigns`, { headers: this.getHeaders() });
    }

    addCampaign(data: Partial<MenuCampaign>): Observable<MenuCampaign> {
        return this.http.post<MenuCampaign>(`${this.apiUrl}/campaigns`, data, { headers: this.getHeaders() });
    }

    updateCampaign(id: number, data: Partial<MenuCampaign>): Observable<MenuCampaign> {
        return this.http.patch<MenuCampaign>(`${this.apiUrl}/campaigns/${id}`, data, { headers: this.getHeaders() });
    }

    deleteCampaign(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/campaigns/${id}`, { headers: this.getHeaders() });
    }

    toggleCampaign(id: number, isActive: boolean): Observable<MenuCampaign> {
        return this.http.patch<MenuCampaign>(`${this.apiUrl}/campaigns/${id}`, { isActive }, { headers: this.getHeaders() });
    }
}