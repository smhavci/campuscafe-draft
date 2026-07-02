import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { tokens } from '@/shared/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? tokens.color.onPrimary : tokens.color.primary} />
      ) : (
        <Text style={[styles.text, textColor[variant]]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 54, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: tokens.spacing.xl },
  text: { fontSize: tokens.fontSize.lg, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: tokens.color.primary },
  secondary: { backgroundColor: tokens.color.surfaceMuted },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: tokens.color.danger },
};

const textColor = {
  primary: { color: tokens.color.onPrimary },
  secondary: { color: tokens.color.text },
  ghost: { color: tokens.color.primaryDark },
  danger: { color: tokens.color.onPrimary },
} as const;
