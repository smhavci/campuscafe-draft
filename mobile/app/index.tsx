import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { useMe } from '@/features/auth/auth.hooks';
import { tokens } from '@/shared/theme/tokens';

/**
 * Entry gate. Redirects by auth status and role:
 * unauthenticated → login, cafeOwner → owner area, others → student tabs.
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const { data: me, isLoading } = useMe();

  const spinner = (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.background }}>
      <ActivityIndicator color={tokens.color.primary} />
    </View>
  );

  if (status === 'loading') return spinner;
  if (status === 'unauthenticated') return <Redirect href="/login" />;
  if (isLoading || !me) return spinner;
  return <Redirect href={me.role === 'cafeOwner' ? '/owner/panel' : '/home'} />;
}
