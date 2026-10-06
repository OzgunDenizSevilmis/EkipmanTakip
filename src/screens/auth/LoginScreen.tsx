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
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { authService } from '../../services/authService';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { colors, radii, spacing, typography } from '../../theme';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const loginSchema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta adresi gir.'),
  password: z.string().min(1, 'Parola alanı zorunludur.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginScreen({ navigation }: LoginScreenProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      const { error } = await authService.signIn(
        values.email.trim(),
        values.password,
      );

      if (error) {
        setServerError(
          'Giriş yapılamadı. E-posta adresini ve parolanı kontrol et.',
        );
      }
    } catch {
      setServerError(
        'Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.',
      );
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
          <View style={styles.brand}>
            <View style={styles.logo}>
              <View style={styles.logoVertical} />
              <View style={styles.logoHorizontal} />
            </View>
            <Text style={styles.brandName}>EkipmanTakip</Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>HESAP ERİŞİMİ</Text>
            <Text style={styles.title}>Tekrar hoş geldin.</Text>
            <Text style={styles.subtitle}>
              Ekipmanlarını ve rezervasyonlarını yönetmek için hesabına giriş
              yap.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>E-posta adresi</Text>

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="ornek@firma.com"
                    placeholderTextColor={colors.placeholder}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      setServerError(null);
                    }}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    accessibilityLabel="E-posta adresi"
                    editable={!isSubmitting}
                    returnKeyType="next"
                  />
                )}
              />

              {errors.email && (
                <Text style={styles.fieldError}>{errors.email.message}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Parola</Text>

              <View
                style={[
                  styles.passwordContainer,
                  errors.password && styles.inputError,
                ]}
              >
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Parolanı gir"
                      placeholderTextColor={colors.placeholder}
                      value={value}
                      onChangeText={(text) => {
                        onChange(text);
                        setServerError(null);
                      }}
                      onBlur={onBlur}
                      secureTextEntry={!isPasswordVisible}
                      autoCapitalize="none"
                      autoComplete="current-password"
                      textContentType="password"
                      accessibilityLabel="Parola"
                      editable={!isSubmitting}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                  )}
                />

                <Pressable
                  onPress={() =>
                    setIsPasswordVisible((current) => !current)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPasswordVisible ? 'Parolayı gizle' : 'Parolayı göster'
                  }
                  hitSlop={8}
                >
                  <Text style={styles.passwordToggle}>
                    {isPasswordVisible ? 'Gizle' : 'Göster'}
                  </Text>
                </Pressable>
              </View>

              {errors.password && (
                <Text style={styles.fieldError}>
                  {errors.password.message}
                </Text>
              )}

              <Pressable
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={isSubmitting}
                accessibilityRole="button"
              >
                <Text style={styles.linkText}>Parolamı unuttum</Text>
              </Pressable>
            </View>

            {serverError && (
              <Text accessibilityRole="alert" style={styles.serverError}>
                {serverError}
              </Text>
            )}

            <Pressable
              style={[
                styles.submitButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Giriş Yap</Text>
              )}
            </Pressable>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Henüz hesabın yok mu?</Text>
              <Pressable
                onPress={() => navigation.navigate('Register')}
                disabled={isSubmitting}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.linkText}> Kayıt Ol</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.footer}>
            Ekipman yönetimi, tek bir yerde.
          </Text>
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
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.4,
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
    color: colors.navy,
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
  inputError: {
    borderColor: colors.error,
  },
  passwordContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.text,
  },
  passwordToggle: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '700',
    paddingLeft: spacing.sm,
    paddingVertical: spacing.sm,
  },
  fieldError: {
    color: colors.error,
    fontSize: typography.caption,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingTop: spacing.xs,
  },
  linkText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  serverError: {
    color: colors.error,
    backgroundColor: colors.errorBackground,
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  registerText: {
    color: colors.textSecondary,
    fontSize: typography.label,
  },
  footer: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xxxl,
  },
});
