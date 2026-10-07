import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { reservationService } from '../../services/reservationService';
import type { Reservation } from '../../types/reservation';
import { colors, radii, spacing, typography } from '../../theme';

type ReservationWithEquipment = Reservation & {
  equipment: {
    id: string;
    name: string;
    code: string;
  } | null;
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
            <Text style={styles.label}>Red Nedeni</Text>
            <Text style={styles.rejectionReason}>
              {reservation.rejection_reason}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

export function MyActionsScreen() {
  const {
    data: reservations = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery<ReservationWithEquipment[]>({
    queryKey: ['my-reservations'],
    queryFn: async () => {
      const { data, error: reservationError } =
        await reservationService.getMyReservations();

      if (reservationError) {
        throw reservationError;
      }

      return (data ?? []) as ReservationWithEquipment[];
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />

        <Text style={styles.loadingText}>
          Rezervasyonların yükleniyor...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          Rezervasyonlar yüklenemedi. Lütfen tekrar dene.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>İşlemlerim</Text>

        <Text style={styles.subtitle}>
          Rezervasyonlarını ve işlem durumlarını takip et.
        </Text>
      </View>

      <FlatList
        data={reservations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReservationCard reservation={item} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          reservations.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              Henüz rezervasyonun yok
            </Text>

            <Text style={styles.emptyText}>
              Bir ekipman için rezervasyon oluşturduğunda burada
              görüntüleyebilirsin.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: spacing.lg,
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

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  emptyList: {
    flexGrow: 1,
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
    textAlign: 'center',
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },

  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});