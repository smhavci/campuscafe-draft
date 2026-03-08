import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export type UserRole = 'student' | 'teacher' | 'cafeOwner';

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    studentNumber?: string;
    email?: string;
    role: UserRole;
    cafeId?: number;
}

export interface AuthResponse {
    user: User;
    token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private apiUrl = 'http://localhost:3000/api/auth';

    currentUser = signal<User | null>(null);
    token = signal<string | null>(null);
    isLoggedIn = computed(() => !!this.token());
    isStudent = computed(() => this.currentUser()?.role === 'student');
    isTeacher = computed(() => this.currentUser()?.role === 'teacher');
    isOwner = computed(() => this.currentUser()?.role === 'cafeOwner');
    userRole = computed(() => this.currentUser()?.role || 'student');

    constructor(private http: HttpClient, private router: Router) {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
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
