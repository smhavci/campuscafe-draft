import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, Card, Screen, Text, TextField } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { useRegister } from '@/features/auth/auth.hooks';
import { useCafes } from '@/features/catalog/catalog.hooks';
import { apiErrorMessage } from '@/shared/api/client';
import type { Role } from '@/shared/types/api';

const ROLE_OPTIONS: { value: Role; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'student', title: 'Öğrenci', subtitle: 'Öğrenci numarası ile giriş', icon: 'school-outline' },
  { value: 'teacher', title: 'Öğretmen', subtitle: 'E-posta ile giriş', icon: 'book-outline' },
  { value: 'cafeOwner', title: 'Kafe Sahibi', subtitle: 'Kafenizi yönetin', icon: 'cafe-outline' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const register = useRegister();
  const { data: cafes } = useCafes();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>('student');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cafeId, setCafeId] = useState<number | null>(null);

  const submit = () => {
    register.mutate(
      {
        role,
        firstName,
        lastName,
        password,
        studentNumber: role === 'student' ? studentNumber : undefined,
        email: role !== 'student' ? email : undefined,
        cafeId: role === 'cafeOwner' ? cafeId ?? undefined : undefined,
      },
      {
        onSuccess: (auth) => router.replace(auth.user.role === 'cafeOwner' ? '/owner/panel' : '/home'),
        onError: (err) => Alert.alert('Kayıt başarısız', apiErrorMessage(err)),
      },
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => (step === 1 ? router.back() : setStep(1))} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={tokens.color.text} />
        </Pressable>
        <Text variant="heading">Hesap Oluştur</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <>
            <Text variant="muted">Hesap türünü seçin</Text>
            {ROLE_OPTIONS.map((opt) => (
              <Card key={opt.value} onPress={() => setRole(opt.value)} style={[styles.roleCard, role === opt.value && styles.roleActive]}>
                <View style={styles.roleRow}>
                  <Ionicons name={opt.icon} size={28} color={tokens.color.primaryDark} />
                  <View style={styles.flex}>
                    <Text style={styles.roleTitle}>{opt.title}</Text>
                    <Text variant="muted">{opt.subtitle}</Text>
                  </View>
                  <Ionicons
                    name={role === opt.value ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={role === opt.value ? tokens.color.primaryDark : tokens.color.textFaint}
                  />
                </View>
              </Card>
            ))}
            <Button title="Devam Et" onPress={() => setStep(2)} style={styles.action} />
          </>
        ) : (
          <>
            <TextField label="Ad" value={firstName} onChangeText={setFirstName} placeholder="Ayşe" />
            <TextField label="Soyad" value={lastName} onChangeText={setLastName} placeholder="Kaya" />
            {role === 'student' ? (
              <TextField label="Öğrenci Numarası" value={studentNumber} onChangeText={setStudentNumber} keyboardType="number-pad" placeholder="11 haneli" />
            ) : (
              <TextField label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="ornek@kampus.edu.tr" />
            )}
            <TextField label="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 6 karakter" />

            {role === 'cafeOwner' ? (
              <View style={styles.gap}>
                <Text variant="label">Kafe Seçin</Text>
                {cafes?.map((c) => (
                  <Card key={c.id} onPress={() => setCafeId(c.id)} style={[styles.cafePick, cafeId === c.id && styles.roleActive]}>
                    <Text style={styles.roleTitle}>{c.name}</Text>
                    <Text variant="muted">{c.location}</Text>
                  </Card>
                ))}
              </View>
            ) : null}

            <Button title="Kayıt Ol" onPress={submit} loading={register.isPending} style={styles.action} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, paddingHorizontal: tokens.spacing.xl, paddingVertical: tokens.spacing.md },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: tokens.color.surface, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
  body: { padding: tokens.spacing.xl, gap: tokens.spacing.lg },
  flex: { flex: 1 },
  gap: { gap: tokens.spacing.md },
  roleCard: { borderWidth: 2, borderColor: 'transparent' },
  roleActive: { borderWidth: 2, borderColor: tokens.color.primary },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.lg },
  roleTitle: { fontWeight: '800', fontSize: tokens.fontSize.lg },
  cafePick: { borderWidth: 2, borderColor: 'transparent' },
  action: { marginTop: tokens.spacing.md },
});
