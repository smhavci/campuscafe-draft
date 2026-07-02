import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Screen, Text, TextField } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { showToast } from '@/shared/ui/toast';
import { apiErrorMessage } from '@/shared/api/client';
import { useMenuProducts, useSaveProduct } from '@/features/menu/menu.hooks';

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const editId = id ? Number(id) : undefined;
  const { data: products } = useMenuProducts();
  const existing = editId ? products?.find((p) => p.id === editId) : undefined;
  const save = useSaveProduct();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setCategory(existing.category);
      setPrice(String(existing.price));
      setDescription(existing.description ?? '');
      setImage(existing.image ?? '');
    }
  }, [existing]);

  const onSave = () => {
    if (!name.trim() || !category.trim() || !price) {
      Alert.alert('Eksik alan', 'İsim, kategori ve fiyat zorunludur.');
      return;
    }
    save.mutate(
      { id: editId, input: { name, category, price: Number(price), description, image } },
      {
        onSuccess: () => {
          showToast(editId ? 'Ürün güncellendi' : 'Ürün eklendi', 'success');
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
        <Text variant="heading">{editId ? 'Ürünü Düzenle' : 'Yeni Ürün'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TextField label="İsim" value={name} onChangeText={setName} placeholder="Latte" />
        <TextField label="Kategori" value={category} onChangeText={setCategory} placeholder="coffee" />
        <TextField label="Fiyat (₺)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="65" />
        <TextField label="Açıklama" value={description} onChangeText={setDescription} placeholder="Kremsi espresso…" />
        <TextField label="Görsel URL" value={image} onChangeText={setImage} autoCapitalize="none" placeholder="https://…" />
        <Button title="Kaydet" onPress={onSave} loading={save.isPending} style={styles.save} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, padding: tokens.spacing.xl },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.color.surface, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  body: { paddingHorizontal: tokens.spacing.xl, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.lg },
  save: { marginTop: tokens.spacing.md },
});
