import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, EmptyState, StatusPill, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { formatDateTime } from '@/shared/utils/time';
import { formatTRY } from '@/shared/utils/format';
import { useOrderHistory } from '../dashboard.hooks';

export function HistoryTab() {
  const { data } = useOrderHistory();
  const orders = data?.orders ?? [];

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      {orders.length === 0 ? (
        <EmptyState icon="time-outline" title="Geçmiş boş" />
      ) : (
        orders.map((o) => (
          <Card key={o.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.customer}>{o.customerName}</Text>
              <StatusPill status={o.status} />
            </View>
            <Text variant="muted">{formatDateTime(o.createdAt)}</Text>
            <View style={styles.rowBetween}>
              <Text variant="muted" numberOfLines={1} style={styles.flex}>
                {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(' · ')}
              </Text>
              <Text variant="price">{formatTRY(o.totalAmount)}</Text>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
  customer: { fontWeight: '800', color: tokens.color.text, fontSize: tokens.fontSize.md },
});
