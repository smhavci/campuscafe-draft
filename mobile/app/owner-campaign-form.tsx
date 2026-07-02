import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Screen, SegmentedControl, Text, TextField } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { showToast } from '@/shared/ui/toast';
import { apiErrorMessage } from '@/shared/api/client';
import { useMenuCampaigns, useSaveCampaign } from '@/features/menu/menu.hooks';

type Target = 'all' | 'student' | 'teacher';

export default function CampaignFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const editId = id ? Number(id) : undefined;
  const { data: campaigns } = useMenuCampaigns();
  const existing = editId ? campaigns?.find((c) => c.id === editId) : undefined;
  const save = useSaveCampaign();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discount, setDiscount] = useState('');
  const [badge, setBadge] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [targetRole, setTargetRole] = useState<Target>('all');

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? '');
      setDiscount(existing.discount ?? '');
      setBadge(existing.badge ?? '');
      setValidUntil(existing.validUntil ? existing.validUntil.slice(0, 10) : '');
      setTargetRole(existing.targetRole);
    }
  }, [existing]);

  const onSave = () => {
    if (!title.trim()) {
      Alert.alert('Eksik alan', 'Kampanya başlığı zorunludur.');
      return;
    }
    save.mutate(
      {
        id: editId,
        input: {
          title,
          description,
          discount,
          badge,
          validUntil: validUntil || undefined,
          targetRole,
        },
      },
      {
        onSuccess: () => {
          showToast(editId ? 'Kampanya güncellendi' : 'Kampanya eklendi', 'success');
          router.back();
        },
        onError: (err) => showToast(apiErrorMessage(err), 'error'),
      },
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={tokens.color.text} />
        </Pressable>
        <Text variant="heading">{editId ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextField label="Başlık" value={title} onChangeText={setTitle} placeholder="Öğrenci İndirimi" />
        <TextField label="Açıklama" value={description} onChangeText={setDescription} placeholder="Tüm kahvelerde %20…" />
        <TextField label="İndirim" value={discount} onChangeText={setDiscount} placeholder="%20" />
        <TextField label="Rozet" value={badge} onChangeText={setBadge} placeholder="Öğrencilere Özel" />
        <TextField label="Bitiş (YYYY-AA-GG)" value={validUntil} onChangeText={setValidUntil} placeholder="2026-06-30" autoCapitalize="none" />
        <View style={styles.gap}>
          <Text variant="label">Hedef Kitle</Text>
          <SegmentedControl<Target>
            value={targetRole}
            onChange={setTargetRole}
            options={[
              { label: 'Herkes', value: 'all' },
              { label: 'Öğrenci', value: 'student' },
              { label: 'Öğretmen', value: 'teacher' },
            ]}
          />
        </View>
        <Button title="Kaydet" onPress={onSave} loading={save.isPending} style={styles.save} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.xl },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.color.surface, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  body: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.lg },
  gap: { gap: tokens.spacing.sm },
  save: { marginTop: tokens.spacing.md },
});
