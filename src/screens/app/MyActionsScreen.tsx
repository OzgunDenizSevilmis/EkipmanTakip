
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { loanService } from '../../services/loanService';
import { reservationService } from '../../services/reservationService';
import type { Reservation } from '../../types/reservation';
import { colors, radii, spacing, typography } from '../../theme';

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
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ReservationCard({
  reservation,
}: {
  reservation: ReservationWithEquipment;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {reservation.equipment?.name || 'Ekipman'}
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

      <View style={styles.infoRow}>
        <Text style={styles.label}>Başlangıç</Text>
        <Text style={styles.value}>
          {formatDateTime(reservation.start_at)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Text style={styles.label}>Bitiş</Text>
        <Text style={styles.value}>
          {formatDateTime(reservation.end_at)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Text style={styles.label}>Kullanım Amacı</Text>
        <Text style={styles.value}>{reservation.purpose}</Text>
      </View>

      {reservation.rejection_reason ? (
        <>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Ret Nedeni</Text>
            <Text style={styles.rejectionReason}>
              {reservation.rejection_reason}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function LoanCard({ loan }: { loan: LoanWithEquipment }) {
  const isReturned = loan.returned_at !== null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {loan.equipment?.name || 'Ekipman'}
          </Text>

          {loan.equipment?.code ? (
            <Text style={styles.equipmentCode}>
              {loan.equipment.code}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.statusBadge,
            isReturned ? styles.returnedBadge : styles.activeBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {isReturned ? 'İade Edildi' : 'Üzerimde'}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.label}>Teslim Alınma</Text>
        <Text style={styles.value}>
          {formatDateTime(loan.checked_out_at)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Text style={styles.label}>Planlanan İade</Text>
        <Text style={styles.value}>{formatDateTime(loan.due_at)}</Text>
      </View>

      {isReturned ? (
        <>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Gerçek İade Zamanı</Text>
            <Text style={styles.value}>
              {formatDateTime(loan.returned_at)}
            </Text>
          </View>
        </>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Text style={styles.label}>Son Kayıtlı Durum</Text>
        <Text style={styles.value}>{loan.condition}</Text>
      </View>

      {loan.delivery_note ? (
        <>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Teslim Notu</Text>
            <Text style={styles.value}>{loan.delivery_note}</Text>
          </View>
        </>
      ) : null}

      {loan.return_note ? (
        <>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>İade Notu</Text>
            <Text style={styles.value}>{loan.return_note}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

export function MyActionsScreen() {
  const {
    data: reservations = [],
    isLoading: reservationsLoading,
    isRefetching: reservationsRefetching,
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

  async function handleRefresh() {
    await Promise.all([refetchReservations(), refetchLoans()]);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />

        <Text style={styles.loadingText}>
          İşlemlerin yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.screenTitle}>İşlemlerim</Text>

          <Text style={styles.subtitle}>
            Rezervasyonlarını ve zimmet durumlarını takip et.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Rezervasyonlarım</Text>

        {reservationsError ? (
          <Text style={styles.error}>
            Rezervasyonlar yüklenemedi. Ekranı aşağı çekerek tekrar dene.
          </Text>
        ) : reservations.length === 0 ? (
          <Text style={styles.emptyText}>
            Henüz rezervasyonun yok.
          </Text>
        ) : (
          reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
            />
          ))
        )}

        <Text style={styles.sectionTitle}>Zimmet Geçmişim</Text>

        {loansError ? (
          <Text style={styles.error}>
            Zimmet kayıtları yüklenemedi. Ekranı aşağı çekerek tekrar dene.
          </Text>
        ) : loans.length === 0 ? (
          <Text style={styles.emptyText}>
            Henüz teslim aldığın bir ekipman bulunmuyor.
          </Text>
        ) : (
          loans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  screenTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.xs,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  titleContainer: {
    flex: 1,
  },

  title: {
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

  activeBadge: {
    backgroundColor: colors.primarySoft,
  },

  returnedBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  statusText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
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

  rejectionReason: {
    color: colors.error,
    fontSize: typography.body,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
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
    marginBottom: spacing.md,
  },

  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginBottom: spacing.md,
  },
});
