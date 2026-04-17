import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type UserRole = 'student' | 'teacher' | 'cafeOwner';

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    studentNumber?: string;
    email?: string;
    role: UserRole;
    cafeId?: number;
    cafeName?: string;
    stars?: number;
    createdAt?: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private apiUrl = `${API_BASE_URL}/auth`;

    currentUser = signal<User | null>(null);
    token = signal<string | null>(null);
    isLoggedIn = computed(() => !!this.token());
    isStudent  = computed(() => this.currentUser()?.role === 'student');
    isTeacher  = computed(() => this.currentUser()?.role === 'teacher');
    isOwner    = computed(() => this.currentUser()?.role === 'cafeOwner');
    userRole   = computed(() => this.currentUser()?.role || 'student');

    constructor(private http: HttpClient, private router: Router) {
        // Sayfa yenilenince localStorage'dan token ve kullanıcıyı geri yükle
        const savedToken = localStorage.getItem('token');
        const savedUser  = localStorage.getItem('user');
        if (savedToken && savedUser) {
            this.token.set(savedToken);
            this.currentUser.set(JSON.parse(savedUser));
        }
    }

    register(data: any): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
            tap(res => this.saveAuth(res))
        );
    }

    login(data: any): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
            tap(res => this.saveAuth(res))
        );
    }

    logout(): void {
        this.token.set(null);
        this.currentUser.set(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.router.navigate(['/']);
    }

    // ─────────────────────────────────────────────────────────
    // getProfile() — Backend'den güncel profil bilgisini çeker.
    //
    // Neden token'daki bilgileri kullanmıyoruz?
    // Token'lar oluşturulduklarında sabitlenir. Kullanıcı adını
    // değiştirirse token eski adı taşımaya devam eder.
    // Bu yüzden her seferinde DB'den taze veri alırız.
    // ─────────────────────────────────────────────────────────
    getProfile(): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/me`, {
            headers: this.getAuthHeaders()
        });
    }

    // ─────────────────────────────────────────────────────────
    // updateProfile() — Ad/soyad veya şifre günceller.
    //
    // tap() operatörü: Observable'ı değiştirmeden "yan etki"
    // yapar. Cevap gelince currentUser signal'ını ve
    // localStorage'ı günceller — böylece navbar'daki isim
    // otomatik değişir.
    // ─────────────────────────────────────────────────────────
    updateProfile(data: { firstName?: string; lastName?: string; currentPassword?: string; newPassword?: string }): Observable<{ message: string; user: User }> {
        return this.http.patch<{ message: string; user: User }>(`${this.apiUrl}/me`, data, {
            headers: this.getAuthHeaders()
        }).pipe(
            tap(res => {
                // Güncel kullanıcıyı signal'a ve localStorage'a yaz
                this.currentUser.set(res.user);
                localStorage.setItem('user', JSON.stringify(res.user));
            })
        );
    }

    getAuthHeaders(): { [key: string]: string } {
        const t = this.token();
        return t ? { Authorization: `Bearer ${t}` } : {};
    }

    private saveAuth(res: AuthResponse): void {
        this.token.set(res.token);
        this.currentUser.set(res.user);
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
    }
}
