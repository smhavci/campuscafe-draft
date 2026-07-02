import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card, EmptyState, StatusPill, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { formatDateTime } from '@/shared/utils/time';
import { formatTRY } from '@/shared/utils/format';
import { useActiveOrders, useUpdateOrderStatus } from '../dashboard.hooks';
import type { DashboardOrder } from '@/shared/types/api';

const ROLE: Record<string, string> = { student: 'Öğrenci', teacher: 'Öğretmen', cafeOwner: 'Kafe' };

export function ActiveOrdersTab() {
  const { data: orders, refetch, isRefetching } = useActiveOrders();
  const upd = useUpdateOrderStatus();

  const advance = (o: DashboardOrder, status: 'ready' | 'delivered' | 'cancelled') =>
    upd.mutate({ orderId: o.id, status });

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      {(orders ?? []).length === 0 ? (
        <EmptyState icon="receipt-outline" title="Aktif sipariş yok" subtitle="Yeni siparişler burada anlık görünür." />
      ) : (
        (orders ?? []).map((o) => (
          <Card key={o.id}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.customer}>{o.customerName}</Text>
                <Text variant="muted">{ROLE[o.customerRole]} · {formatDateTime(o.createdAt)}</Text>
              </View>
              <StatusPill status={o.status} />
            </View>
            {o.items.map((it) => (
              <Text key={it.id} variant="muted">{it.quantity}× {it.productName}</Text>
            ))}
            <View style={[styles.rowBetween, styles.actions]}>
              <Text variant="price">{formatTRY(o.totalAmount)}</Text>
              <View style={styles.btns}>
                {o.status === 'preparing' ? <ActionBtn label="Hazır" onPress={() => advance(o, 'ready')} /> : null}
                {o.status === 'ready' ? <ActionBtn label="Teslim Et" onPress={() => advance(o, 'delivered')} /> : null}
                <ActionBtn label="İptal" danger onPress={() => advance(o, 'cancelled')} />
              </View>
            </View>
          </Card>
        ))
      )}
      <Pressable style={styles.refresh} onPress={() => refetch()}>
        <Ionicons name="refresh" size={16} color={tokens.color.textMuted} />
        <Text variant="muted">{isRefetching ? 'Yenileniyor…' : 'Yenile'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function ActionBtn({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, danger ? styles.actionDanger : styles.actionPrimary]}>
      <Text style={[styles.actionTxt, danger && styles.actionTxtDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customer: { fontWeight: '800', color: tokens.color.text, fontSize: tokens.fontSize.md },
  actions: { marginTop: tokens.spacing.md },
  btns: { flexDirection: 'row', gap: tokens.spacing.sm },
  actionBtn: { paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.sm, borderRadius: tokens.radius.pill },
  actionPrimary: { backgroundColor: tokens.color.primary },
  actionDanger: { backgroundColor: '#FBE9E9' },
  actionTxt: { color: '#fff', fontWeight: '800' },
  actionTxtDanger: { color: tokens.color.danger },
  refresh: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: tokens.spacing.md },
});
