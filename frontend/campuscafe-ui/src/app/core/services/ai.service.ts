import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class AIService {
    private apiUrl = `${API_BASE_URL}/ai`;

    constructor(private http: HttpClient) {}

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

    askGraph(message: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/chat/graph`, {
            message
        });
    }
}
