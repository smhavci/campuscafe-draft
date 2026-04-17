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
     *  Giriş yapmış kullanıcının token ve id'sini otomatik ekler
     *  → user_context_node kullanıcı geçmişini çekebilir. */
    askGraph(message: string): Observable<any> {
        const user = this.auth.currentUser();
        const token = this.auth.token();
        return this.http.post(`${this.apiUrl}/graph`, {
            message,
            user_id: user?.id?.toString() ?? null,
            auth_token: token ?? null,
        });
    }
}
