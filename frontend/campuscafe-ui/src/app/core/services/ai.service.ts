import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AIService {
    private apiUrl = `${API_BASE_URL}/ai`;

    constructor(private http: HttpClient, private auth: AuthService) {}

    recommendMeal(budget: string, dietaryPreferences: string = 'none'): Observable<any> {
        return this.http.post(`${this.apiUrl}/chat/recommend`, {
            budget,
            dietary_preferences: dietaryPreferences
        });
    }

    predictPreOrder(userId: string, cafeId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/chat/preorder`, {
            user_id: userId,
            cafe_id: cafeId
        });
    }

    getInventoryInsights(cafeId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/chat/inventory`, {
            cafe_id: cafeId
        });
    }

    suggestCampaign(cafeId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/chat/campaign`, {
            cafe_id: cafeId
        });
    }

    /** LangGraph asistanına mesaj gönder.
     *  thread_id ile konuşma geçmişi korunur (Persistence).
     *  role ile doğru yola yönlendirilir (customer | owner). */
    askGraph(
        message: string,
        threadId: string | null = null,
        role: string = 'customer',
        cafeId: string | null = null
    ): Observable<any> {
        const user = this.auth.currentUser();
        const token = this.auth.token();
        return this.http.post(`${this.apiUrl}/graph`, {
            message,
            user_id:    user?.id?.toString() ?? null,
            auth_token: token ?? null,
            thread_id:  threadId,
            role,
            cafe_id:    cafeId,
        });
    }

    /** Duraklatılmış kampanya akışını devam ettirir (Human-in-the-Loop). */
    resumeCampaign(threadId: string, decision: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/graph/resume`, {
            thread_id: threadId,
            decision,
        });
    }
}
