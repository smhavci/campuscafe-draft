import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private apiUrl = API_BASE_URL;
    private pollInterval: any;

    orderDot = signal(false);
    dashboardDot = signal(false);

    constructor(private http: HttpClient, private authService: AuthService) {
        // Start polling when service is created
        this.startPolling();
    }

    private startPolling(): void {
        // Poll every 10 seconds
        this.pollInterval = setInterval(() => this.checkNotifications(), 10000);
        // Also check immediately
        this.checkNotifications();
    }

    checkNotifications(): void {
        if (!this.authService.isLoggedIn()) return;

        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        const lastChecked = localStorage.getItem('lastOrderCheck') || '2000-01-01T00:00:00';

        if (this.authService.isOwner()) {
            // Owner: check for new incoming orders
            this.http.get<{ count: number }>(
                `${this.apiUrl}/dashboard/notifications?since=${encodeURIComponent(lastChecked)}`,
                { headers }
            ).subscribe({
                next: res => this.dashboardDot.set(res.count > 0),
                error: () => { }
            });
        }

        // All users: check for order status updates
        this.http.get<{ count: number }>(
            `${this.apiUrl}/orders/notifications?since=${encodeURIComponent(lastChecked)}`,
            { headers }
        ).subscribe({
            next: res => this.orderDot.set(res.count > 0),
            error: () => { }
        });
    }

    // Call this when user views orders or dashboard to clear dots
    markOrdersSeen(): void {
        this.orderDot.set(false);
        localStorage.setItem('lastOrderCheck', new Date().toISOString());
    }

    markDashboardSeen(): void {
        this.dashboardDot.set(false);
        localStorage.setItem('lastOrderCheck', new Date().toISOString());
    }
}
