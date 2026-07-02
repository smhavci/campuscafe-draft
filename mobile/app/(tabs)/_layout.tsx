import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/theme/tokens';

const icon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.primaryDark,
        tabBarInactiveTintColor: tokens.color.textFaint,
        tabBarStyle: { backgroundColor: tokens.color.background, borderTopColor: tokens.color.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Ana Sayfa', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="explore" options={{ title: 'Keşfet', tabBarIcon: icon('search-outline') }} />
      <Tabs.Screen name="orders" options={{ title: 'Siparişler', tabBarIcon: icon('receipt-outline') }} />
      <Tabs.Screen name="rewards" options={{ title: 'Ödüller', tabBarIcon: icon('gift-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
