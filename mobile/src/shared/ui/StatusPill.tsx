import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { ORDER_STATUS, tokens } from '@/shared/theme/tokens';
import type { OrderStatus } from '@/shared/types/api';

export function StatusPill({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return (
    <View style={[styles.pill, { backgroundColor: `${s.color}22` }]}>
      <Text style={{ color: s.color, fontWeight: '700', fontSize: tokens.fontSize.sm }}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: tokens.spacing.md, paddingVertical: 6, borderRadius: tokens.radius.pill },
});
