import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { isOpenNow } from '@/shared/utils/time';
import type { Cafe } from '@/shared/types/api';

const FALLBACK = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600';

export function CafeCard({ cafe }: { cafe: Cafe }) {
  const router = useRouter();
  const open = isOpenNow(cafe.openHours);
  return (
    <Card onPress={() => router.push(`/cafe/${cafe.slug}`)} style={styles.card}>
      <View>
        <Image source={{ uri: cafe.image ?? FALLBACK }} style={styles.img} />
        <View style={[styles.badge, { backgroundColor: open ? tokens.color.sage : tokens.color.danger }]}>
          <Text style={styles.badgeTxt}>{open ? 'Açık' : 'Kapalı'}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.name}>{cafe.name}</Text>
          <View style={styles.rating}>
            <Ionicons name="star" size={14} color={tokens.color.gold} />
            <Text style={styles.ratingTxt}>{cafe.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={tokens.color.textMuted} />
          <Text variant="muted">{cafe.location}</Text>
          <Ionicons name="time-outline" size={14} color={tokens.color.textMuted} style={{ marginLeft: 8 }} />
          <Text variant="muted">{cafe.openHours}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  img: { width: '100%', height: 150 },
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 12, paddingVertical: 4, borderRadius: tokens.radius.pill },
  badgeTxt: { color: '#fff', fontWeight: '700', fontSize: tokens.fontSize.sm },
  body: { padding: tokens.spacing.lg, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontFamily: tokens.font.heading, fontSize: tokens.fontSize.lg, fontWeight: '700', color: tokens.color.text },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingTxt: { fontWeight: '800', color: tokens.color.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
