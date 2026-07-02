import { apiClient } from '@/shared/api/client';
import type { AuthResponse, User } from '@/shared/types/api';

export interface RegisterInput {
  role: 'student' | 'teacher' | 'cafeOwner';
  firstName: string;
  lastName: string;
  password: string;
  studentNumber?: string;
  email?: string;
  cafeId?: number;
}

export interface LoginInput {
  role: 'student' | 'teacher' | 'cafeOwner';
  password: string;
  studentNumber?: string;
  email?: string;
}

export interface UpdateMeInput {
  firstName?: string;
  lastName?: string;
  currentPassword?: string;
  newPassword?: string;
}

export const authApi = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', input);
    return data;
  },
  async login(input: LoginInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', input);
    return data;
  },
  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me');
    return data;
  },
  async updateMe(input: UpdateMeInput): Promise<{ message: string; user: User }> {
    const { data } = await apiClient.patch<{ message: string; user: User }>('/auth/me', input);
    return data;
  },
};
