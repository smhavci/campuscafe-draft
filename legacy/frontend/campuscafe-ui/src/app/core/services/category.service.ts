import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Category {
    id: number;
    name: string;
    displayName: string;
    icon: string;
    description: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
    private apiUrl = `${API_BASE_URL}/categories`;

    constructor(private http: HttpClient) { }

    getCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(this.apiUrl);
    }
}
