import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { AppStackParamList } from '../../navigation/AppStack';
import { authService } from '../../services/authService';
import { loanService } from '../../services/loanService';
import { reservationService } from '../../services/reservationService';
import { colors, radii, spacing, typography } from '../../theme';
import type { Reservation } from '../../types/reservation';

type EquipmentInfo = {
  id: string;
  name: string;
  code: string;
};

type ReservationWithEquipment = Reservation & {
  equipment: EquipmentInfo | null;
};

type LoanWithEquipment = {
  id: string;
  reservation_id: string;
  equipment_id: string;
  user_id: string;
  checked_out_at: string;
  due_at: string;
  returned_at: string | null;
  delivery_note: string | null;
  return_note: string | null;
  condition: string;
  equipment: EquipmentInfo | null;
};

type HighlightParams = {
  highlightEntityType?: 'reservation' | 'loan';
  highlightEntityId?: string;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

type AdminActionButtonProps = {
  title: string;
  description: string;
  icon: IconName;
  onPress: () => void;
};

function AdminActionButton({ title, description, icon, onPress }: AdminActionButtonProps) {
  return (
    <TouchableOpacity
      style={styles.adminActionButton}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <View style={styles.adminActionIcon}>
        <Ionicons name={icon} size={23} color={colors.primary} />
      </View>

      <View style={styles.adminActionContent}>
        <Text style={styles.adminActionTitle}>{title}</Text>
        <Text style={styles.adminActionDescription}>{description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

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
    default:
      return status;
  }
}

function getStatusAppearance(status: Reservation['status']) {
  switch (status) {
    case 'APPROVED':
    case 'DELIVERED':
    case 'COMPLETED':
      return {
        label: getStatusLabel(status),
        icon: 'checkmark-circle-outline' as const,
        backgroundColor: '#153A34',
        textColor: '#53D6B0',
      };

    case 'REJECTED':
    case 'CANCELLED':
    case 'EXPIRED':
      return {
        label: getStatusLabel(status),
        icon: 'close-circle-outline' as const,
        backgroundColor: colors.errorBackground,
        textColor: colors.error,
      };

    case 'PENDING':
    default:
      return {
        label: getStatusLabel(status),
        icon: 'time-outline' as const,
        backgroundColor: colors.primarySoft,
        textColor: colors.primary,
      };
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Henüz iade edilmedi';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoRow({
  label,
  value,
  icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon: IconName;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
      </View>
    </View>
  );
}

function StatusBadge({
  label,
  icon,
  backgroundColor,
  textColor,
}: {
  label: string;
  icon: IconName;
  backgroundColor: string;
  textColor: string;
}) {
  return (
    <View style={[styles.statusBadge, { backgroundColor }]}>
      <Ionicons name={icon} size={14} color={textColor} />
      <Text style={[styles.statusText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function ReservationCard({
  reservation,
  highlighted = false,
}: {
  reservation: ReservationWithEquipment;
  highlighted?: boolean;
}) {
  const status = getStatusAppearance(reservation.status);

  return (
    <View style={[styles.card, highlighted && styles.highlightedCard]}>
      {highlighted ? (
        <View style={styles.highlightBanner}>
          <Ionicons name="notifications-outline" size={15} color={colors.primary} />
          <Text style={styles.highlightLabel}>Bildirimden açılan kayıt</Text>
        </View>
      ) : null}

      <View style={styles.cardHeader}>
        <View style={styles.equipmentIcon}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.cardEyebrow}>REZERVASYON</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {reservation.equipment?.name || 'Ekipman'}
          </Text>

          {reservation.equipment?.code ? (
            <Text style={styles.equipmentCode}>{reservation.equipment.code}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusCaption}>Rezervasyon durumu</Text>
        <StatusBadge
          label={status.label}
          icon={status.icon}
          backgroundColor={status.backgroundColor}
          textColor={status.textColor}
        />
      </View>

      <View style={styles.divider} />

      <InfoRow
        label="Başlangıç"
        value={formatDateTime(reservation.start_at)}
        icon="calendar-outline"
      />

      <View style={styles.smallDivider} />

      <InfoRow label="Bitiş" value={formatDateTime(reservation.end_at)} icon="time-outline" />

      <View style={styles.smallDivider} />

      <InfoRow label="Kullanım amacı" value={reservation.purpose} icon="document-text-outline" />

      {reservation.rejection_reason ? (
        <>
          <View style={styles.smallDivider} />
          <InfoRow
            label="Ret nedeni"
            value={reservation.rejection_reason}
            icon="alert-circle-outline"
            valueColor={colors.error}
          />
        </>
      ) : null}
    </View>
  );
}

function LoanCard({
  loan,
  highlighted = false,
}: {
  loan: LoanWithEquipment;
  highlighted?: boolean;
}) {
  const isReturned = loan.returned_at !== null;

  return (
    <View style={[styles.card, highlighted && styles.highlightedCard]}>
      {highlighted ? (
        <View style={styles.highlightBanner}>
          <Ionicons name="notifications-outline" size={15} color={colors.primary} />
          <Text style={styles.highlightLabel}>Bildirimden açılan kayıt</Text>
        </View>
      ) : null}

      <View style={styles.cardHeader}>
        <View style={styles.equipmentIcon}>
          <Ionicons name="cube-outline" size={24} color={colors.primary} />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.cardEyebrow}>ZİMMET KAYDI</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {loan.equipment?.name || 'Ekipman'}
          </Text>

          {loan.equipment?.code ? (
            <Text style={styles.equipmentCode}>{loan.equipment.code}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusCaption}>Zimmet durumu</Text>
        <StatusBadge
          label={isReturned ? 'İade Edildi' : 'Üzerimde'}
          icon={isReturned ? 'checkmark-circle-outline' : 'cube-outline'}
          backgroundColor={isReturned ? '#153A34' : colors.primarySoft}
          textColor={isReturned ? '#53D6B0' : colors.primary}
        />
      </View>

      <View style={styles.divider} />

      <InfoRow
        label="Teslim alınma"
        value={formatDateTime(loan.checked_out_at)}
        icon="log-in-outline"
      />

      <View style={styles.smallDivider} />

      <InfoRow label="Planlanan iade" value={formatDateTime(loan.due_at)} icon="calendar-outline" />

      {isReturned ? (
        <>
          <View style={styles.smallDivider} />
          <InfoRow
            label="Gerçek iade zamanı"
            value={formatDateTime(loan.returned_at)}
            icon="checkmark-done-outline"
          />
        </>
      ) : null}

      <View style={styles.smallDivider} />

      <InfoRow label="Son kayıtlı durum" value={loan.condition} icon="clipboard-outline" />

      {loan.delivery_note ? (
        <>
          <View style={styles.smallDivider} />
          <InfoRow label="Teslim notu" value={loan.delivery_note} icon="document-text-outline" />
        </>
      ) : null}

      {loan.return_note ? (
        <>
          <View style={styles.smallDivider} />
          <InfoRow label="İade notu" value={loan.return_note} icon="chatbox-outline" />
        </>
      ) : null}
    </View>
  );
}

function SectionHeading({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View>

      <View style={styles.sectionHeadingContent}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={22} color={colors.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function MyActionsScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const cardPositions = useRef<Record<string, number>>({});
  const route = useRoute();

  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const { data: profile } = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const { data, error } = await authService.getCurrentProfile();

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const isAdmin = profile?.role === 'ADMIN';

  const highlightedEntity = useMemo(() => {
    const params = route.params as HighlightParams | undefined;

    if (!params?.highlightEntityType || !params.highlightEntityId) {
      return null;
    }

    return {
      highlightEntityType: params.highlightEntityType,
      highlightEntityId: params.highlightEntityId,
    };
  }, [route.params]);

  const targetKey = highlightedEntity
    ? `${highlightedEntity.highlightEntityType}:${highlightedEntity.highlightEntityId}`
    : null;

  const {
    data: reservations = [],
    isLoading: reservationsLoading,
    isRefetching: reservationsRefetching,
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

  const {
    data: loans = [],
    isLoading: loansLoading,
    isRefetching: loansRefetching,
    error: loansError,
    refetch: refetchLoans,
  } = useQuery<LoanWithEquipment[]>({
    queryKey: ['my-loans'],
    queryFn: async () => {
      const { data, error } = await loanService.getMyLoans();

      if (error) {
        throw error;
      }

      return (data ?? []) as LoanWithEquipment[];
    },
  });

  const isLoading = reservationsLoading || loansLoading;
  const isRefetching = reservationsRefetching || loansRefetching;

  function scrollToHighlightedRecord(key: string, y: number) {
    cardPositions.current[key] = y;

    if (key !== targetKey) {
      return;
    }

    scrollViewRef.current?.scrollTo({
      y: Math.max(0, y - spacing.lg),
      animated: true,
    });
  }

  useEffect(() => {
    if (!targetKey) {
      return;
    }

    const y = cardPositions.current[targetKey];

    if (y === undefined) {
      return;
    }

    scrollViewRef.current?.scrollTo({
      y: Math.max(0, y - spacing.lg),
      animated: true,
    });
  }, [targetKey, reservations, loans]);

  async function handleRefresh() {
    await Promise.all([refetchReservations(), refetchLoans()]);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
        <Text style={styles.loadingTitle}>İşlemlerin yükleniyor</Text>
        <Text style={styles.loadingText}>Rezervasyon ve zimmet kayıtların getiriliyor.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="file-tray-full-outline" size={30} color={colors.primary} />
          </View>

          <Text style={styles.eyebrow}>HESABIM</Text>
          <Text style={styles.screenTitle}>İşlemlerim</Text>
          <Text style={styles.subtitle}>
            Rezervasyonlarını ve zimmet durumlarını tek yerden takip et.
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Ionicons name="calendar-outline" size={19} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.summaryValue}>{reservations.length}</Text>
                <Text style={styles.summaryLabel}>Rezervasyon</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Ionicons name="cube-outline" size={19} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.summaryValue}>{loans.length}</Text>
                <Text style={styles.summaryLabel}>Zimmet kaydı</Text>
              </View>
            </View>
          </View>
        </View>

        {isAdmin ? (
          <View style={styles.adminSection}>
            <SectionHeading
              title="Yönetim işlemleri"
              subtitle="Uygulamanın yönetim alanlarına eriş."
              icon="settings-outline"
            />

            <AdminActionButton
              title="Rezervasyon Yönetimi"
              description="Rezervasyonları onayla veya reddet."
              icon="calendar-outline"
              onPress={() => navigation.navigate('AdminReservations')}
            />

            <AdminActionButton
              title="Bakım Yönetimi"
              description="Ekipman bakımlarını takip et."
              icon="construct-outline"
              onPress={() => navigation.navigate('AdminMaintenance')}
            />

            <AdminActionButton
              title="Ekipman Yönetimi"
              description="Ekipman ekle ve mevcut kayıtları düzenle."
              icon="cube-outline"
              onPress={() => navigation.navigate('AdminEquipment')}
            />

            <AdminActionButton
              title="Zimmet Yönetimi"
              description="Zimmet ve iade durumlarını yönet."
              icon="swap-horizontal-outline"
              onPress={() => navigation.navigate('AdminLoans')}
            />

            <AdminActionButton
              title="Kategori Yönetimi"
              description="Kategorileri ve aktiflik durumlarını düzenle."
              icon="grid-outline"
              onPress={() => navigation.navigate('AdminCategories')}
            />
          </View>
        ) : null}

        <SectionHeading
          title="Rezervasyonlarım"
          subtitle="Oluşturduğun rezervasyon talepleri."
          icon="calendar-outline"
        />

        {reservationsError ? (
          <ErrorState message="Rezervasyonlar yüklenemedi. Aşağı çekerek tekrar deneyebilirsin." />
        ) : reservations.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title="Henüz rezervasyonun yok"
            description="Oluşturduğun rezervasyon talepleri burada görünecek."
          />
        ) : (
          reservations.map((reservation) => {
            const highlighted =
              highlightedEntity?.highlightEntityType === 'reservation' &&
              highlightedEntity.highlightEntityId === reservation.id;

            const key = `reservation:${reservation.id}`;

            return (
              <View
                key={reservation.id}
                onLayout={(event) => scrollToHighlightedRecord(key, event.nativeEvent.layout.y)}
              >
                <ReservationCard reservation={reservation} highlighted={highlighted} />
              </View>
            );
          })
        )}

        <SectionHeading
          title="Zimmet geçmişim"
          subtitle="Teslim aldığın ekipmanlar ve iade kayıtları."
          icon="cube-outline"
        />

        {loansError ? (
          <ErrorState message="Zimmet kayıtları yüklenemedi. Aşağı çekerek tekrar deneyebilirsin." />
        ) : loans.length === 0 ? (
          <EmptyState
            icon="file-tray-outline"
            title="Henüz zimmet kaydın yok"
            description="Teslim aldığın ekipmanların kayıtları burada görünecek."
          />
        ) : (
          loans.map((loan) => {
            const highlighted =
              highlightedEntity?.highlightEntityType === 'loan' &&
              highlightedEntity.highlightEntityId === loan.reservation_id;

            const key = `loan:${loan.reservation_id}`;

            return (
              <View
                key={loan.id}
                onLayout={(event) => scrollToHighlightedRecord(key, event.nativeEvent.layout.y)}
              >
                <LoanCard loan={loan} highlighted={highlighted} />
              </View>
            );
          })
        )}

        <View style={styles.bottomNote}>
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.bottomNoteText}>
            En güncel kayıtları görmek için ekranı aşağı çek.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
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
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  screenTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingContent: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  adminSection: {
    marginBottom: spacing.xl,
  },
  adminActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  adminActionIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminActionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  adminActionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  adminActionDescription: {
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
    marginBottom: spacing.md,
  },
  highlightedCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  highlightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  highlightLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  equipmentIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  cardEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    lineHeight: 22,
  },
  equipmentCode: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusCaption: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: 2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 21,
  },
  smallDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  errorState: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: typography.body,
    lineHeight: 21,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
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
  bottomNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  bottomNoteText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
});
