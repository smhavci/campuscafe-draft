import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/auth.store';

/**
 * Entry gate. Redirects based on auth status. This is routing/architecture,
 * not UI — real screens are added later under app/(app) and app/(auth).
 */
export default function Index() {
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/home' : '/login'} />;
}
