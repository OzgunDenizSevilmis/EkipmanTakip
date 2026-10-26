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
      const { error } = await authService.signIn(values.email.trim(), values.password);

      if (error) {
        setServerError('Giriş yapılamadı. E-posta adresini ve parolanı kontrol et.');
      }
    } catch {
      setServerError('Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.');
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
              <View style={styles.logoAccent} />
            </View>

            <View>
              <Text style={styles.brandName}>EkipmanTakip</Text>
              <Text style={styles.brandCaption}>ENVANTER YÖNETİM SİSTEMİ</Text>
            </View>
          </View>

          <View style={styles.intro}>
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowText}>HESAP ERİŞİMİ</Text>
            </View>

            <Text style={styles.title}>Tekrar hoş geldin.</Text>

            <Text style={styles.subtitle}>
              Ekipmanlarını, rezervasyonlarını ve zimmet kayıtlarını yönetmek için hesabına giriş
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

              {errors.email ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Parola</Text>

              <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
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
                  onPress={() => setIsPasswordVisible((current) => !current)}
                  accessibilityRole="button"
                  accessibilityLabel={isPasswordVisible ? 'Parolayı gizle' : 'Parolayı göster'}
                  hitSlop={8}
                  disabled={isSubmitting}
                  style={styles.passwordToggleButton}
                >
                  <Text style={styles.passwordToggle}>
                    {isPasswordVisible ? 'Gizle' : 'Göster'}
                  </Text>
                </Pressable>
              </View>

              {errors.password ? (
                <Text style={styles.fieldError}>{errors.password.message}</Text>
              ) : null}

              <Pressable
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={isSubmitting}
                accessibilityRole="button"
              >
                <Text style={styles.linkText}>Parolamı unuttum</Text>
              </Pressable>
            </View>

            {serverError ? (
              <View style={styles.serverErrorContainer}>
                <Text accessibilityRole="alert" style={styles.serverError}>
                  {serverError}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !isSubmitting && styles.pressedButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Giriş Yap</Text>
                  <Text style={styles.submitButtonArrow}>→</Text>
                </>
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
                <Text style={styles.linkText}>Kayıt ol</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footerContainer}>
            <View style={styles.footerDivider} />
            <Text style={styles.footer}>Ekipman yönetimi, tek bir yerde.</Text>
            <Text style={styles.footerVersion}>EKİPMANTAKİP · GÜVENLİ ERİŞİM</Text>
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
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  logoAccent: {
    position: 'absolute',
    width: 6,
    height: 12,
    right: 7,
    bottom: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  brandName: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  brandCaption: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  intro: {
    marginBottom: spacing.xxl,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  eyebrowText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    lineHeight: 39,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 360,
  },
  form: {
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.text,
  },
  passwordToggleButton: {
    paddingLeft: spacing.sm,
    paddingVertical: spacing.sm,
  },
  passwordToggle: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '800',
  },
  fieldError: {
    color: colors.error,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  linkText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '800',
  },
  serverErrorContainer: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  serverError: {
    color: colors.error,
    fontSize: typography.label,
    lineHeight: 21,
  },
  submitButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  pressedButton: {
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '800',
  },
  submitButtonArrow: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  registerText: {
    color: colors.textSecondary,
    fontSize: typography.label,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  footerDivider: {
    width: 44,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  footer: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  footerVersion: {
    textAlign: 'center',
    color: colors.placeholder,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: spacing.md,
  },
});
