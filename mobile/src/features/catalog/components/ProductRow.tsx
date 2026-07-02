import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { formatTRY } from '@/shared/utils/format';
import type { Product } from '@/shared/types/api';

const FALLBACK = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300';

export function ProductRow({ product, cafeName }: { product: Product; cafeName: string }) {
  const router = useRouter();
  return (
    <Card
      onPress={() => router.push(`/product/${product.id}?cafeName=${encodeURIComponent(cafeName)}`)}
      style={styles.card}
    >
      <View style={styles.row}>
        <Image source={{ uri: product.image ?? FALLBACK }} style={styles.img} />
        <View style={styles.info}>
          <Text style={styles.name}>{product.name}</Text>
          {product.description ? (
            <Text variant="muted" numberOfLines={1}>{product.description}</Text>
          ) : null}
          {product.calories != null ? <Text variant="muted">{product.calories} kcal</Text> : null}
        </View>
        <Text variant="price">{formatTRY(product.price)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: tokens.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  img: { width: 64, height: 64, borderRadius: tokens.radius.md },
  info: { flex: 1, gap: 2 },
  name: { fontWeight: '800', fontSize: tokens.fontSize.md, color: tokens.color.text },
});
