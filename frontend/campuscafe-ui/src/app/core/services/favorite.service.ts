import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

export interface FavoriteProduct {
    id: number;
    productId: number;
    name: string;
    category: string;
    price: number;
    description: string;
    image: string;
    cafeId: number;
    cafeName: string;
    cafeSlug: string;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FavoriteService {
    private apiUrl = `${API_BASE_URL}/favorites`;

    /** Favori ürün ID'leri — hızlı UI kontrolü için */
    favoriteIds = signal<Set<number>>(new Set());

    constructor(private http: HttpClient, private authService: AuthService) {
        // Login durumunda favorileri yükle
        if (this.authService.isLoggedIn()) {
            this.loadFavoriteIds();
        }
    }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders(this.authService.getAuthHeaders());
    }

    loadFavoriteIds(): void {
        this.http.get<number[]>(`${this.apiUrl}/ids`, { headers: this.getHeaders() }).subscribe({
            next: (ids) => this.favoriteIds.set(new Set(ids)),
            error: () => {}
        });
    }

    getFavorites(): Observable<FavoriteProduct[]> {
        return this.http.get<FavoriteProduct[]>(this.apiUrl, { headers: this.getHeaders() });
    }

    toggleFavorite(productId: number): Observable<{ action: string; productId: number }> {
        return this.http.post<{ action: string; productId: number }>(
            `${this.apiUrl}/${productId}`, {}, { headers: this.getHeaders() }
        ).pipe(
            tap(res => {
                const current = new Set(this.favoriteIds());
                if (res.action === 'added') {
                    current.add(productId);
                } else {
                    current.delete(productId);
                }
                this.favoriteIds.set(current);
            })
        );
    }

    isFavorite(productId: number): boolean {
        return this.favoriteIds().has(productId);
    }
}
