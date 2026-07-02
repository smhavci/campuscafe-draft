import { Platform } from 'react-native';

/**
 * Design tokens derived from the reference screens (screens/*.png):
 * warm cream background, coffee-tan primary, gold star badge, serif headings.
 */
export const tokens = {
  color: {
    // Surfaces
    background: '#F5F0E8', // warm cream app background
    surface: '#FFFFFF', // cards
    surfaceMuted: '#EFE9DF',
    // Brand
    primary: '#C8A97E', // coffee tan (buttons, active)
    primaryDark: '#B8966A',
    onPrimary: '#FFFFFF',
    // Accents (also used per-cafe via cafe.color)
    terracotta: '#E07A5F',
    sage: '#81B29A',
    gold: '#E8B84B', // star badge
    // Text
    text: '#1A1A1A',
    textMuted: '#6B7280',
    textFaint: '#9CA3AF',
    // Feedback
    success: '#3FA34D',
    danger: '#E05252',
    // Order status
    statusPreparing: '#C8A97E',
    statusReady: '#3FA34D',
    statusDelivered: '#9CA3AF',
    statusCancelled: '#E05252',
    // Lines
    border: '#E7E0D5',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 },
  fontSize: { xs: 12, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28, display: 34 },
  font: {
    // Serif for headings (matches the reference); swap to a loaded font later.
    heading: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
    body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  },
} as const;

export type Tokens = typeof tokens;

/** Map an order status to its badge color + Turkish label. */
export const ORDER_STATUS = {
  preparing: { label: 'Hazırlanıyor', color: tokens.color.statusPreparing },
  ready: { label: 'Hazır', color: tokens.color.statusReady },
  delivered: { label: 'Teslim Edildi', color: tokens.color.statusDelivered },
  cancelled: { label: 'İptal Edildi', color: tokens.color.statusCancelled },
} as const;
