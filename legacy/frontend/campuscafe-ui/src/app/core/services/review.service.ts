import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

export interface Review {
    id: number;
    rating: number;
    comment: string;
    createdAt: string;
    userName: string;
    userRole: string;
}

export interface ReviewStats {
    total: number;
    avgRating: number;
}

export interface ProductReviewsResponse {
    reviews: Review[];
    stats: ReviewStats;
}

export interface UserReview {
    productId: number;
    orderId: number;
    rating: number;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
    private apiUrl = `${API_BASE_URL}/reviews`;

    constructor(private http: HttpClient, private authService: AuthService) {}

    private getHeaders(): HttpHeaders {
        return new HttpHeaders(this.authService.getAuthHeaders());
    }

    submitReview(productId: number, orderId: number, rating: number, comment: string): Observable<any> {
        return this.http.post(this.apiUrl, { productId, orderId, rating, comment }, { headers: this.getHeaders() });
    }

    getProductReviews(productId: number): Observable<ProductReviewsResponse> {
        return this.http.get<ProductReviewsResponse>(`${this.apiUrl}/product/${productId}`);
    }

    getUserReviews(): Observable<UserReview[]> {
        return this.http.get<UserReview[]>(`${this.apiUrl}/user`, { headers: this.getHeaders() });
    }
}
