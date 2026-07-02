import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { useCafe, useCafeCampaigns, useCafeProducts } from '@/features/catalog/catalog.hooks';
import { ProductRow } from '@/features/catalog/components/ProductRow';
import { CampaignCard } from '@/features/catalog/components/CampaignCard';
import { useCartStore } from '@/features/cart/cart.store';
import type { Product } from '@/shared/types/api';

const HERO_FALLBACK = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';

export default function CafeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<'menu' | 'campaigns'>('menu');
  const { data: cafe } = useCafe(slug);
  const { data: products } = useCafeProducts(slug);
  const { data: campaigns } = useCafeCampaigns(slug);
  const cartCount = useCartStore((s) => s.count());
  const cartTotal = useCartStore((s) => s.subtotal());

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    (products ?? []).forEach((p) => {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    });
    return Array.from(map.entries());
  }, [products]);

  return (
    <Screen edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.hero}>
          <Image source={{ uri: cafe?.image ?? HERO_FALLBACK }} style={styles.heroImg} />
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={tokens.color.text} />
          </Pressable>
          <View style={styles.heroOverlay}>
            <Text variant="title" style={styles.heroTitle}>{cafe?.name ?? ''}</Text>
            <View style={styles.heroMeta}>
              <Ionicons name="star" size={14} color={tokens.color.gold} />
              <Text style={styles.heroMetaTxt}>{cafe?.rating?.toFixed(1) ?? '—'}</Text>
              <Ionicons name="location-outline" size={14} color="#fff" style={{ marginLeft: 8 }} />
              <Text style={styles.heroMetaTxt}>{cafe?.location}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabs}>
          {(['menu', 'campaigns'] as const).map((t) => (
            <Pressable key={t} style={styles.tab} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabActive]}>
                {t === 'menu' ? 'Menü' : 'Kampanyalar'}
              </Text>
              {tab === t ? <View style={styles.tabBar} /> : null}
            </Pressable>
          ))}
        </View>

        {tab === 'menu' ? (
          <View style={styles.section}>
            {grouped.map(([category, items]) => (
              <View key={category} style={styles.group}>
                <Text variant="label" style={styles.groupTitle}>{category}</Text>
                {items.map((p) => (
                  <ProductRow key={p.id} product={p} cafeName={cafe?.name ?? ''} />
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            {(campaigns ?? []).map((c, i) => (
              <View key={c.id} style={{ marginBottom: tokens.spacing.md }}>
                <CampaignCard campaign={c} color={i % 2 === 0 ? tokens.color.primary : tokens.color.terracotta} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {cartCount > 0 ? (
        <Pressable style={styles.cartBar} onPress={() => router.push('/cart')}>
          <Ionicons name="cart-outline" size={20} color="#fff" />
          <Text style={styles.cartTxt}>Sepete Git ({cartCount} ürün · ₺{cartTotal})</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 240, justifyContent: 'flex-end' },
  heroImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  back: { position: 'absolute', top: 12, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { padding: tokens.spacing.xl },
  heroTitle: { color: '#fff' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  heroMetaTxt: { color: '#fff', fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: tokens.color.surface, paddingHorizontal: tokens.spacing.xl },
  tab: { flex: 1, alignItems: 'center', paddingVertical: tokens.spacing.lg },
  tabText: { fontWeight: '700', color: tokens.color.textMuted, fontSize: tokens.fontSize.lg },
  tabActive: { color: tokens.color.primaryDark },
  tabBar: { position: 'absolute', bottom: 0, height: 3, width: 40, borderRadius: 2, backgroundColor: tokens.color.primary },
  section: { padding: tokens.spacing.xl, gap: tokens.spacing.lg },
  group: { gap: tokens.spacing.md },
  groupTitle: { marginBottom: 2 },
  cartBar: {
    position: 'absolute',
    left: tokens.spacing.xl,
    right: tokens.spacing.xl,
    bottom: tokens.spacing.xl,
    height: 56,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    ...tokens.shadow.card,
  },
  cartTxt: { color: '#fff', fontWeight: '800', fontSize: tokens.fontSize.lg },
});
