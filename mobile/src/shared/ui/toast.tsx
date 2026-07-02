import { create } from 'zustand';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './Text';
import { tokens } from '@/shared/theme/tokens';

export type ToastType = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}
interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType) => void;
}

let seq = 0;
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = 'info') => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },
}));

/** Fire a toast from anywhere (event handlers, mutations). */
export const showToast = (message: string, type?: ToastType) => useToastStore.getState().show(message, type);

const bg: Record<ToastType, string> = {
  info: tokens.color.text,
  success: tokens.color.success,
  error: tokens.color.danger,
};

/** Renders active toasts at the top; mount once at the app root. */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <SafeAreaView edges={['top']} style={styles.host} pointerEvents="none">
      {toasts.map((t) => (
        <View key={t.id} style={[styles.toast, { backgroundColor: bg[t.type] }]}>
          <Text style={styles.txt}>{t.message}</Text>
        </View>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', gap: 8, paddingTop: 8, zIndex: 1000 },
  toast: { maxWidth: '92%', paddingHorizontal: tokens.spacing.lg, paddingVertical: tokens.spacing.md, borderRadius: tokens.radius.md, ...tokens.shadow.card },
  txt: { color: '#fff', fontWeight: '700' },
});
