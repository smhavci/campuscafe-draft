import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { useProduct } from '@/features/catalog/catalog.hooks';
import { useFavoriteIds, useToggleFavorite } from '@/features/favorites/favorites.hooks';
import { useCartStore } from '@/features/cart/cart.store';
import { buildCartItem, computeUnitPrice, missingRequiredOption } from '@/features/cart/cart.helpers';
import { formatTRY } from '@/shared/utils/format';

const FALLBACK = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600';

export default function ProductDetailScreen() {
  const { id, cafeName } = useLocalSearchParams<{ id: string; cafeName?: string }>();
  const router = useRouter();
  const productId = Number(id);
  const { data: product, isLoading } = useProduct(productId);
  const { data: favIds } = useFavoriteIds();
  const toggleFav = useToggleFavorite();
  const addToCart = useCartStore((s) => s.add);

  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);

  const unitPrice = useMemo(() => (product ? computeUnitPrice(product, selected) : 0), [product, selected]);

  if (isLoading || !product) {
    return (
      <Screen>
        <View style={styles.center}><ActivityIndicator color={tokens.color.primary} /></View>
      </Screen>
    );
  }

  const isFav = favIds?.includes(product.id) ?? false;

  const onSelect = (optionId: number, itemId: number, type: 'radio' | 'checkbox') =>
    setSelected((prev) => {
      const cur = prev[optionId] ?? [];
      if (type === 'radio') return { ...prev, [optionId]: [itemId] };
      return { ...prev, [optionId]: cur.includes(itemId) ? cur.filter((x) => x !== itemId) : [...cur, itemId] };
    });

  const submit = () => {
    const missing = missingRequiredOption(product, selected);
    if (missing) {
      Alert.alert('Eksik seçim', `Lütfen "${missing}" seçin.`);
      return;
    }
    addToCart({ id: product.cafeId, name: cafeName ?? 'Kafe' }, buildCartItem(product, selected, quantity));
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View>
          <Image source={{ uri: product.image ?? FALLBACK }} style={styles.img} />
          <Pressable style={[styles.circle, styles.close]} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={tokens.color.text} />
          </Pressable>
          <Pressable style={[styles.circle, styles.fav]} onPress={() => toggleFav.mutate(product.id)}>
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? tokens.color.danger : tokens.color.text} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="title" style={styles.flex}>{product.name}</Text>
            <Text variant="price" style={styles.bigPrice}>{formatTRY(product.price)}</Text>
          </View>
          <Text variant="muted">{cafeName ?? ''}</Text>
          {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}
          {product.calories != null ? <Text variant="muted">{product.calories} kcal</Text> : null}

          {(product.options ?? []).map((o) => (
            <View key={o.id} style={styles.optionBlock}>
              <Text style={styles.optionTitle}>
                {o.name} {o.isRequired ? <Text style={styles.req}>*</Text> : null}
              </Text>
              <View style={styles.chips}>
                {o.items.map((it) => {
                  const active = (selected[o.id] ?? []).includes(it.id);
                  return (
                    <Pressable key={it.id} onPress={() => onSelect(o.id, it.id, o.type)} style={[styles.optChip, active && styles.optActive]}>
                      <Text style={[styles.optText, active && styles.optTextActive]}>{it.name}</Text>
                      {it.extraPrice > 0 ? <Text style={[styles.optExtra, active && styles.optTextActive]}>+₺{it.extraPrice}</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.stepper}>
          <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} hitSlop={8}>
            <Ionicons name="remove" size={22} color={tokens.color.text} />
          </Pressable>
          <Text style={styles.qty}>{quantity}</Text>
          <Pressable onPress={() => setQuantity((q) => q + 1)} hitSlop={8}>
            <Ionicons name="add" size={22} color={tokens.color.text} />
          </Pressable>
        </View>
        <Button title={`Sepete Ekle · ${formatTRY(unitPrice * quantity)}`} onPress={submit} style={styles.addBtn} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: 300 },
  circle: { position: 'absolute', top: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  close: { left: 16 },
  fav: { right: 16 },
  body: { padding: tokens.spacing.xl, gap: tokens.spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
  bigPrice: { fontSize: tokens.fontSize.xxl },
  desc: { marginTop: 4, color: tokens.color.text },
  optionBlock: { marginTop: tokens.spacing.lg, gap: tokens.spacing.md },
  optionTitle: { fontWeight: '800', fontSize: tokens.fontSize.lg, color: tokens.color.text },
  req: { color: tokens.color.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.md },
  optChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.md, borderRadius: tokens.radius.md, borderWidth: 1.5, borderColor: tokens.color.border, backgroundColor: tokens.color.surface },
  optActive: { borderColor: tokens.color.primary, backgroundColor: '#FBF6EE' },
  optText: { fontWeight: '700', color: tokens.color.text },
  optExtra: { color: tokens.color.textMuted, fontSize: tokens.fontSize.sm },
  optTextActive: { color: tokens.color.primaryDark },
  footer: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.lg, borderTopWidth: 1, borderTopColor: tokens.color.border, backgroundColor: tokens.color.background },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.lg, backgroundColor: tokens.color.surface, borderRadius: tokens.radius.pill, paddingHorizontal: tokens.spacing.lg, height: 54 },
  qty: { fontWeight: '800', fontSize: tokens.fontSize.lg, minWidth: 20, textAlign: 'center' },
  addBtn: { flex: 1 },
});
