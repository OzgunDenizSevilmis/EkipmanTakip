
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { equipmentService } from '../../services/equipmentService';
import { reservationService } from '../../services/reservationService';
import type { Reservation } from '../../types/reservation';
import type { MainTabParamList } from '../../navigation/MainTabs';
import { colors, radii, spacing, typography } from '../../theme';

type ReservationWithEquipment = Reservation & {
  equipment: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type DashboardEquipment = {
  id: string;
  lifecycle_status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function getStatusLabel(status: Reservation['status']) {
  switch (status) {
    case 'PENDING':
      return 'Onay bekliyor';
    case 'APPROVED':
      return 'Onaylandı';
    case 'REJECTED':
      return 'Reddedildi';
    case 'CANCELLED':
      return 'İptal edildi';
    case 'EXPIRED':
      return 'Süresi doldu';
    case 'DELIVERED':
      return 'Teslim edildi';
    case 'COMPLETED':
      return 'Tamamlandı';
  }
}

function getStatusColors(status: Reservation['status']) {
  switch (status) {
    case 'PENDING':
      return { background: '#352D1D', text: '#F6C96B', icon: 'time-outline' as const };
    case 'APPROVED':
      return { background: '#19382E', text: '#69D5A2', icon: 'checkmark-circle-outline' as const };
    case 'DELIVERED':
      return { background: '#1D3152', text: '#8DB8FF', icon: 'cube-outline' as const };
    case 'REJECTED':
      return { background: '#3A222B', text: '#FF8798', icon: 'close-circle-outline' as const };
    case 'CANCELLED':
      return { background: '#303746', text: '#B3BDCE', icon: 'remove-circle-outline' as const };
    case 'EXPIRED':
      return { background: '#3A2920', text: '#F3AD7A', icon: 'alert-circle-outline' as const };
    case 'COMPLETED':
      return { background: '#19382E', text: '#69D5A2', icon: 'checkmark-done-outline' as const };
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  accent,
}: {
  title: string;
  value: number;
  description: string;
  icon: IoniconName;
  accent: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={[styles.summaryIcon, { backgroundColor: `${accent}1C` }]}>
          <Ionicons name={icon} size={21} color={accent} />
        </View>
        <View style={styles.summaryIndicator}>
          <View style={[styles.indicatorDot, { backgroundColor: accent }]} />
        </View>
      </View>

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryDescription}>{description}</Text>
    </View>
  );
}

function SectionHeading({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.sectionAction,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function HomeScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const {
    data: equipment = [],
    isLoading: isEquipmentLoading,
    isRefetching: isEquipmentRefetching,
    error: equipmentError,
    refetch: refetchEquipment,
  } = useQuery<DashboardEquipment[]>({
    queryKey: ['home-equipment'],
    queryFn: async () => {
      const { data, error } = await equipmentService.getEquipment();

      if (error) {
        throw error;
      }

      return (data ?? []) as DashboardEquipment[];
    },
  });

  const {
    data: reservations = [],
    isLoading: isReservationsLoading,
    isRefetching: isReservationsRefetching,
    error: reservationsError,
    refetch: refetchReservations,
  } = useQuery<ReservationWithEquipment[]>({
    queryKey: ['my-reservations'],
    queryFn: async () => {
      const { data, error } = await reservationService.getMyReservations();

      if (error) {
        throw error;
      }

      return (data ?? []) as ReservationWithEquipment[];
    },
  });

  const isLoading = isEquipmentLoading || isReservationsLoading;
  const hasError = equipmentError || reservationsError;
  const isRefreshing = isEquipmentRefetching || isReservationsRefetching;

  const activeEquipmentCount = equipment.filter(
    (item) => item.lifecycle_status === 'ACTIVE',
  ).length;

  const pendingReservationCount = reservations.filter(
    (item) => item.status === 'PENDING',
  ).length;

  const approvedReservationCount = reservations.filter(
    (item) => item.status === 'APPROVED',
  ).length;

  const recentReservations = reservations.slice(0, 3);

  const handleRefresh = () => {
    void refetchEquipment();
    void refetchReservations();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={styles.loadingTitle}>Ana sayfa hazırlanıyor</Text>
        <Text style={styles.loadingText}>Bilgilerin yüklenmesini bekle.</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <Ionicons name="cloud-offline-outline" size={30} color={colors.error} />
        </View>
        <Text style={styles.errorTitle}>Veriler yüklenemedi</Text>
        <Text style={styles.errorText}>
          Bağlantını kontrol edip yeniden deneyebilirsin.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
          onPress={handleRefresh}
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color={colors.white} />
          <Text style={styles.retryButtonText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Ionicons name="layers" size={22} color={colors.white} />
        </View>

        <View style={styles.brandTextContainer}>
          <Text style={styles.brandName}>EkipmanTakip</Text>
          <Text style={styles.brandCaption}>EKİPMAN YÖNETİM PLATFORMU</Text>
        </View>

        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Aktif</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>KİŞİSEL PANELİN</Text>
          <Text style={styles.greeting}>Hoş geldin!</Text>
          <Text style={styles.heroDescription}>
            Ekipmanlarını ve rezervasyonlarını tek yerden kolayca takip et.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.heroButton,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate('Equipment')}
            accessibilityRole="button"
          >
            <Ionicons name="search-outline" size={18} color={colors.white} />
            <Text style={styles.heroButtonText}>Ekipmanları keşfet</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.heroDecoration}>
          <Ionicons name="cube-outline" size={76} color="#8FB0FF" />
          <View style={styles.heroDecorationLine} />
          <View style={styles.heroDecorationDot} />
        </View>
      </View>

      <SectionHeading title="Genel bakış" />

      <View style={styles.summaryGrid}>
        <SummaryCard
          title="Toplam ekipman"
          value={equipment.length}
          description="Kayıtlı ekipman"
          icon="cube-outline"
          accent="#8DB8FF"
        />
        <SummaryCard
          title="Aktif ekipman"
          value={activeEquipmentCount}
          description="Kullanıma uygun"
          icon="checkmark-circle-outline"
          accent="#69D5A2"
        />
        <SummaryCard
          title="Bekleyen talepler"
          value={pendingReservationCount}
          description="Onay bekliyor"
          icon="time-outline"
          accent="#F6C96B"
        />
        <SummaryCard
          title="Onaylananlar"
          value={approvedReservationCount}
          description="Rezervasyon"
          icon="calendar-outline"
          accent="#B5A0FF"
        />
      </View>

      <SectionHeading
        title="Son rezervasyonlarım"
        actionLabel="Tümünü gör"
        onAction={() => navigation.navigate('MyActions')}
      />

      {recentReservations.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={27} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Henüz rezervasyonun yok</Text>
          <Text style={styles.emptyDescription}>
            İhtiyacın olan ekipmanı bulup ilk rezervasyon talebini oluşturabilirsin.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate('Equipment')}
            accessibilityRole="button"
          >
            <Text style={styles.emptyButtonText}>Ekipmanları görüntüle</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.reservationList}>
          {recentReservations.map((reservation) => {
            const statusColors = getStatusColors(reservation.status);

            return (
              <View key={reservation.id} style={styles.reservationCard}>
                <View style={styles.reservationIcon}>
                  <Ionicons
                    name="cube-outline"
                    size={23}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.reservationMain}>
                  <View style={styles.reservationTop}>
                    <Text style={styles.reservationName} numberOfLines={2}>
                      {reservation.equipment?.name ?? 'Ekipman'}
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColors.background },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: statusColors.text },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: statusColors.text },
                        ]}
                      >
                        {getStatusLabel(reservation.status)}
                      </Text>
                    </View>
                  </View>

                  {reservation.equipment?.code ? (
                    <Text style={styles.equipmentCode}>
                      Kod: {reservation.equipment.code}
                    </Text>
                  ) : null}

                  <View style={styles.reservationDivider} />

                  <View style={styles.reservationMeta}>
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.reservationDate}>
                      {formatDateTime(reservation.start_at)}
                    </Text>
                  </View>

                  <Text style={styles.reservationPurpose} numberOfLines={2}>
                    {reservation.purpose}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <SectionHeading title="Hızlı erişim" />

      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [
            styles.quickAction,
            pressed && styles.quickActionPressed,
          ]}
          onPress={() => navigation.navigate('Equipment')}
          accessibilityRole="button"
        >
          <View style={[styles.quickActionIcon, styles.equipmentActionIcon]}>
            <Ionicons name="grid-outline" size={23} color="#8DB8FF" />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>Ekipman kataloğu</Text>
            <Text style={styles.quickActionDescription}>
              Ekipmanları incele ve rezervasyon oluştur.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.quickAction,
            pressed && styles.quickActionPressed,
          ]}
          onPress={() => navigation.navigate('MyActions')}
          accessibilityRole="button"
        >
          <View style={[styles.quickActionIcon, styles.actionsActionIcon]}>
            <Ionicons name="clipboard-outline" size={23} color="#B5A0FF" />
          </View>
          <View style={styles.quickActionContent}>
            <Text style={styles.quickActionTitle}>İşlemlerim</Text>
            <Text style={styles.quickActionDescription}>
              Rezervasyonlarını ve işlem durumlarını takip et.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Ionicons name="shield-checkmark-outline" size={15} color={colors.textSecondary} />
        <Text style={styles.footerText}>EkipmanTakip · Yönetim ve takip</Text>
        <View style={styles.footerLine} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.sm,
  },
  errorIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    backgroundColor: colors.errorBackground,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: '#7395FF',
  },
  brandTextContainer: {
    flex: 1,
  },
  brandName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandCaption: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: '#69D5A2',
  },
  liveText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 228,
    flexDirection: 'row',
    backgroundColor: '#142647',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#2D4773',
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  heroContent: {
    flex: 1,
    zIndex: 1,
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#213D70',
    right: -95,
    top: -90,
  },
  heroEyebrow: {
    color: '#A9C3FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
    marginBottom: spacing.sm,
  },
  greeting: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroDescription: {
    color: '#C0CEE5',
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  heroButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  heroButtonText: {
    color: colors.white,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  heroDecoration: {
    position: 'absolute',
    right: 12,
    top: 52,
    opacity: 0.26,
    transform: [{ rotate: '-12deg' }],
  },
  heroDecorationLine: {
    position: 'absolute',
    width: 95,
    height: 1,
    backgroundColor: '#A9C3FF',
    top: 88,
    right: -15,
    transform: [{ rotate: '-25deg' }],
  },
  heroDecorationDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: radii.pill,
    backgroundColor: '#A9C3FF',
    top: 36,
    right: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
  },
  sectionActionText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '43%',
    minWidth: 0,
    minHeight: 154,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIndicator: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: radii.pill,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  summaryDescription: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 5,
    lineHeight: 16,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  reservationList: {
    gap: spacing.md,
  },
  reservationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  reservationIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
  },
  reservationMain: {
    flex: 1,
    minWidth: 0,
  },
  reservationTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reservationName: {
    flexGrow: 1,
    flexShrink: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  equipmentCode: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  reservationDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  reservationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reservationDate: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  reservationPurpose: {
    color: colors.text,
    fontSize: typography.caption,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  quickActions: {
    gap: spacing.md,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  quickActionPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  equipmentActionIcon: {
    backgroundColor: '#1D3152',
  },
  actionsActionIcon: {
    backgroundColor: '#2D2748',
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  quickActionDescription: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxxl,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  pressed: {
    opacity: 0.78,
  },
});
