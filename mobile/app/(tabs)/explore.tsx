import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { Chip, EmptyState, Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { useDebouncedValue } from '@/shared/utils/useDebouncedValue';
import { useCategories, useProductSearch } from '@/features/catalog/catalog.hooks';
import { ProductGridCard } from '@/features/catalog/components/ProductGridCard';
import { useFavoriteIds, useToggleFavorite } from '@/features/favorites/favorites.hooks';

export default function ExploreScreen() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const debouncedQ = useDebouncedValue(q.trim());
  const { data: categories } = useCategories();
  const { data: products, isLoading } = useProductSearch({ q: debouncedQ || undefined, category });
  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();

  const chips = [{ label: 'Tümü', value: 'all' }, ...(categories ?? []).map((c) => ({ label: c.displayName, value: c.name }))];

  return (
    <Screen edges={['top']}>
      <View style={styles.headerWrap}>
        <Text variant="title" style={styles.title}>Keşfet</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={tokens.color.primaryDark} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Ürün ara…"
            placeholderTextColor={tokens.color.textFaint}
            style={styles.input}
          />
        </View>
        <FlatList
          horizontal
          data={chips}
          keyExtractor={(c) => c.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => (
            <Chip label={item.label} active={category === item.value} onPress={() => setCategory(item.value)} />
          )}
        />
      </View>

      <FlatList
        data={products ?? []}
        keyExtractor={(p) => String(p.id)}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductGridCard
              product={item}
              isFavorite={favIds?.includes(item.id) ?? false}
              onToggleFavorite={() => toggleFav.mutate(item.id)}
            />
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? <EmptyState icon="search-outline" title="Sonuç yok" subtitle="Farklı bir arama veya kategori dene." /> : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingTop: tokens.spacing.md, gap: tokens.spacing.md },
  title: { paddingHorizontal: tokens.spacing.xl },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    marginHorizontal: tokens.spacing.xl,
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.lg,
    height: 52,
    ...tokens.shadow.card,
  },
  input: { flex: 1, fontSize: tokens.fontSize.md, color: tokens.color.text },
  chips: { paddingHorizontal: tokens.spacing.xl, gap: tokens.spacing.sm, paddingBottom: tokens.spacing.sm },
  grid: { padding: tokens.spacing.xl },
  column: { justifyContent: 'space-between' },
  cell: { width: '48%', marginBottom: tokens.spacing.md },
});
