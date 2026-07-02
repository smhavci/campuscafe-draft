import { Text as RNText, type TextProps, StyleSheet } from 'react-native';
import { tokens } from '@/shared/theme/tokens';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'muted' | 'label' | 'price';

export function Text({
  variant = 'body',
  style,
  ...rest
}: TextProps & { variant?: TextVariant }) {
  return <RNText style={[styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: { fontFamily: tokens.font.heading, fontSize: tokens.fontSize.display, color: tokens.color.text, fontWeight: '700' },
  title: { fontFamily: tokens.font.heading, fontSize: tokens.fontSize.xxl, color: tokens.color.text, fontWeight: '700' },
  heading: { fontFamily: tokens.font.heading, fontSize: tokens.fontSize.xl, color: tokens.color.text, fontWeight: '700' },
  body: { fontFamily: tokens.font.body, fontSize: tokens.fontSize.md, color: tokens.color.text },
  muted: { fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.color.textMuted },
  label: {
    fontFamily: tokens.font.body,
    fontSize: tokens.fontSize.xs,
    color: tokens.color.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  price: { fontFamily: tokens.font.body, fontSize: tokens.fontSize.lg, color: tokens.color.primaryDark, fontWeight: '800' },
});
