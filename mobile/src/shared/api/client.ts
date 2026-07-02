import axios, { AxiosError } from 'axios';
import { env } from '@/shared/config/env';
import { tokenStorage } from '@/shared/storage/secure-store';

/**
 * Single axios instance for the whole app.
 * - Request interceptor attaches the Bearer token from secure storage.
 * - Response interceptor normalizes the backend's `{ message }` error shape.
 *
 * A 401 handler is registered lazily by the auth store (to avoid a circular
 * import) via `setUnauthorizedHandler`.
 */
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ message?: string; details?: unknown }>) => {
    if (error.response?.status === 401) onUnauthorized?.();
    const apiError: ApiError = {
      status: error.response?.status ?? 0,
      message: error.response?.data?.message ?? 'Bağlantı hatası. Lütfen tekrar deneyin.',
      details: error.response?.data?.details,
    };
    return Promise.reject(apiError);
  },
);
