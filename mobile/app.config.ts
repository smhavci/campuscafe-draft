import type { ExpoConfig } from 'expo/config';

/**
 * Expo config. The API base URL is injected via `extra` so it can be changed
 * per environment (dev / staging / prod) without touching source.
 * Override with:  API_URL=https://api.example.com npx expo start
 */
const config: ExpoConfig = {
  name: 'CampusCafe',
  slug: 'campuscafe',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'campuscafe',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
  extra: {
    apiUrl: process.env.API_URL ?? 'http://localhost:3000',
  },
};

export default config;
