import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface OrderItem {
    itemId: number;
    productName: string;
    productImage: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    itemStatus: string;
    cancelReason: string;
}

export interface Order {
    id: number;
    status: string;
    totalAmount: number;
    createdAt: string;
    cafeName: string;
    items: OrderItem[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
    private apiUrl = 'http://localhost:3000/api/orders';

    constructor(private http: HttpClient, private authService: AuthService) { }

    createOrder(cafeId: number, items: { productId: number; quantity: number }[]): Observable<Order> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.post<Order>(this.apiUrl, { cafeId, items }, { headers });
    }

    getOrders(): Observable<Order[]> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.get<Order[]>(this.apiUrl, { headers });
    }

    getOrderById(id: number): Observable<Order> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.get<Order>(`${this.apiUrl}/${id}`, { headers });
    }
}
