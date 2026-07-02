import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import type { LoyaltyCard } from '@/shared/types/api';

export function StampCard({ card }: { card: LoyaltyCard }) {
  const router = useRouter();
  const full = card.stamps >= card.stampsRequired;
  const color = card.cafeColor || tokens.color.primary;

  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text style={styles.name}>{card.cafeName}</Text>
          <Text variant="muted">
            {card.stamps}/{card.stampsRequired} ·{' '}
            {full ? 'Ücretsiz kahveye hazır!' : `${card.stampsRequired - card.stamps} damga kaldı`}
          </Text>
        </View>
        {full ? (
          <Pressable style={styles.useBtn} onPress={() => router.push(`/redeem/${card.cafeId}`)}>
            <Text style={styles.useTxt}>Kullan 🎉</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.cups}>
        {Array.from({ length: card.stampsRequired }).map((_, i) => (
          <View key={i} style={[styles.cup, { backgroundColor: i < card.stamps ? color : tokens.color.surfaceMuted }]}>
            <Ionicons name="cafe" size={14} color={i < card.stamps ? '#fff' : tokens.color.textFaint} />
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.md },
  flex: { flex: 1 },
  name: { fontWeight: '800', fontSize: tokens.fontSize.lg, color: tokens.color.text },
  useBtn: { backgroundColor: tokens.color.success, paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.sm, borderRadius: tokens.radius.pill },
  useTxt: { color: '#fff', fontWeight: '800' },
  cups: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cup: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
