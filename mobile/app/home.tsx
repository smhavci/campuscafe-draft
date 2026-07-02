import { View, Text } from 'react-native';
import { tokens } from '@/shared/theme/tokens';
// Data layer ready — e.g. const { data: cafes } = useCafes(); UI comes later.

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.lg }}>
      <Text style={{ fontSize: tokens.fontSize.lg, color: tokens.color.text }}>Home</Text>
      <Text style={{ marginTop: tokens.spacing.sm, color: tokens.color.muted, textAlign: 'center' }}>
        Placeholder — catalog/orders mimarisi hazır (useCafes/useOrders). UI sonra.
      </Text>
    </View>
  );
}
