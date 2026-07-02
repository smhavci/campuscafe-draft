import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Card, Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { useMe } from '@/features/auth/auth.hooks';
import { useAuthStore } from '@/store/auth.store';

export default function OwnerProfileScreen() {
  const { data: me } = useMe();
  const signOut = useAuthStore((s) => s.signOut);
  const initials = `${me?.firstName?.[0] ?? ''}${me?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <Screen edges={['top']}>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials}</Text></View>
          <View style={styles.flex}>
            <Text variant="heading">{me?.firstName} {me?.lastName}</Text>
            <Text variant="muted">Kafe · {me?.cafeName ?? ''}</Text>
          </View>
        </View>
        <Card onPress={() => void signOut()} style={styles.row}>
          <Ionicons name="log-out-outline" size={22} color={tokens.color.danger} />
          <Text style={styles.signout}>Çıkış Yap</Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: tokens.spacing.xl, gap: tokens.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: tokens.color.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontFamily: tokens.font.heading, fontSize: tokens.fontSize.xl, fontWeight: '800' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  signout: { color: tokens.color.danger, fontWeight: '700', fontSize: tokens.fontSize.md },
});
