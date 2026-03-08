import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Product {
    id: number;
    cafeId?: number;
    name: string;
    category: string;
    price: number;
    description: string;
    image: string;
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
}
