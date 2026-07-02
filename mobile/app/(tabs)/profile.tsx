import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Screen, StarBadge, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { useMe } from '@/features/auth/auth.hooks';
import { useWallet } from '@/features/wallet/wallet.hooks';
import { useFavoriteIds } from '@/features/favorites/favorites.hooks';
import { useSavedDrinks } from '@/features/saved-drinks/saved-drinks.hooks';
import { useAuthStore } from '@/store/auth.store';

const ROLE_LABEL: Record<string, string> = { student: 'Öğrenci', teacher: 'Öğretmen', cafeOwner: 'Kafe' };

export default function ProfileScreen() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: wallet } = useWallet();
  const { data: favIds } = useFavoriteIds();
  const { data: saved } = useSavedDrinks();
  const signOut = useAuthStore((s) => s.signOut);

  const initials = `${me?.firstName?.[0] ?? ''}${me?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials}</Text></View>
          <View style={styles.flex}>
            <Text variant="heading">{me?.firstName} {me?.lastName}</Text>
            <Text variant="muted">
              {ROLE_LABEL[me?.role ?? 'student']} · {me?.studentNumber ?? me?.email ?? ''}
            </Text>
            <View style={styles.badge}><StarBadge count={me?.stars ?? 0} /></View>
          </View>
        </View>

        <Row icon="wallet-outline" title="Cüzdan" subtitle={`Bakiye: ₺${wallet?.balance ?? 0}`} onPress={() => router.push('/wallet')} />
        <Row icon="heart-outline" title="Favorilerim" subtitle={`${favIds?.length ?? 0} ürün`} onPress={() => router.push('/favorites')} />
        <Row icon="cafe-outline" title="Kayıtlı İçecekler" subtitle={`${saved?.length ?? 0} tarif`} onPress={() => router.push('/saved-drinks')} />
        <Row icon="log-out-outline" title="Çıkış Yap" danger onPress={() => void signOut()} />
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  title,
  subtitle,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const color = danger ? tokens.color.danger : tokens.color.text;
  return (
    <Card onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={22} color={danger ? tokens.color.danger : tokens.color.primaryDark} />
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color }]}>{title}</Text>
        {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
      </View>
      {!danger ? <Ionicons name="chevron-forward" size={20} color={tokens.color.textFaint} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { padding: tokens.spacing.xl, gap: tokens.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.lg, marginBottom: tokens.spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: tokens.color.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontFamily: tokens.font.heading, fontSize: tokens.fontSize.xl, fontWeight: '800' },
  flex: { flex: 1 },
  badge: { flexDirection: 'row', marginTop: tokens.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.lg },
  rowTitle: { fontWeight: '700', fontSize: tokens.fontSize.md },
});
