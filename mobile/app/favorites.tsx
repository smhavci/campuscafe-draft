import { Ionicons } from '@expo/vector-icons';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, EmptyState, Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { formatTRY } from '@/shared/utils/format';
import { useFavorites, useToggleFavorite } from '@/features/favorites/favorites.hooks';

const FALLBACK = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300';

export default function FavoritesScreen() {
  const router = useRouter();
  const { data: favorites, isLoading } = useFavorites();
  const toggle = useToggleFavorite();

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={tokens.color.text} />
        </Pressable>
        <Text variant="heading">Favorilerim</Text>
      </View>

      <FlatList
        data={favorites ?? []}
        keyExtractor={(f) => String(f.id)}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push(`/product/${item.productId}?cafeName=${encodeURIComponent(item.cafeName)}`)}
            style={styles.card}
          >
            <View>
              <Image source={{ uri: item.image ?? FALLBACK }} style={styles.img} />
              <Pressable style={styles.heart} onPress={() => toggle.mutate(item.productId)} hitSlop={8}>
                <Ionicons name="heart" size={18} color={tokens.color.danger} />
              </Pressable>
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text variant="muted" numberOfLines={1}>{item.cafeName}</Text>
              <Text variant="price">{formatTRY(item.price)}</Text>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !isLoading ? <EmptyState icon="heart-outline" title="Favorin yok" subtitle="Beğendiğin ürünleri kalple işaretle." /> : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.xl },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.color.surface, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  grid: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl },
  column: { justifyContent: 'space-between' },
  card: { padding: 0, overflow: 'hidden', width: '48%', marginBottom: tokens.spacing.md },
  img: { width: '100%', height: 120 },
  heart: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  info: { padding: tokens.spacing.md, gap: 2 },
  name: { fontWeight: '800', color: tokens.color.text },
});
