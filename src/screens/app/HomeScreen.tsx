
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

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

function getStatusLabel(status: Reservation['status']) {
  switch (status) {
    case 'PENDING':
      return 'Onay Bekliyor';
    case 'APPROVED':
      return 'Onaylandı';
    case 'REJECTED':
      return 'Reddedildi';
    case 'CANCELLED':
      return 'İptal Edildi';
    case 'EXPIRED':
      return 'Süresi Doldu';
    case 'DELIVERED':
      return 'Teslim Edildi';
    case 'COMPLETED':
      return 'Tamamlandı';
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryDescription}>{description}</Text>
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
      const { data, error } =
        await reservationService.getMyReservations();

      if (error) {
        throw error;
      }

      return (data ?? []) as ReservationWithEquipment[];
    },
  });

  const isLoading = isEquipmentLoading || isReservationsLoading;
  const hasError = equipmentError || reservationsError;
  const isRefreshing =
    isEquipmentRefetching || isReservationsRefetching;

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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          Ana sayfa yükleniyor...
        </Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Ana sayfa verileri yüklenemedi.
        </Text>
        <Pressable
          style={styles.retryButton}
          onPress={handleRefresh}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
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
      <View style={styles.header}>
        <Text style={styles.greeting}>Hoş geldin!</Text>
        <Text style={styles.subtitle}>
          Ekipmanlarını ve rezervasyonlarını buradan takip edebilirsin.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Genel Durum</Text>

      <View style={styles.summaryGrid}>
        <SummaryCard
          title="Toplam Ekipman"
          value={equipment.length}
          description="Kayıtlı ekipman"
        />
        <SummaryCard
          title="Aktif Ekipman"
          value={activeEquipmentCount}
          description="Kullanıma uygun"
        />
        <SummaryCard
          title="Bekleyen Taleplerim"
          value={pendingReservationCount}
          description="Onay bekliyor"
        />
        <SummaryCard
          title="Onaylananlar"
          value={approvedReservationCount}
          description="Onaylanmış rezervasyon"
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Son Rezervasyonlarım</Text>
        <Pressable onPress={() => navigation.navigate('MyActions')}>
          <Text style={styles.seeAllText}>Tümünü Gör</Text>
        </Pressable>
      </View>

      {recentReservations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            Henüz rezervasyonun yok
          </Text>
          <Text style={styles.emptyDescription}>
            Ekipman seçerek ilk rezervasyon talebini oluşturabilirsin.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Equipment')}
          >
            <Text style={styles.primaryButtonText}>
              Ekipmanları Görüntüle
            </Text>
          </Pressable>
        </View>
      ) : (
        recentReservations.map((reservation) => (
          <View key={reservation.id} style={styles.reservationCard}>
            <View style={styles.reservationHeader}>
              <View style={styles.reservationTitleContainer}>
                <Text style={styles.reservationName}>
                  {reservation.equipment?.name ?? 'Ekipman'}
                </Text>
                {reservation.equipment?.code ? (
                  <Text style={styles.equipmentCode}>
                    {reservation.equipment.code}
                  </Text>
                ) : null}
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {getStatusLabel(reservation.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.reservationDate}>
              {formatDateTime(reservation.start_at)}
            </Text>
            <Text style={styles.reservationPurpose}>
              {reservation.purpose}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Hızlı Erişim</Text>

      <View style={styles.quickActions}>
        <Pressable
          style={({ pressed }) => [
            styles.quickAction,
            pressed && styles.quickActionPressed,
          ]}
          onPress={() => navigation.navigate('Equipment')}
        >
          <Text style={styles.quickActionTitle}>Ekipmanlar</Text>
          <Text style={styles.quickActionDescription}>
            Ekipmanları incele ve rezervasyon oluştur.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.quickAction,
            pressed && styles.quickActionPressed,
          ]}
          onPress={() => navigation.navigate('MyActions')}
        >
          <Text style={styles.quickActionTitle}>İşlemlerim</Text>
          <Text style={styles.quickActionDescription}>
            Rezervasyonlarını ve durumlarını takip et.
          </Text>
        </Pressable>
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
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  greeting: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  summaryCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '40%',
    minHeight: 124,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  summaryTitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginVertical: spacing.xs,
  },
  summaryDescription: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  reservationCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reservationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reservationTitleContainer: {
    flex: 1,
  },
  reservationName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  equipmentCode: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  statusBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  reservationDate: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.md,
  },
  reservationPurpose: {
    color: colors.text,
    fontSize: typography.body,
    marginTop: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  quickActions: {
    gap: spacing.md,
  },
  quickAction: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  quickActionPressed: {
    opacity: 0.75,
  },
  quickActionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  quickActionDescription: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.body,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
