import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, EmptyState, Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { formatDateTime } from '@/shared/utils/time';
import { useLoyaltyCards, useLoyaltyStatus, useStarHistory } from '@/features/loyalty/loyalty.hooks';
import { StampCard } from '@/features/loyalty/components/StampCard';

export default function RewardsScreen() {
  const { data: status } = useLoyaltyStatus();
  const { data: cards } = useLoyaltyCards();
  const { data: history } = useStarHistory();

  const stars = status?.stars ?? 0;
  const threshold = status?.nextRewardThreshold ?? 15;
  const remaining = Math.max(0, threshold - stars);
  const progress = Math.min(1, threshold > 0 ? stars / threshold : 0);

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text variant="title">Ödüllerim</Text>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>YILDIZ BAKİYESİ</Text>
          <Text style={styles.heroNum}>{stars} ★</Text>
          <View style={styles.progressRow}>
            <Text style={styles.heroSub}>Sonraki ödül: {threshold} yıldız</Text>
            <Text style={styles.heroSub}>{stars}/{threshold}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.heroSub}>{remaining} yıldız daha kazanırsan ücretsiz içecek!</Text>
        </View>

        <Text variant="heading">Sadakat Kartları</Text>
        {cards && cards.length > 0 ? (
          cards.map((c) => <StampCard key={c.id} card={c} />)
        ) : (
          <Text variant="muted">Henüz sadakat kartın yok. Kahve siparişleriyle damga biriktir.</Text>
        )}

        <Text variant="heading" style={styles.historyTitle}>Yıldız Geçmişi</Text>
        {history && history.length > 0 ? (
          <Card>
            {history.map((h) => (
              <View key={h.id} style={styles.hRow}>
                <View style={styles.flex}>
                  <Text style={styles.hDesc}>{h.description}</Text>
                  <Text variant="muted">{formatDateTime(h.date)}</Text>
                </View>
                <Text style={[styles.hChange, { color: h.type === 'earn' ? tokens.color.success : tokens.color.primaryDark }]}>
                  {h.change}
                </Text>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState icon="star-outline" title="Geçmiş yok" subtitle="Sipariş verdikçe yıldız hareketlerin burada görünür." />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: tokens.spacing.xl, gap: tokens.spacing.lg },
  hero: { backgroundColor: tokens.color.primary, borderRadius: tokens.radius.xl, padding: tokens.spacing.xl, gap: tokens.spacing.sm },
  heroLabel: { color: '#fff', opacity: 0.85, fontWeight: '700', letterSpacing: 1, fontSize: tokens.fontSize.sm },
  heroNum: { color: '#fff', fontFamily: tokens.font.heading, fontSize: tokens.fontSize.display, fontWeight: '800' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: tokens.spacing.sm },
  heroSub: { color: '#fff', opacity: 0.9 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: '#fff' },
  historyTitle: { marginTop: tokens.spacing.sm },
  hRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: tokens.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.color.border },
  flex: { flex: 1 },
  hDesc: { fontWeight: '700', color: tokens.color.text },
  hChange: { fontWeight: '800', fontSize: tokens.fontSize.lg },
});
