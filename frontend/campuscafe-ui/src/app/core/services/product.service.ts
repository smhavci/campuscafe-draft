import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface ProductOptionItem {
    id: number;
    name: string;
    extraPrice: number;
}

export interface ProductOption {
    id: number;
    name: string;
    type: 'radio' | 'checkbox';
    isRequired: boolean;
    items: ProductOptionItem[];
}

export interface Product {
    id: number;
    cafeId?: number;
    name: string;
    category: string;
    price: number;
    description: string;
    image: string;
    calories?: number;
    allergens?: string;
    ingredients?: string;
    brandName?: string;
    brandLogo?: string;
    starCost?: number;
    options?: ProductOption[];
}

export interface SearchProduct extends Product {
    cafeName: string;
    cafeSlug: string;
    brandName?: string;
    brandLogo?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
    private apiUrl = `${API_BASE_URL}/products`;

    constructor(private http: HttpClient) { }

    getProducts(): Observable<Product[]> {
        return this.http.get<Product[]>(this.apiUrl);
    }

    getProductById(id: number): Observable<Product> {
        return this.http.get<Product>(`${this.apiUrl}/${id}`);
    }

    searchProducts(params: { q?: string; minPrice?: number; maxPrice?: number; category?: string }): Observable<SearchProduct[]> {
        const query = new URLSearchParams();
        if (params.q) query.set('q', params.q);
        if (params.minPrice !== undefined) query.set('minPrice', String(params.minPrice));
        if (params.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
        if (params.category) query.set('category', params.category);
        const qs = query.toString() ? `?${query.toString()}` : '';
        return this.http.get<SearchProduct[]>(`${this.apiUrl}/search${qs}`);
    }
}
