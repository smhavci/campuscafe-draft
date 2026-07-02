import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, EmptyState, Screen, Text, TopTabs } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import {
  useDeleteCampaign,
  useDeleteProduct,
  useMenuCampaigns,
  useMenuProducts,
  useToggleCampaign,
  useToggleProduct,
} from '@/features/menu/menu.hooks';

const FALLBACK = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200';

export default function MenuManagementScreen() {
  const [tab, setTab] = useState<'products' | 'campaigns'>('products');
  return (
    <Screen edges={['top']}>
      <View style={styles.head}>
        <Text variant="title">Menü Yönetimi</Text>
        <TopTabs
          value={tab}
          onChange={setTab}
          options={[
            { label: 'Ürünler', value: 'products' },
            { label: 'Kampanyalar', value: 'campaigns' },
          ]}
        />
      </View>
      {tab === 'products' ? <ProductsTab /> : <CampaignsTab />}
    </Screen>
  );
}

function ProductsTab() {
  const router = useRouter();
  const { data: products, isLoading } = useMenuProducts();
  const toggle = useToggleProduct();
  const del = useDeleteProduct();

  const confirmDelete = (id: number, name: string) =>
    Alert.alert('Ürünü sil', `"${name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => del.mutate(id) },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.addBtn} onPress={() => router.push('/owner-product-form')}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addTxt}>Yeni Ürün Ekle</Text>
      </Pressable>

      {(products ?? []).length === 0 && !isLoading ? (
        <EmptyState icon="cube-outline" title="Ürün yok" subtitle="İlk ürününü ekleyerek başla." />
      ) : (
        (products ?? []).map((p) => (
          <Card key={p.id} style={styles.row}>
            <Image source={{ uri: p.image ?? FALLBACK }} style={styles.img} />
            <View style={styles.flex}>
              <Text style={styles.name}>{p.name}</Text>
              <Text variant="muted">₺{p.price} · {p.category}</Text>
            </View>
            <Switch
              value={p.isAvailable}
              onValueChange={(v) => toggle.mutate({ id: p.id, isAvailable: v })}
              trackColor={{ true: tokens.color.primary }}
            />
            <Pressable hitSlop={6} onPress={() => router.push(`/owner-product-form?id=${p.id}`)}>
              <Ionicons name="create-outline" size={20} color={tokens.color.textMuted} />
            </Pressable>
            <Pressable hitSlop={6} onPress={() => confirmDelete(p.id, p.name)}>
              <Ionicons name="trash-outline" size={20} color={tokens.color.danger} />
            </Pressable>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function CampaignsTab() {
  const router = useRouter();
  const { data: campaigns, isLoading } = useMenuCampaigns();
  const toggle = useToggleCampaign();
  const del = useDeleteCampaign();

  const confirmDelete = (id: number, title: string) =>
    Alert.alert('Kampanyayı sil', `"${title}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => del.mutate(id) },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <Pressable style={styles.addBtn} onPress={() => router.push('/owner-campaign-form')}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addTxt}>Yeni Kampanya</Text>
      </Pressable>

      {(campaigns ?? []).length === 0 && !isLoading ? (
        <EmptyState icon="pricetag-outline" title="Kampanya yok" subtitle="İlk kampanyanı oluştur." />
      ) : (
        (campaigns ?? []).map((c) => (
          <Card key={c.id} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.name}>{c.title}</Text>
              <Text variant="muted">{c.discount || '—'} · {c.isActive ? 'Aktif' : 'Pasif'}</Text>
            </View>
            <Switch
              value={c.isActive}
              onValueChange={(v) => toggle.mutate({ id: c.id, isActive: v })}
              trackColor={{ true: tokens.color.primary }}
            />
            <Pressable hitSlop={6} onPress={() => router.push(`/owner-campaign-form?id=${c.id}`)}>
              <Ionicons name="create-outline" size={20} color={tokens.color.textMuted} />
            </Pressable>
            <Pressable hitSlop={6} onPress={() => confirmDelete(c.id, c.title)}>
              <Ionicons name="trash-outline" size={20} color={tokens.color.danger} />
            </Pressable>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { padding: tokens.spacing.xl, gap: tokens.spacing.md },
  body: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm, backgroundColor: tokens.color.primary, borderRadius: tokens.radius.lg, paddingVertical: tokens.spacing.lg },
  addTxt: { color: '#fff', fontWeight: '800', fontSize: tokens.fontSize.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.md },
  img: { width: 48, height: 48, borderRadius: tokens.radius.md },
  flex: { flex: 1 },
  name: { fontWeight: '800', color: tokens.color.text },
});
