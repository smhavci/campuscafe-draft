import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { tokens } from '@/shared/theme/tokens';

export function EmptyState({
  icon = 'cafe-outline',
  title,
  subtitle,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={48} color={tokens.color.textFaint} />
      <Text variant="heading" style={styles.title}>{title}</Text>
      {subtitle ? <Text variant="muted" style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: tokens.spacing.xxl * 2, gap: tokens.spacing.sm },
  title: { marginTop: tokens.spacing.sm },
  subtitle: { textAlign: 'center', paddingHorizontal: tokens.spacing.xl },
});
