import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { tokens } from '@/shared/theme/tokens';

/** Pill-style segmented tabs used inside owner screens (Aktif/Geçmiş/Analiz etc.). */
export function TopTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.tab, active && styles.active]}>
            <Text style={[styles.text, active && styles.textActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: tokens.color.surface, borderRadius: tokens.radius.pill, padding: 4, ...tokens.shadow.card },
  tab: { flex: 1, paddingVertical: 12, borderRadius: tokens.radius.pill, alignItems: 'center' },
  active: { backgroundColor: tokens.color.primary },
  text: { fontWeight: '700', color: tokens.color.textMuted },
  textActive: { color: tokens.color.onPrimary },
});
