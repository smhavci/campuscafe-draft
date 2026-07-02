import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { formatTRY } from '@/shared/utils/format';
import type { SearchProduct } from '@/shared/types/api';

const FALLBACK = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300';

/**
 * Presentational: favorite state + toggle are passed in by the screen, so this
 * catalog component doesn't import the favorites feature (layering stays clean).
 */
export function ProductGridCard({
  product,
  isFavorite,
  onToggleFavorite,
}: {
  product: SearchProduct;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const router = useRouter();
  return (
    <Card
      onPress={() => router.push(`/product/${product.id}?cafeName=${encodeURIComponent(product.cafeName)}`)}
      style={styles.card}
    >
      <View>
        <Image source={{ uri: product.image ?? FALLBACK }} style={styles.img} />
        <Pressable style={styles.heart} onPress={onToggleFavorite} hitSlop={8}>
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={isFavorite ? tokens.color.danger : tokens.color.textMuted} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text variant="muted" numberOfLines={1}>{product.cafeName}</Text>
        <View style={styles.row}>
          <Text variant="price">{formatTRY(product.price)}</Text>
          {product.starCost != null ? (
            <View style={styles.rating}>
              <Ionicons name="star" size={13} color={tokens.color.gold} />
              <Text style={styles.ratingTxt}>{product.starCost}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  img: { width: '100%', height: 120 },
  heart: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { padding: tokens.spacing.md, gap: 2 },
  name: { fontWeight: '800', fontSize: tokens.fontSize.md, color: tokens.color.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingTxt: { fontWeight: '700', color: tokens.color.textMuted, fontSize: tokens.fontSize.sm },
});
