import { View, Text } from 'react-native';
import { tokens } from '@/shared/theme/tokens';
// Wiring is ready — screen UI is intentionally NOT designed yet.
// Build the form here later using: const { mutate, isPending } = useLogin();

export default function LoginScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.lg }}>
      <Text style={{ fontSize: tokens.fontSize.lg, color: tokens.color.text }}>Login</Text>
      <Text style={{ marginTop: tokens.spacing.sm, color: tokens.color.muted, textAlign: 'center' }}>
        Placeholder — auth mimarisi hazır (useLogin/useRegister). UI sonra.
      </Text>
    </View>
  );
}
