import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';
import { ProductOptionItem } from './product.service';

export interface SavedDrink {
    id: number;
    name: string;
    productId: number;
    productName: string;
    productImage: string;
    basePrice: number;
    cafeName: string;
    cafeSlug: string;
    selectedOptions: ProductOptionItem[];
    totalPrice: number;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SavedDrinkService {
    private apiUrl = `${API_BASE_URL}/saved-drinks`;

    constructor(private http: HttpClient, private authService: AuthService) { }

    getSavedDrinks(): Observable<SavedDrink[]> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.get<SavedDrink[]>(this.apiUrl, { headers });
    }

    saveDrink(data: { productId: number; name: string; selectedOptions: ProductOptionItem[]; totalPrice: number }): Observable<any> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.post(this.apiUrl, data, { headers });
    }

    deleteSavedDrink(id: number): Observable<any> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.delete(`${this.apiUrl}/${id}`, { headers });
    }
}
