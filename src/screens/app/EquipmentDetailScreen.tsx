import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { Equipment } from '../../types/equipment';
import { equipmentService } from '../../services/equipmentService';
import { colors, radii, spacing, typography } from '../../theme';
import type { AppStackParamList } from '../../navigation/AppStack';

type EquipmentDetailScreenProps = NativeStackScreenProps<
  AppStackParamList,
  'EquipmentDetail'
>;

function getLifecycleStatusLabel(status: Equipment['lifecycle_status']) {
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

  const {
    data: equipment,
    isLoading,
    error,
    refetch,
  } = useQuery({
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
        <View style={styles.loadingIcon}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
        <Text style={styles.loadingText}>Ekipman bilgileri yükleniyor...</Text>
      </View>
    );
  }

  if (error || !equipment) {
    return (
      <View style={styles.center}>
        <View style={styles.stateIcon}>
          <Ionicons
            name="alert-circle-outline"
            size={34}
            color={colors.error}
          />
        </View>

        <Text style={styles.stateTitle}>Ekipman yüklenemedi</Text>
        <Text style={styles.stateDescription}>
          Bilgiler alınırken bir sorun oluştu. Yeniden deneyebilirsin.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => refetch()}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.white} />
          <Text style={styles.retryButtonText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  const status = equipment.lifecycle_status;
  const isActive = status === 'ACTIVE';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={styles.equipmentIcon}>
            <Ionicons
              name="cube-outline"
              size={38}
              color={colors.primary}
            />
          </View>

          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                isActive ? styles.statusDotActive : styles.statusDotInactive,
              ]}
            />
            <Text style={styles.statusText}>
              {getLifecycleStatusLabel(status)}
            </Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>EKİPMAN DETAYI</Text>
        <Text style={styles.name}>{equipment.name}</Text>
        <Text style={styles.code}>{equipment.code}</Text>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Genel bilgiler</Text>
        <Text style={styles.sectionSubtitle}>Ekipman özellikleri</Text>
      </View>

      <View style={styles.card}>
        <InfoRow
          icon="pricetag-outline"
          label="Ekipman kodu"
          value={equipment.code}
        />

        <View style={styles.divider} />

        <InfoRow
          icon="grid-outline"
          label="Kategori"
          value={equipment.category?.name || 'Belirtilmemiş'}
        />

        <View style={styles.divider} />

        <InfoRow
          icon="location-outline"
          label="Konum"
          value={equipment.location || 'Belirtilmemiş'}
        />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Açıklama</Text>
      </View>

      <View style={styles.descriptionCard}>
        <View style={styles.descriptionIcon}>
          <Ionicons
            name="document-text-outline"
            size={21}
            color={colors.primary}
          />
        </View>
        <Text style={styles.description}>
          {equipment.description || 'Bu ekipman için açıklama eklenmemiş.'}
        </Text>
      </View>

      <View style={styles.note}>
        <Ionicons
          name="information-circle-outline"
          size={19}
          color={colors.textSecondary}
        />
        <Text style={styles.noteText}>
          Rezervasyon işlemi sırasında ekipmanın uygunluğu kontrol edilir.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rezervasyon yap"
        style={({ pressed }) => [
          styles.reserveButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => {
          navigation.navigate('ReservationForm', {
            equipmentId: equipment.id,
          });
        }}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.white} />
        <Text style={styles.reserveButtonText}>Rezervasyon Yap</Text>
        <Ionicons name="arrow-forward" size={19} color={colors.white} />
      </Pressable>
    </ScrollView>
  );
}

type InfoRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
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
  hero: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  equipmentIcon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
  },
  statusDotActive: {
    backgroundColor: '#43D9A3',
  },
  statusDotInactive: {
    backgroundColor: colors.error,
  },
  statusText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
    lineHeight: 36,
    marginBottom: spacing.sm,
  },
  code: {
    color: colors.textSecondary,
    fontSize: typography.body,
  },
  sectionHeading: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
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
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  descriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 23,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  noteText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  reserveButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  reserveButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.sm,
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  stateDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
});