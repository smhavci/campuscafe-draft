import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/shared/api/query-client';
import { useAuthStore } from '@/store/auth.store';
import { RealtimeBridge } from '@/shared/realtime/RealtimeBridge';
import { ToastHost } from '@/shared/ui/toast';

// Root layout: providers + auth bootstrap + a headerless stack.
export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="product/[id]" options={{ presentation: 'modal' }} />
        </Stack>
        <RealtimeBridge />
        <ToastHost />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
