import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { showToast } from '@/shared/ui/toast';
import { apiErrorMessage } from '@/shared/api/client';
import { useCafeCoffees, useRedeem } from '@/features/loyalty/loyalty.hooks';

const FALLBACK = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200';

export default function RedeemScreen() {
  const { cafeId } = useLocalSearchParams<{ cafeId: string }>();
  const router = useRouter();
  const id = Number(cafeId);
  const { data: coffees } = useCafeCoffees(id);
  const redeem = useRedeem();

  const pick = (productId: number) =>
    redeem.mutate(
      { cafeId: id, productId },
      {
        onSuccess: (res) => {
          showToast('Ücretsiz kahven hazırlanıyor! 🎁', 'success');
          router.replace(`/order/${res.orderId}`);
        },
        onError: (err) => showToast(apiErrorMessage(err), 'error'),
      },
    );

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={tokens.color.text} />
        </Pressable>
        <Text variant="heading">Ücretsiz Kahve Seç</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {(coffees ?? []).map((c) => (
          <Card key={c.id} onPress={() => pick(c.id)} style={styles.card}>
            <Image source={{ uri: c.image ?? FALLBACK }} style={styles.img} />
            <View style={styles.flex}>
              <Text style={styles.name}>{c.name}</Text>
              {c.description ? <Text variant="muted" numberOfLines={1}>{c.description}</Text> : null}
            </View>
            <Ionicons name="gift-outline" size={22} color={tokens.color.success} />
          </Card>
        ))}
      </ScrollView>
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
