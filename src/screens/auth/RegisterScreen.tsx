import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AuthStackParamList } from '../../navigation/AuthStack';
import { authService } from '../../services/authService';
import { colors, radii, spacing, typography } from '../../theme';

type RegisterScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'Register'
>;

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Ad soyad en az 2 karakter olmalı.'),
    email: z.string().trim().email('Geçerli bir e-posta adresi gir.'),
    password: z
      .string()
      .min(6, 'Parola en az 6 karakter olmalı.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Parolalar eşleşmiyor.',
    path: ['confirmPassword'],
  });

export default function RegisterScreen({
  navigation,
}: RegisterScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);

    const result = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      setError(
        result.error.issues[0]?.message ??
          'Bilgilerini kontrol edip tekrar dene.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: signUpError } = await authService.signUp(
        result.data.email,
        result.data.password,
        result.data.fullName,
      );

      if (signUpError) {
        console.log('REGISTER ERROR:', signUpError);
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setSuccessMessage(
          'Hesabın oluşturuldu. E-posta adresini doğrulaman gerekiyorsa gelen kutunu kontrol et.',
        );
        return;
      }

      setSuccessMessage(
        'Hesabın başarıyla oluşturuldu. Giriş yapabilirsin.',
      );
    } catch {
      setError(
        'Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <View style={styles.logoVertical} />
              <View style={styles.logoHorizontal} />
            </View>

            <View style={styles.intro}>
              <Text style={styles.eyebrow}>EKİPMANTAKİP</Text>
              <Text style={styles.title}>Hesabını oluştur.</Text>
              <Text style={styles.subtitle}>
                Ekipman rezervasyonlarını ve işlemlerini tek bir yerden
                yönetmeye başla.
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                placeholder="Adını ve soyadını gir"
                placeholderTextColor={colors.placeholder}
                value={fullName}
                onChangeText={(value) => {
                  setFullName(value);
                  clearMessages();
                }}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="name"
                textContentType="name"
                editable={!isSubmitting}
                returnKeyType="next"
                accessibilityLabel="Ad Soyad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>E-posta adresi</Text>
              <TextInput
                style={styles.input}
                placeholder="ornek@firma.com"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  clearMessages();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={!isSubmitting}
                returnKeyType="next"
                accessibilityLabel="E-posta adresi"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Parola</Text>
              <TextInput
                style={styles.input}
                placeholder="En az 6 karakter"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearMessages();
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!isSubmitting}
                returnKeyType="next"
                accessibilityLabel="Parola"
              />
              <Text style={styles.helperText}>
                Parolan en az 6 karakterden oluşmalı.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Parola Tekrarı</Text>
              <TextInput
                style={styles.input}
                placeholder="Parolanı tekrar gir"
                placeholderTextColor={colors.placeholder}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  clearMessages();
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!isSubmitting}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                accessibilityLabel="Parola tekrarı"
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>İşlem tamamlanamadı</Text>
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              </View>
            )}

            {successMessage && (
              <View style={styles.successContainer}>
                <Text style={styles.successTitle}>Bilgilendirme</Text>
                <Text accessibilityRole="alert" style={styles.success}>
                  {successMessage}
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !isSubmitting && styles.submitButtonPressed,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Hesap oluştur"
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Hesap Oluştur</Text>
              )}
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>Zaten hesabın var mı?</Text>
              <Pressable
                onPress={() => navigation.goBack()}
                disabled={isSubmitting}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.loginLink}>Giriş yap</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footerContainer}>
            <View style={styles.footerLine} />
            <Text style={styles.footer}>
              Ekipman yönetimi, tek bir yerde.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    flexGrow: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },

  header: {
    marginBottom: spacing.xxl,
  },

  logo: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.navyLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },

  logoVertical: {
    position: 'absolute',
    width: 6,
    height: 25,
    left: 13,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
  },

  logoHorizontal: {
    position: 'absolute',
    width: 19,
    height: 6,
    right: 7,
    top: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },

  intro: {
    gap: spacing.sm,
  },

  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },

  title: {
    color: colors.text,
    fontSize: typography.title,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.xs,
    maxWidth: 350,
  },

  form: {
    gap: spacing.lg,
  },

  field: {
    gap: spacing.sm,
  },

  label: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '600',
  },

  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontSize: typography.body,
    color: colors.text,
  },

  helperText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 17,
  },

  errorContainer: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },

  errorTitle: {
    color: colors.error,
    fontSize: typography.label,
    fontWeight: '700',
  },

  error: {
    color: colors.text,
    fontSize: typography.label,
    lineHeight: 20,
  },

  successContainer: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },

  successTitle: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },

  success: {
    color: colors.text,
    fontSize: typography.label,
    lineHeight: 20,
  },

  submitButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },

  submitButtonPressed: {
    backgroundColor: colors.primaryPressed,
    opacity: 0.92,
  },

  disabledButton: {
    opacity: 0.65,
  },

  submitButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },

  loginPrompt: {
    color: colors.textSecondary,
    fontSize: typography.label,
  },

  loginLink: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },

  footerContainer: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.md,
  },

  footerLine: {
    height: 1,
    width: 44,
    backgroundColor: colors.border,
  },

  footer: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
});