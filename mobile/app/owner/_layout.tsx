import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '@/shared/theme/tokens';

const icon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;

export default function OwnerLayout() {
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
      <Tabs.Screen name="panel" options={{ title: 'Panel', tabBarIcon: icon('bar-chart-outline') }} />
      <Tabs.Screen name="menu" options={{ title: 'Menü', tabBarIcon: icon('cube-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
