import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, Screen, SegmentedControl, Text, TextField } from '@/shared/ui';
import { tokens } from '@/shared/theme/tokens';
import { useLogin } from '@/features/auth/auth.hooks';
import { apiErrorMessage } from '@/shared/api/client';
import type { Role } from '@/shared/types/api';

const HERO = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';

export default function LoginScreen() {
  const router = useRouter();
  const login = useLogin();
  const [role, setRole] = useState<Role>('student');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    const payload =
      role === 'student' ? { role, studentNumber, password } : { role, email, password };
    login.mutate(payload, {
      onSuccess: (auth) => router.replace(auth.user.role === 'cafeOwner' ? '/owner/panel' : '/home'),
      onError: (err) => Alert.alert('Giriş başarısız', apiErrorMessage(err)),
    });
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image source={{ uri: HERO }} style={styles.heroImg} />
            <View style={styles.heroOverlay}>
              <Text variant="title" style={styles.brand}>☕ CampusCafe</Text>
              <Text style={styles.tagline}>Kampüsünde en iyi kahve deneyimi</Text>
            </View>
          </View>

          <View style={styles.form}>
            <SegmentedControl<Role>
              value={role}
              onChange={setRole}
              options={[
                { label: 'Öğrenci', value: 'student' },
                { label: 'Öğretmen', value: 'teacher' },
                { label: 'Kafe', value: 'cafeOwner' },
              ]}
            />

            {role === 'student' ? (
              <TextField
                label="Öğrenci Numarası"
                value={studentNumber}
                onChangeText={setStudentNumber}
                keyboardType="number-pad"
                placeholder="2021123456"
              />
            ) : (
              <TextField
                label="E-posta"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="ornek@kampus.edu.tr"
              />
            )}

            <TextField
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            <Button title="Giriş Yap" onPress={submit} loading={login.isPending} style={styles.submit} />

            <View style={styles.footer}>
              <Text variant="muted">Hesabın yok mu? </Text>
              <Link href="/register">
                <Text style={styles.link}>Kayıt Ol</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { height: 300, justifyContent: 'flex-end' },
  heroImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroOverlay: { padding: tokens.spacing.xl, paddingBottom: tokens.spacing.xxl },
  brand: { color: '#fff' },
  tagline: { color: '#fff', opacity: 0.9, marginTop: 4 },
  form: { padding: tokens.spacing.xl, gap: tokens.spacing.lg },
  submit: { marginTop: tokens.spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  link: { color: tokens.color.primaryDark, fontWeight: '800' },
});
