import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, EmptyState, Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { showToast } from '@/shared/ui/toast';
import { formatTRY } from '@/shared/utils/format';
import { useCartStore } from '@/features/cart/cart.store';
import { useCreateOrder } from '@/features/orders/orders.hooks';
import { useWallet } from '@/features/wallet/wallet.hooks';
import { useMe } from '@/features/auth/auth.hooks';
import { apiErrorMessage } from '@/shared/api/client';
import type { PaymentMethod } from '@/shared/types/api';

const FALLBACK = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200';

export default function CartScreen() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const cafeName = useCartStore((s) => s.cafeName);
  const subtotal = useCartStore((s) => s.subtotal());
  const starTotal = useCartStore((s) => s.starTotal());
  const redeemable = useCartStore((s) => s.allStarRedeemable());
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const toOrderInput = useCartStore((s) => s.toOrderInput);

  const { data: wallet } = useWallet();
  const { data: me } = useMe();
  const createOrder = useCreateOrder();
  const [method, setMethod] = useState<PaymentMethod>('credit_card');

  const balance = wallet?.balance ?? 0;
  const stars = me?.stars ?? 0;
  const canWallet = balance >= subtotal;
  const canStars = redeemable && stars >= starTotal;

  const confirm = () => {
    if (method === 'wallet' && !canWallet) return Alert.alert('Yetersiz bakiye', 'Cüzdan bakiyeniz yetersiz.');
    if (method === 'stars' && !canStars) return Alert.alert('Yıldızla ödenemiyor', 'Ürünler yıldızla alınamıyor veya bakiye yetersiz.');
    createOrder.mutate(toOrderInput(method), {
      onSuccess: (order) => {
        clear();
        showToast('Siparişin alındı! 🎉', 'success');
        router.replace(`/order/${order.id}`);
      },
      onError: (err) => Alert.alert('Sipariş oluşturulamadı', apiErrorMessage(err)),
    });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={tokens.color.text} />
        </Pressable>
        <Text variant="heading">Sepet</Text>
      </View>

      {items.length === 0 ? (
        <EmptyState icon="cart-outline" title="Sepetin boş" subtitle="Bir kafeden ürün ekleyerek başla." />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {cafeName ? <Text variant="label">{cafeName}</Text> : null}

            {items.map((i) => (
              <View key={i.key} style={styles.item}>
                <Image source={{ uri: i.image ?? FALLBACK }} style={styles.itemImg} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{i.name}</Text>
                  {i.options.length > 0 ? (
                    <Text variant="muted" numberOfLines={1}>{i.options.map((o) => o.name).join(', ')}</Text>
                  ) : null}
                  <Text variant="price">{formatTRY(i.unitPrice * i.quantity)}</Text>
                </View>
                <View style={styles.qtyCol}>
                  <View style={styles.stepper}>
                    <Pressable onPress={() => setQty(i.key, i.quantity - 1)} hitSlop={6}>
                      <Ionicons name="remove" size={18} color={tokens.color.text} />
                    </Pressable>
                    <Text style={styles.qty}>{i.quantity}</Text>
                    <Pressable onPress={() => setQty(i.key, i.quantity + 1)} hitSlop={6}>
                      <Ionicons name="add" size={18} color={tokens.color.text} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => remove(i.key)} hitSlop={6}>
                    <Ionicons name="trash-outline" size={18} color={tokens.color.danger} />
                  </Pressable>
                </View>
              </View>
            ))}

            <Text variant="label" style={styles.payTitle}>Ödeme Yöntemi</Text>
            <PayOption
              active={method === 'credit_card'}
              icon="card-outline"
              title="Kredi Kartı"
              onPress={() => setMethod('credit_card')}
            />
            <PayOption
              active={method === 'wallet'}
              icon="wallet-outline"
              title="Cüzdan"
              subtitle={`Bakiye: ₺${balance}`}
              disabled={!canWallet}
              onPress={() => setMethod('wallet')}
            />
            <PayOption
              active={method === 'stars'}
              icon="star-outline"
              title="Yıldız ile öde"
              subtitle={redeemable ? `${starTotal} yıldız · bakiye ${stars}` : 'Bu ürünler yıldızla alınamaz'}
              disabled={!canStars}
              onPress={() => setMethod('stars')}
            />
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text variant="muted">Toplam</Text>
              <Text variant="heading">{method === 'stars' ? `${starTotal} ⭐` : formatTRY(subtotal)}</Text>
            </View>
            <Button title="Siparişi Onayla" onPress={confirm} loading={createOrder.isPending} />
          </View>
        </>
      )}
    </Screen>
  );
}

function PayOption({
  active,
  icon,
  title,
  subtitle,
  disabled,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.pay, active && styles.payActive, disabled && styles.payDisabled]}
    >
      <Ionicons name={icon} size={22} color={active ? tokens.color.primaryDark : tokens.color.textMuted} />
      <View style={styles.flex}>
        <Text style={styles.payName}>{title}</Text>
        {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
      </View>
      <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? tokens.color.primaryDark : tokens.color.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.xl },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.color.surface, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  body: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  item: { flexDirection: 'row', gap: tokens.spacing.md, backgroundColor: tokens.color.surface, borderRadius: tokens.radius.lg, padding: tokens.spacing.md, ...tokens.shadow.card },
  itemImg: { width: 56, height: 56, borderRadius: tokens.radius.md },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontWeight: '800', color: tokens.color.text },
  qtyCol: { alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, backgroundColor: tokens.color.surfaceMuted, borderRadius: tokens.radius.pill, paddingHorizontal: tokens.spacing.md, paddingVertical: 4 },
  qty: { fontWeight: '800', minWidth: 16, textAlign: 'center' },
  payTitle: { marginTop: tokens.spacing.lg },
  pay: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, backgroundColor: tokens.color.surface, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, borderWidth: 1.5, borderColor: 'transparent' },
  payActive: { borderColor: tokens.color.primary },
  payDisabled: { opacity: 0.45 },
  payName: { fontWeight: '700', color: tokens.color.text },
  flex: { flex: 1 },
  footer: { padding: tokens.spacing.xl, gap: tokens.spacing.md, borderTopWidth: 1, borderTopColor: tokens.color.border, backgroundColor: tokens.color.background },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
