import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';
import { Text } from './Text';
import { tokens } from '@/shared/theme/tokens';

export function TextField({ label, ...rest }: TextInputProps & { label?: string }) {
  return (
    <View style={styles.wrap}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput placeholderTextColor={tokens.color.textFaint} style={styles.input} {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.sm },
  input: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.lg,
    height: 54,
    paddingHorizontal: tokens.spacing.lg,
    fontSize: tokens.fontSize.md,
    color: tokens.color.text,
  },
});
