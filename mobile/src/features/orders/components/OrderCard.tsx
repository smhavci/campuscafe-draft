import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, StatusPill, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { formatDateTime } from '@/shared/utils/time';
import { formatTRY } from '@/shared/utils/format';
import type { Order } from '@/shared/types/api';

const ACCENTS = [tokens.color.primary, tokens.color.terracotta, tokens.color.sage, tokens.color.primaryDark];
function accentFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % ACCENTS.length;
  return ACCENTS[h];
}

export function OrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const summary = order.items
    .map((i) => (i.quantity > 1 ? `${i.productName} × ${i.quantity}` : i.productName))
    .join(' · ');

  return (
    <Card onPress={() => router.push(`/order/${order.id}`)}>
      <View style={styles.top}>
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: accentFor(order.cafeName ?? '') }]} />
          <Text style={styles.cafe}>{order.cafeName ?? 'Kafe'}</Text>
        </View>
        <StatusPill status={order.status} />
      </View>
      <Text variant="muted" style={styles.date}>{formatDateTime(order.createdAt)}</Text>
      <Text variant="muted" numberOfLines={1}>{summary}</Text>
      <View style={styles.bottom}>
        <Text variant="price">{formatTRY(order.totalAmount)}</Text>
        <View style={styles.detay}>
          <Text style={styles.detayTxt}>Detay</Text>
          <Ionicons name="arrow-forward" size={16} color={tokens.color.text} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cafe: { fontWeight: '800', fontSize: tokens.fontSize.md, color: tokens.color.text },
  date: { marginTop: tokens.spacing.sm, marginBottom: 2 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: tokens.spacing.md },
  detay: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detayTxt: { fontWeight: '700', color: tokens.color.text },
});
