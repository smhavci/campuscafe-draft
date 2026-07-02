import Constants from 'expo-constants';

interface Extra {
  apiUrl: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const env = {
  /** Backend REST base, e.g. http://localhost:3000 (no trailing /api). */
  apiUrl: extra.apiUrl ?? 'http://localhost:3000',
  get apiBaseUrl(): string {
    return `${this.apiUrl}/api`;
  },
};
