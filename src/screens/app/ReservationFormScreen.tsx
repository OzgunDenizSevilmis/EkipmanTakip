import { zodResolver } from '@hookform/resolvers/zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
  return date.toLocaleDateString('tr-TR');
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

  const [initialStartAt] = useState(() => new Date());
  const [initialEndAt] = useState(
    () => new Date(initialStartAt.getTime() + 60 * 60 * 1000),
  );

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
      defaultValues: {
      startAt: initialStartAt,
      endAt: initialEndAt,
      purpose: '',
    },
  });

  const onSubmit = async (values: ReservationFormValues) => {
    setIsSubmitting(true);

    const { error } = await reservationService.createReservation({
      equipmentId,
      startAt: values.startAt.toISOString(),
      endAt: values.endAt.toISOString(),
      purpose: values.purpose,
    });

    setIsSubmitting(false);

if (error) {
  Alert.alert(
    'Rezervasyon oluşturulamadı',
    error.message,
  );
  return;
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
      setValue('startAt', startAt, { shouldValidate: true });
    }

    if (pickerField === 'startTime') {
      const startAt = new Date(currentValues.startAt);
      startAt.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        0,
        0,
      );
      setValue('startAt', startAt, { shouldValidate: true });
    }

    if (pickerField === 'endDate') {
      const endAt = new Date(currentValues.endAt);
      endAt.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );
      setValue('endAt', endAt, { shouldValidate: true });
    }

    if (pickerField === 'endTime') {
      const endAt = new Date(currentValues.endAt);
      endAt.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        0,
        0,
      );
      setValue('endAt', endAt, { shouldValidate: true });
    }

    setPickerField(null);
  };

  const pickerValue =
    pickerField === 'startDate' || pickerField === 'startTime'
      ? getValues('startAt')
      : getValues('endAt');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Rezervasyon Oluştur</Text>
        <Text style={styles.subtitle}>
          Ekipmanı kullanmak istediğin tarih ve zamanı seç.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Başlangıç</Text>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Tarih</Text>

            <Pressable
              style={styles.pickerButton}
              onPress={() => setPickerField('startDate')}
            >
              <Text style={styles.pickerText}>
                {formatDate(getValues('startAt'))}
              </Text>
            </Pressable>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>Saat</Text>

            <Pressable
              style={styles.pickerButton}
              onPress={() => setPickerField('startTime')}
            >
              <Text style={styles.pickerText}>
                {formatTime(getValues('startAt'))}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Bitiş</Text>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Tarih</Text>

            <Pressable
              style={styles.pickerButton}
              onPress={() => setPickerField('endDate')}
            >
              <Text style={styles.pickerText}>
                {formatDate(getValues('endAt'))}
              </Text>
            </Pressable>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>Saat</Text>

            <Pressable
              style={styles.pickerButton}
              onPress={() => setPickerField('endTime')}
            >
              <Text style={styles.pickerText}>
                {formatTime(getValues('endAt'))}
              </Text>
            </Pressable>
          </View>
        </View>

        {errors.endAt ? (
          <Text style={styles.error}>{errors.endAt.message}</Text>
        ) : null}

        <Controller
          control={control}
          name="purpose"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Kullanım Amacı</Text>

              <TextInput
                style={[
                  styles.input,
                  errors.purpose && styles.inputError,
                ]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Ekipmanı hangi amaçla kullanacaksın?"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {errors.purpose ? (
                <Text style={styles.error}>
                  {errors.purpose.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.submitButtonPressed,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              Rezervasyon Talebi Oluştur
            </Text>
          )}
        </Pressable>
      </View>

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
    marginBottom: spacing.xl,
  },

  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.sm,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  half: {
    flex: 1,
  },

  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  pickerButton: {
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },

  pickerText: {
    color: colors.text,
    fontSize: typography.body,
  },

  field: {
    marginBottom: spacing.xl,
  },

  input: {
    minHeight: 110,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: typography.body,
    padding: spacing.md,
  },

  inputError: {
    borderColor: colors.error,
  },

  error: {
    color: colors.error,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },

  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },

  submitButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
