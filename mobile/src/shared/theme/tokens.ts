/**
 * Design TOKENS only (values), not screen/UI design. These give features a
 * shared vocabulary for spacing/colors when screens are built later.
 */
export const tokens = {
  color: {
    primary: '#c8a97e',
    text: '#1a1a1a',
    muted: '#6b7280',
    background: '#ffffff',
    danger: '#e05252',
    success: '#3fa34d',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 6, md: 12, lg: 20 },
  fontSize: { sm: 13, md: 15, lg: 18, xl: 24 },
} as const;

export type Tokens = typeof tokens;
