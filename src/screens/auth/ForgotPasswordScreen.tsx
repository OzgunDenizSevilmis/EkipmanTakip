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

import { authService } from '../../services/authService';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { colors, radii, spacing, typography } from '../../theme';

type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta adresi gir.'),
});

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);

    const result = forgotPasswordSchema.safeParse({
      email,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'E-posta adresini kontrol et.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: resetError } = await authService.resetPassword(result.data.email);

      if (resetError) {
        console.log('PASSWORD RESET ERROR:', resetError);
        setError(resetError.message);
        return;
      }

      setSuccessMessage(
        'Şifre sıfırlama bağlantısı e-posta adresine gönderildi. Gelen kutunu kontrol et.',
      );
    } catch {
      setError('Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.');
    } finally {
      setIsSubmitting(false);
    }
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
          <View style={styles.logo}>
            <View style={styles.logoVertical} />
            <View style={styles.logoHorizontal} />
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>HESAP GÜVENLİĞİ</Text>

            <Text style={styles.title}>Parolanı mı unuttun?</Text>

            <Text style={styles.subtitle}>
              Hesabına bağlı e-posta adresini gir. Sana parola sıfırlama bağlantısı gönderelim.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>E-posta adresi</Text>

              <TextInput
                style={styles.input}
                placeholder="ornek@firma.com"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError(null);
                  setSuccessMessage(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={!isSubmitting}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />
            </View>

            {error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}

            {successMessage && (
              <Text accessibilityRole="alert" style={styles.success}>
                {successMessage}
              </Text>
            )}

            <Pressable
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Sıfırlama Bağlantısı Gönder</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={isSubmitting}
            >
              <Text style={styles.backButtonText}>Giriş ekranına dön</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>Ekipman yönetimi, tek bir yerde.</Text>
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

  logo: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.xxxl,
  },

  logoVertical: {
    position: 'absolute',
    width: 6,
    height: 23,
    left: 12,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
  },

  logoHorizontal: {
    position: 'absolute',
    width: 17,
    height: 6,
    right: 7,
    top: 11,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },

  intro: {
    marginBottom: spacing.xxl,
  },

  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },

  title: {
    color: colors.text,
    fontSize: typography.title,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.9,
    marginBottom: spacing.md,
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 340,
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

  error: {
    color: colors.error,
    backgroundColor: colors.errorBackground,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: typography.label,
    lineHeight: 20,
  },

  success: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: spacing.md,
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

  disabledButton: {
    opacity: 0.65,
  },

  submitButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },

  backButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  backButtonText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xxxl,
  },
});
