import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

export interface DashboardOrder {
    id: number;
    status: string;
    totalAmount: number;
    createdAt: string;
    updatedAt?: string;
    customerName: string;
    customerRole: string;
    pickupTime?: string;
    paymentMethod?: string;
    items: DashboardOrderItem[];
}

export interface DashboardOrderItem {
    id: number;
    productName: string;
    productImage: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    note: string;
    status: string;
    cancelReason: string;
    options?: { name: string; price: number }[];
}

export interface Analytics {
    date: string;
    orderCount: number;
    totalRevenue: number;
    byStatus: { status: string; count: number }[];
    topProducts: { name: string; totalQty: number; totalSales: number }[];
}

export interface HistoryResponse {
    orders: DashboardOrder[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private apiUrl = `${API_BASE_URL}/dashboard`;

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        return new HttpHeaders(this.authService.getAuthHeaders());
    }

    getActiveOrders(): Observable<DashboardOrder[]> {
        return this.http.get<DashboardOrder[]>(`${this.apiUrl}/orders`, { headers: this.getHeaders() });
    }

    getHistory(params: { status?: string; date?: string; page?: number; limit?: number } = {}): Observable<HistoryResponse> {
        const query = new URLSearchParams();
        if (params.status) query.set('status', params.status);
        if (params.date)   query.set('date', params.date);
        if (params.page)   query.set('page', String(params.page));
        if (params.limit)  query.set('limit', String(params.limit));
        const qs = query.toString() ? `?${query.toString()}` : '';
        return this.http.get<HistoryResponse>(`${this.apiUrl}/history${qs}`, { headers: this.getHeaders() });
    }

    updateOrderStatus(orderId: number, status: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/orders/${orderId}/status`, { status }, { headers: this.getHeaders() });
    }

    cancelItem(orderId: number, itemId: number, reason: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/orders/${orderId}/items/${itemId}/cancel`, { reason }, { headers: this.getHeaders() });
    }

    getNotificationCount(since: string): Observable<{ count: number }> {
        return this.http.get<{ count: number }>(`${this.apiUrl}/notifications?since=${encodeURIComponent(since)}`, { headers: this.getHeaders() });
    }

    getAnalytics(): Observable<Analytics> {
        return this.http.get<Analytics>(`${this.apiUrl}/analytics`, { headers: this.getHeaders() });
    }

    getWeeklyAnalytics(): Observable<{ date: string; orderCount: number; revenue: number }[]> {
        return this.http.get<any[]>(`${this.apiUrl}/analytics/weekly`, { headers: this.getHeaders() });
    }

    getHourlyDistribution(): Observable<{ hour: number; count: number }[]> {
        return this.http.get<any[]>(`${this.apiUrl}/analytics/hourly`, { headers: this.getHeaders() });
    }

    getCustomerSegments(): Observable<{ role: string; customerCount: number; orderCount: number; totalSpent: number }[]> {
        return this.http.get<any[]>(`${this.apiUrl}/analytics/customers`, { headers: this.getHeaders() });
    }
}
