import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { tokens } from '@/shared/theme/tokens';

export function StarBadge({ count }: { count: number }) {
  return (
    <View style={styles.badge}>
      <Ionicons name="star" size={14} color="#fff" />
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.color.gold,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
  },
  text: { color: '#fff', fontWeight: '800', fontSize: tokens.fontSize.md },
});
