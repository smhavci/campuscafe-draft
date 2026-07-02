import { Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { tokens } from '@/shared/theme/tokens';

export function Chip({ label, active = false, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.active]}>
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    ...tokens.shadow.card,
  },
  active: { backgroundColor: tokens.color.primary },
  text: { fontWeight: '700', color: tokens.color.textMuted, fontSize: tokens.fontSize.sm },
  textActive: { color: tokens.color.onPrimary },
});
