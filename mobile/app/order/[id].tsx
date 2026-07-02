import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Screen, StatusPill, Text } from '@/shared/ui';
import { ORDER_STATUS, tokens } from '@/shared/theme/tokens';
import { showToast } from '@/shared/ui/toast';
import { formatDateTime } from '@/shared/utils/time';
import { formatTRY } from '@/shared/utils/format';
import { useOrder, useOrderTimeline, useReorder } from '@/features/orders/orders.hooks';
import { apiErrorMessage } from '@/shared/api/client';
import type { OrderStatus } from '@/shared/types/api';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const orderId = Number(id);
  const { data: order, isLoading } = useOrder(orderId);
  const { data: timeline } = useOrderTimeline(orderId);
  const reorder = useReorder();

  if (isLoading || !order) {
    return (
      <Screen>
        <View style={styles.center}><ActivityIndicator color={tokens.color.primary} /></View>
      </Screen>
    );
  }

  const doReorder = () =>
    reorder.mutate(orderId, {
      onSuccess: (res) => {
        showToast('Sipariş tekrar verildi! 🎉', 'success');
        router.replace(`/order/${res.orderId}`);
      },
      onError: (err) => showToast(apiErrorMessage(err), 'error'),
    });

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={tokens.color.text} />
        </Pressable>
        <Text variant="heading">Sipariş #{order.id}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.cafe}>{order.cafeName ?? 'Kafe'}</Text>
            <Text variant="muted">{formatDateTime(order.createdAt)}</Text>
          </View>
          <StatusPill status={order.status} />
        </View>

        <Card>
          <Text variant="label" style={styles.blockTitle}>Durum Geçmişi</Text>
          {(timeline?.events ?? []).map((e, i) => (
            <View key={i} style={styles.tlRow}>
              <View style={[styles.tlDot, { backgroundColor: ORDER_STATUS[e.status as OrderStatus]?.color ?? tokens.color.textFaint }]} />
              <View style={styles.flex}>
                <Text style={styles.tlLabel}>{ORDER_STATUS[e.status as OrderStatus]?.label ?? e.status}</Text>
                <Text variant="muted">{formatDateTime(e.timestamp)}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <Text variant="label" style={styles.blockTitle}>Ürünler</Text>
          {order.items.map((it) => (
            <View key={it.itemId} style={styles.itemRow}>
              <Text style={[styles.itemName, it.itemStatus === 'cancelled' && styles.cancelled]}>
                {it.quantity}× {it.productName}
              </Text>
              <Text variant="price">{formatTRY(it.lineTotal)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text variant="heading">Toplam</Text>
            <Text variant="heading">{formatTRY(order.totalAmount)}</Text>
          </View>
        </Card>

        <Button title="Tekrar Sipariş Ver" variant="secondary" onPress={doReorder} loading={reorder.isPending} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.xl },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.color.surface, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  body: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cafe: { fontWeight: '800', fontSize: tokens.fontSize.lg, color: tokens.color.text },
  blockTitle: { marginBottom: tokens.spacing.md },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, paddingVertical: tokens.spacing.sm },
  tlDot: { width: 12, height: 12, borderRadius: 6 },
  tlLabel: { fontWeight: '700', color: tokens.color.text },
  flex: { flex: 1 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  itemName: { fontWeight: '700', color: tokens.color.text },
  cancelled: { textDecorationLine: 'line-through', color: tokens.color.textFaint },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: tokens.spacing.md, borderTopWidth: 1, borderTopColor: tokens.color.border, paddingTop: tokens.spacing.md },
});
