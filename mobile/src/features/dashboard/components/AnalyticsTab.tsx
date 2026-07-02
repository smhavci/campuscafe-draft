import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { formatTRY } from '@/shared/utils/format';
import { useAnalytics, useWeekly } from '../dashboard.hooks';

const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function AnalyticsTab() {
  const { data: a } = useAnalytics();
  const { data: weekly } = useWeekly();
  const maxRev = Math.max(1, ...(weekly ?? []).map((w) => w.revenue));
  const maxQty = Math.max(1, ...(a?.topProducts ?? []).map((p) => p.totalQty));

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.kpis}>
        <Card style={styles.kpi}>
          <Text variant="muted">Bugünkü Gelir</Text>
          <Text style={styles.kpiNum}>{formatTRY(a?.totalRevenue ?? 0)}</Text>
        </Card>
        <Card style={styles.kpi}>
          <Text variant="muted">Sipariş Sayısı</Text>
          <Text style={styles.kpiNum}>{a?.orderCount ?? 0}</Text>
        </Card>
      </View>

      <Card>
        <Text variant="heading" style={styles.block}>Haftalık Gelir</Text>
        <View style={styles.chart}>
          {(weekly ?? []).map((w) => (
            <View key={w.date} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${(w.revenue / maxRev) * 100}%` }]} />
              </View>
              <Text variant="muted">{DAYS[new Date(w.date).getDay()]}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="heading" style={styles.block}>En Çok Satan</Text>
        {(a?.topProducts ?? []).length === 0 ? (
          <Text variant="muted">Bugün için veri yok.</Text>
        ) : (
          (a?.topProducts ?? []).map((p) => (
            <View key={p.name} style={styles.topRow}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{p.name}</Text>
                <Text variant="muted">{p.totalQty} adet</Text>
              </View>
              <View style={styles.topTrack}>
                <View style={[styles.topFill, { width: `${(p.totalQty / maxQty) * 100}%` }]} />
              </View>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontWeight: '800', color: tokens.color.text, fontSize: tokens.fontSize.md },
  kpis: { flexDirection: 'row', gap: tokens.spacing.md },
  kpi: { flex: 1, gap: 4 },
  kpiNum: { fontFamily: tokens.font.heading, fontSize: tokens.fontSize.xxl, fontWeight: '800', color: tokens.color.text },
  block: { marginBottom: tokens.spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { width: 16, height: 110, backgroundColor: tokens.color.surfaceMuted, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: 16, backgroundColor: tokens.color.primary, borderRadius: 8 },
  topRow: { gap: 6, paddingVertical: tokens.spacing.sm },
  topTrack: { height: 8, backgroundColor: tokens.color.surfaceMuted, borderRadius: 4, overflow: 'hidden' },
  topFill: { height: 8, backgroundColor: tokens.color.primary, borderRadius: 4 },
});
