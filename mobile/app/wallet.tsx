import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Text } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { showToast } from '@/shared/ui/toast';
import { useTopUp, useWallet } from '@/features/wallet/wallet.hooks';

const PRESETS = [50, 100, 150, 200];

export default function WalletScreen() {
  const router = useRouter();
  const { data: wallet } = useWallet();
  const topUp = useTopUp();
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState('');

  const value = amount ?? (Number(custom) || 0);

  const load = () => {
    if (value <= 0) return;
    topUp.mutate(value, {
      onSuccess: () => {
        showToast('Bakiye yüklendi! 💳', 'success');
        setAmount(null);
        setCustom('');
      },
    });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={tokens.color.text} />
        </Pressable>
        <Text variant="heading">Cüzdan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>MEVCUT BAKİYE</Text>
          <Text style={styles.balanceNum}>₺{(wallet?.balance ?? 0).toFixed(2)}</Text>
        </View>

        <Text variant="heading">Bakiye Yükle</Text>
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable
              key={p}
              onPress={() => { setAmount(p); setCustom(''); }}
              style={[styles.preset, amount === p && styles.presetActive]}
            >
              <Text style={[styles.presetTxt, amount === p && styles.presetTxtActive]}>₺{p}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={custom}
          onChangeText={(t) => { setCustom(t); setAmount(null); }}
          placeholder="Özel miktar…"
          placeholderTextColor={tokens.color.textFaint}
          keyboardType="number-pad"
          style={styles.input}
        />
        <Button title="Yükle" onPress={load} loading={topUp.isPending} disabled={value <= 0} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.xl },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.color.surface, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  body: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.lg },
  balanceCard: { backgroundColor: '#2A211B', borderRadius: tokens.radius.xl, padding: tokens.spacing.xl, gap: tokens.spacing.sm },
  balanceLabel: { color: '#fff', opacity: 0.7, fontWeight: '700', letterSpacing: 1, fontSize: tokens.fontSize.sm },
  balanceNum: { color: '#fff', fontFamily: tokens.font.heading, fontSize: tokens.fontSize.display, fontWeight: '800' },
  presets: { flexDirection: 'row', gap: tokens.spacing.md },
  preset: { flex: 1, alignItems: 'center', paddingVertical: tokens.spacing.lg, borderRadius: tokens.radius.lg, backgroundColor: tokens.color.surface, borderWidth: 1.5, borderColor: 'transparent', ...tokens.shadow.card },
  presetActive: { borderColor: tokens.color.primary },
  presetTxt: { fontWeight: '800', color: tokens.color.text },
  presetTxtActive: { color: tokens.color.primaryDark },
  input: { backgroundColor: tokens.color.surface, borderRadius: tokens.radius.lg, height: 54, paddingHorizontal: tokens.spacing.lg, fontSize: tokens.fontSize.md, color: tokens.color.text },
});
