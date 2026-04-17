import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

export interface OrderItemOption {
    name: string;
    price: number;
}

export interface OrderItem {
    itemId: number;
    productName: string;
    productImage: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    itemStatus: string;
    cancelReason: string;
    options?: OrderItemOption[];
}

export interface Order {
    id: number;
    status: string;
    totalAmount: number;
    createdAt: string;
    cafeName: string;
    pickupTime?: string;
    paymentMethod?: string;
    items: OrderItem[];
}

@Injectable({ providedIn: 'root' })
export class OrderService {
    private apiUrl = `${API_BASE_URL}/orders`;

    constructor(private http: HttpClient, private authService: AuthService) { }

    createOrder(
        cafeId: number, 
        items: { 
            productId: number; 
            quantity: number; 
            options?: number[]; 
            note?: string 
        }[],
        pickupTime?: string,
        paymentMethod: 'credit_card' | 'wallet' | 'stars' = 'credit_card'
    ): Observable<Order> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.post<Order>(this.apiUrl, { 
            cafeId, 
            items, 
            pickupTime, 
            paymentMethod 
        }, { headers });
    }

    getOrders(): Observable<Order[]> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.get<Order[]>(this.apiUrl, { headers });
    }

    getOrderById(id: number): Observable<Order> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.get<Order>(`${this.apiUrl}/${id}`, { headers });
    }

    getTimeline(orderId: number): Observable<{ orderId: number; currentStatus: string; events: { status: string; timestamp: string }[] }> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.get<any>(`${this.apiUrl}/${orderId}/timeline`, { headers });
    }

    reorder(orderId: number): Observable<{ message: string; orderId: number; totalAmount: number; itemCount: number }> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.post<any>(`${this.apiUrl}/reorder/${orderId}`, {}, { headers });
    }
}
