
import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import type { AppStackParamList } from '../../navigation/AppStack';
import { authService } from '../../services/authService';
import { reservationDraftService } from '../../services/reservationDraftService';
import { reservationService } from '../../services/reservationService';
import { colors, radii, spacing, typography } from '../../theme';

type ReservationFormScreenProps = NativeStackScreenProps<
  AppStackParamList,
  'ReservationForm'
>;

const reservationSchema = z
  .object({
    startAt: z.date({
      message: 'Başlangıç tarihi seçilmelidir.',
    }),
    endAt: z.date({
      message: 'Bitiş tarihi seçilmelidir.',
    }),
    purpose: z
      .string()
      .trim()
      .min(3, 'Kullanım amacı en az 3 karakter olmalıdır.'),
  })
  .refine((data) => data.endAt > data.startAt, {
    message: 'Bitiş zamanı başlangıç zamanından sonra olmalıdır.',
    path: ['endAt'],
  });

type ReservationFormValues = z.infer<typeof reservationSchema>;

type PickerField = 'startDate' | 'startTime' | 'endDate' | 'endTime' | null;

function formatDate(date: Date) {
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReservationFormScreen({
  route,
  navigation,
}: ReservationFormScreenProps) {
  const { equipmentId } = route.params;

  const [pickerField, setPickerField] = useState<PickerField>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDraftReady, setIsDraftReady] = useState(false);

  const isRestoringDraft = useRef(false);

  const [initialStartAt] = useState(() => new Date());
  const [initialEndAt] = useState(
    () => new Date(initialStartAt.getTime() + 60 * 60 * 1000),
  );

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      startAt: initialStartAt,
      endAt: initialEndAt,
      purpose: '',
    },
  });

  const formValues = useWatch({ control });

  // Oturumu ve ilgili ekipmana ait taslağı yükle.
  useEffect(() => {
    let isMounted = true;

    async function loadDraft() {
      try {
        const {
          data: { session },
          error,
        } = await authService.getSession();

        if (error) {
          throw error;
        }

        if (!session?.user.id) {
          return;
        }

        const currentUserId = session.user.id;

        const draft = await reservationDraftService.get(
          currentUserId,
          equipmentId,
        );

        if (!isMounted) {
          return;
        }

        isRestoringDraft.current = true;

        if (draft) {
          const startAt = new Date(draft.startAt);
          const endAt = new Date(draft.endAt);

          if (
            !Number.isNaN(startAt.getTime()) &&
            !Number.isNaN(endAt.getTime())
          ) {
            reset({
              startAt,
              endAt,
              purpose: draft.purpose,
            });
          }
        }

        setUserId(currentUserId);
      } catch {
        if (isMounted) {
          Alert.alert(
            'Taslak yüklenemedi',
            'Kaydedilmiş form bilgileri yüklenemedi. Formu kullanmaya devam edebilirsin.',
          );
        }
      } finally {
        if (isMounted) {
          isRestoringDraft.current = false;
          setIsDraftReady(true);
        }
      }
    }

    void loadDraft();

    return () => {
      isMounted = false;
    };
  }, [equipmentId, reset]);

  // Form değerlerini değişikliklerden kısa süre sonra yerel olarak kaydet.
  useEffect(() => {
    if (
      !userId ||
      !isDraftReady ||
      !formValues ||
      isRestoringDraft.current
    ) {
      return;
    }

    const { startAt, endAt, purpose } = formValues;

    if (
      !(startAt instanceof Date) ||
      !(endAt instanceof Date) ||
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      typeof purpose !== 'string'
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      void reservationDraftService
        .save(userId, equipmentId, {
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          purpose,
        })
        .catch(() => {
          // Taslak kaydedilemezse form kullanılmaya devam edebilir.
        });
    }, 400);

    return () => {
      clearTimeout(timeout);
    };
  }, [userId, equipmentId, isDraftReady, formValues]);

  const onSubmit = async (values: ReservationFormValues) => {
    setIsSubmitting(true);

    try {
      const { error } = await reservationService.createReservation({
        equipmentId,
        startAt: values.startAt.toISOString(),
        endAt: values.endAt.toISOString(),
        purpose: values.purpose,
      });

      if (error) {
        Alert.alert('Rezervasyon oluşturulamadı', error.message);
        return;
      }

      // Taslak yalnızca sunucu isteği başarılı olduğunda silinir.
      if (userId) {
        try {
          await reservationDraftService.clear(userId, equipmentId);
        } catch {
          // Taslak silme hatası oluşturulmuş rezervasyonu geçersiz kılmaz.
        }
      }

      Alert.alert(
        'Rezervasyon oluşturuldu',
        'Rezervasyon talebin başarıyla oluşturuldu.',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch {
      Alert.alert(
        'Bir sorun oluştu',
        'Rezervasyon talebi gönderilemedi. İnternet bağlantını kontrol edip tekrar dene. Form bilgilerin korunur.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickerChange = (_event: unknown, selectedDate?: Date) => {
    if (!selectedDate) {
      setPickerField(null);
      return;
    }

    const currentValues = getValues();

    if (pickerField === 'startDate') {
      const startAt = new Date(currentValues.startAt);

      startAt.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );

      setValue('startAt', startAt, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    if (pickerField === 'startTime') {
      const startAt = new Date(currentValues.startAt);

      startAt.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        0,
        0,
      );

      setValue('startAt', startAt, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    if (pickerField === 'endDate') {
      const endAt = new Date(currentValues.endAt);

      endAt.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );

      setValue('endAt', endAt, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    if (pickerField === 'endTime') {
      const endAt = new Date(currentValues.endAt);

      endAt.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        0,
        0,
      );

      setValue('endAt', endAt, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    setPickerField(null);
  };

  const pickerValue =
    pickerField === 'startDate' || pickerField === 'startTime'
      ? getValues('startAt')
      : getValues('endAt');

  const displayedStartAt = formValues.startAt ?? initialStartAt;
  const displayedEndAt = formValues.endAt ?? initialEndAt;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="calendar-outline"
            size={30}
            color={colors.primary}
          />
        </View>

        <Text style={styles.eyebrow}>EKİPMAN TAKİP</Text>
        <Text style={styles.title}>Rezervasyon oluştur</Text>
        <Text style={styles.subtitle}>
          Ekipmanı kullanmak istediğin tarih ve saati belirle, ardından kullanım
          amacını açıklayarak talebini gönder.
        </Text>
      </View>

      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name="time-outline"
            size={21}
            color={colors.primary}
          />
        </View>
        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionTitle}>Rezervasyon zamanı</Text>
          <Text style={styles.sectionSubtitle}>
            Başlangıç ve bitiş tarihini belirle.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.timeSection}>
          <View style={styles.timeSectionHeading}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.timeSectionTitle}>Başlangıç</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Tarih</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Başlangıç tarihi: ${formatDate(displayedStartAt)}`}
                style={({ pressed }) => [
                  styles.pickerButton,
                  pressed && styles.pickerButtonPressed,
                ]}
                onPress={() => setPickerField('startDate')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={colors.primary}
                />
                <Text style={styles.pickerText}>
                  {formatDate(displayedStartAt)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <View style={styles.half}>
              <Text style={styles.label}>Saat</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Başlangıç saati: ${formatTime(displayedStartAt)}`}
                style={({ pressed }) => [
                  styles.pickerButton,
                  pressed && styles.pickerButtonPressed,
                ]}
                onPress={() => setPickerField('startTime')}
              >
                <Ionicons
                  name="time-outline"
                  size={19}
                  color={colors.primary}
                />
                <Text style={styles.pickerText}>
                  {formatTime(displayedStartAt)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.sectionDivider}>
          <View style={styles.timelineLine} />
          <Ionicons
            name="arrow-down-circle-outline"
            size={22}
            color={colors.primary}
          />
          <View style={styles.timelineLine} />
        </View>

        <View style={styles.timeSection}>
          <View style={styles.timeSectionHeading}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.timeSectionTitle}>Bitiş</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Tarih</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Bitiş tarihi: ${formatDate(displayedEndAt)}`}
                style={({ pressed }) => [
                  styles.pickerButton,
                  pressed && styles.pickerButtonPressed,
                ]}
                onPress={() => setPickerField('endDate')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={colors.primary}
                />
                <Text style={styles.pickerText}>
                  {formatDate(displayedEndAt)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <View style={styles.half}>
              <Text style={styles.label}>Saat</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Bitiş saati: ${formatTime(displayedEndAt)}`}
                style={({ pressed }) => [
                  styles.pickerButton,
                  pressed && styles.pickerButtonPressed,
                ]}
                onPress={() => setPickerField('endTime')}
              >
                <Ionicons
                  name="time-outline"
                  size={19}
                  color={colors.primary}
                />
                <Text style={styles.pickerText}>
                  {formatTime(displayedEndAt)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          {errors.endAt ? (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={17}
                color={colors.error}
              />
              <Text style={styles.error}>{errors.endAt.message}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name="document-text-outline"
            size={21}
            color={colors.primary}
          />
        </View>
        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionTitle}>Kullanım amacı</Text>
          <Text style={styles.sectionSubtitle}>
            Ekipmana neden ihtiyaç duyduğunu belirt.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Controller
          control={control}
          name="purpose"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.label}>Açıklama</Text>
                <Text style={styles.requiredLabel}>Zorunlu</Text>
              </View>

              <TextInput
                style={[
                  styles.input,
                  errors.purpose && styles.inputError,
                ]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Örn. Proje sunumu için projeksiyon cihazına ihtiyacım var."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
                accessibilityLabel="Rezervasyon kullanım amacı"
              />

              <View style={styles.inputFooter}>
                {errors.purpose ? (
                  <View style={styles.errorContainer}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={17}
                      color={colors.error}
                    />
                    <Text style={styles.error}>
                      {errors.purpose.message}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.helperText}>
                    En az 3 karakter yazmalısın.
                  </Text>
                )}

                <Text style={styles.characterCount}>{value.length}/500</Text>
              </View>
            </View>
          )}
        />
      </View>

      <View style={styles.infoBanner}>
        <Ionicons
          name="information-circle-outline"
          size={22}
          color={colors.primary}
        />
        <Text style={styles.infoText}>
          Talebin gönderildikten sonra onay sürecine alınabilir. Rezervasyon
          durumunu uygulamadaki işlemlerinden takip edebilirsin.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rezervasyon talebi oluştur"
        style={({ pressed }) => [
          styles.submitButton,
          pressed && styles.submitButtonPressed,
          (isSubmitting || !isDraftReady) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting || !isDraftReady}
      >
        {isSubmitting ? (
          <>
            <ActivityIndicator color={colors.white} />
            <Text style={styles.submitButtonText}>Talep gönderiliyor...</Text>
          </>
        ) : (
          <>
            <Ionicons
              name="paper-plane-outline"
              size={20}
              color={colors.white}
            />
            <Text style={styles.submitButtonText}>
              Rezervasyon Talebi Oluştur
            </Text>
            <Ionicons
              name="arrow-forward"
              size={19}
              color={colors.white}
            />
          </>
        )}
      </Pressable>

      <Text style={styles.footerNote}>
        Göndermeden önce tarih ve saat bilgilerini kontrol et.
      </Text>

      {pickerField ? (
        <DateTimePicker
          value={pickerValue}
          mode={
            pickerField === 'startDate' || pickerField === 'endDate'
              ? 'date'
              : 'time'
          }
          onChange={handlePickerChange}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
    lineHeight: 36,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  sectionHeadingText: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  timeSection: {
    gap: spacing.md,
  },
  timeSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  timeSectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  pickerButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
  },
  pickerButtonPressed: {
    borderColor: colors.primary,
    opacity: 0.85,
  },
  pickerText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  timelineLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  field: {
    gap: spacing.sm,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requiredLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  input: {
    minHeight: 125,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
    padding: spacing.md,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  helperText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  characterCount: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  errorContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  error: {
    flex: 1,
    color: colors.error,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    flex: 1,
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerNote: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
