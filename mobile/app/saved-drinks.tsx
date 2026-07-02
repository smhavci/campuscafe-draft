import { Ionicons } from '@expo/vector-icons';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, EmptyState, Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { showToast } from '@/shared/ui/toast';
import { formatTRY } from '@/shared/utils/format';
import { useDeleteSavedDrink, useSavedDrinks } from '@/features/saved-drinks/saved-drinks.hooks';

const FALLBACK = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200';

export default function SavedDrinksScreen() {
  const router = useRouter();
  const { data: drinks, isLoading } = useSavedDrinks();
  const del = useDeleteSavedDrink();

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={tokens.color.text} />
        </Pressable>
        <Text variant="heading">Kayıtlı İçecekler</Text>
      </View>

      <FlatList
        data={drinks ?? []}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push(`/product/${item.productId}?cafeName=${encodeURIComponent(item.cafeName)}`)}
            style={styles.card}
          >
            <Image source={{ uri: item.productImage ?? FALLBACK }} style={styles.img} />
            <View style={styles.flex}>
              <Text style={styles.name}>{item.name}</Text>
              <Text variant="muted" numberOfLines={1}>{item.productName} · {item.cafeName}</Text>
              <Text variant="price">{formatTRY(item.totalPrice)}</Text>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => del.mutate(item.id, { onSuccess: () => showToast('Tarif silindi', 'info') })}
            >
              <Ionicons name="trash-outline" size={20} color={tokens.color.danger} />
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={
          !isLoading ? <EmptyState icon="cafe-outline" title="Kayıtlı tarif yok" subtitle="Özelleştirdiğin içecekleri kaydet, hızlıca sipariş ver." /> : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.xl },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.color.surface, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  body: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.md },
  img: { width: 56, height: 56, borderRadius: tokens.radius.md },
  flex: { flex: 1 },
  name: { fontWeight: '800', color: tokens.color.text },
});
