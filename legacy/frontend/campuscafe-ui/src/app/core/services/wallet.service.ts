import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

export interface WalletInfo {
    balance: number;
}

@Injectable({ providedIn: 'root' })
export class WalletService {
    private apiUrl = `${API_BASE_URL}/wallet`;
    private balanceSignal = signal<number>(0);

    readonly balance = this.balanceSignal.asReadonly();

    constructor(private http: HttpClient, private authService: AuthService) { }

    loadBalance(): Observable<WalletInfo> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.get<WalletInfo>(this.apiUrl, { headers }).pipe(
            tap(info => this.balanceSignal.set(info.balance))
        );
    }

    topUp(amount: number): Observable<WalletInfo> {
        const headers = new HttpHeaders(this.authService.getAuthHeaders());
        return this.http.post<WalletInfo>(`${this.apiUrl}/topup`, { amount }, { headers }).pipe(
            tap(info => this.balanceSignal.set(info.balance))
        );
    }
}
