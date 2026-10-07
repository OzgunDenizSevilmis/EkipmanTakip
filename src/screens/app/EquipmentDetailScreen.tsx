import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { Equipment } from '../../types/equipment';
import { equipmentService } from '../../services/equipmentService';
import { colors, radii, spacing, typography } from '../../theme';
import type { AppStackParamList } from '../../navigation/AppStack';

type EquipmentDetailScreenProps = NativeStackScreenProps<
  AppStackParamList,
  'EquipmentDetail'
>;

function getLifecycleStatusLabel(
  status: Equipment['lifecycle_status'],
) {
  switch (status) {
    case 'ACTIVE':
      return 'Aktif';

    case 'MAINTENANCE':
      return 'Bakımda';

    case 'INACTIVE':
      return 'Kullanım Dışı';
  }
}

export default function EquipmentDetailScreen({
  route,
  navigation,
}: EquipmentDetailScreenProps) {
  const { equipmentId } = route.params;

const { data: equipment, isLoading, error } = useQuery({
  queryKey: ['equipment', equipmentId],
  queryFn: async () => {
    const { data, error: equipmentError } =
      await equipmentService.getEquipmentDetail(equipmentId);

    if (equipmentError) {
      throw equipmentError;
    }

    return data;
  },
});


  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>
          Ekipman bilgileri yükleniyor...
        </Text>
      </View>
    );
  }

  if (error || !equipment) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          Ekipman bilgileri yüklenemedi.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{equipment.name}</Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {getLifecycleStatusLabel(equipment.lifecycle_status)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Kod</Text>
          <Text style={styles.value}>{equipment.code}</Text>
        </View>
        <View style={styles.infoRow}>
  <Text style={styles.label}>Kategori</Text>
  <Text style={styles.value}>
    {equipment.category?.name || 'Belirtilmemiş'}
  </Text>
</View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.label}>Konum</Text>
          <Text style={styles.value}>
            {equipment.location || 'Belirtilmemiş'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoSection}>
          <Text style={styles.label}>Açıklama</Text>
          <Text style={styles.description}>
            {equipment.description || 'Açıklama bulunmuyor.'}
          </Text>
        </View>
         </View>

      <Pressable
        style={({ pressed }) => [
          styles.reserveButton,
          pressed && styles.reserveButtonPressed,
        ]}
        onPress={() => {
          navigation.navigate('ReservationForm', {
            equipmentId: equipment.id,
          });
        }}
      >
        <Text style={styles.reserveButtonText}>
          Rezervasyon Yap
        </Text>
      </Pressable>
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

  name: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  statusText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },

  infoRow: {
    gap: spacing.xs,
  },

  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },

  value: {
    color: colors.text,
    fontSize: typography.body,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },

  infoSection: {
    gap: spacing.xs,
  },

  description: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },

  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.md,
  },

  error: {
    color: colors.error,
    fontSize: typography.body,
    textAlign: 'center',
  },
    reserveButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    marginTop: spacing.lg,
  },

  reserveButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },

  reserveButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
});