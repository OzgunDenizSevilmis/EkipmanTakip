
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { loanService } from '../../services/loanService';
import { colors, radii, spacing, typography } from '../../theme';

type Loan = {
  id: string;
  checked_out_at: string;
  due_at: string | null;
  returned_at: string | null;
  delivery_note: string | null;
  return_note: string | null;
  condition: string | null;
  equipment: {
    id: string;
    name: string;
    code: string;
  } | null;
  profile: {
    id: string;
    full_name: string;
  } | null;
};

function formatDate(value: string | null) {
  if (!value) return 'Belirtilmedi';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Belirtilmedi';

  return date.toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function LoanCard({ loan }: { loan: Loan }) {
  const isReturned = Boolean(loan.returned_at);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.equipmentInfo}>
          <Text style={styles.equipmentName}>
            {loan.equipment?.name ?? 'Ekipman bulunamadı'}
          </Text>
          <Text style={styles.equipmentCode}>
            Kod: {loan.equipment?.code ?? '—'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isReturned ? styles.returnedBadge : styles.activeBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isReturned ? styles.returnedText : styles.activeText,
            ]}
          >
            {isReturned ? 'İade Edildi' : 'Üzerinde'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.label}>Zimmet Alan</Text>
      <Text style={styles.value}>
        {loan.profile?.full_name || 'Kullanıcı bilgisi bulunamadı'}
      </Text>

      <Text style={styles.label}>Teslim Tarihi</Text>
      <Text style={styles.value}>
        {formatDate(loan.checked_out_at)}
      </Text>

      <Text style={styles.label}>Planlanan İade</Text>
      <Text style={styles.value}>{formatDate(loan.due_at)}</Text>

      {isReturned ? (
        <>
          <Text style={styles.label}>Gerçek İade Tarihi</Text>
          <Text style={styles.value}>
            {formatDate(loan.returned_at)}
          </Text>
        </>
      ) : null}

      {loan.condition ? (
        <>
          <Text style={styles.label}>Durum</Text>
          <Text style={styles.value}>{loan.condition}</Text>
        </>
      ) : null}

      {loan.delivery_note ? (
        <>
          <Text style={styles.label}>Teslim Notu</Text>
          <Text style={styles.value}>{loan.delivery_note}</Text>
        </>
      ) : null}

      {loan.return_note ? (
        <>
          <Text style={styles.label}>İade Notu</Text>
          <Text style={styles.value}>{loan.return_note}</Text>
        </>
      ) : null}
    </View>
  );
}

export default function AdminLoansScreen() {
  const {
    data: loans,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-loans'],
    queryFn: async () => {
      const { data, error: serviceError } =
        await loanService.getAllLoans();

      if (serviceError) throw serviceError;

      return (data ?? []) as Loan[];
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.helperText}>Zimmetler yükleniyor...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Zimmetler yüklenemedi</Text>
        <Text style={styles.helperText}>
          {error instanceof Error
            ? error.message
            : 'Beklenmeyen bir hata oluştu.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Zimmet Yönetimi</Text>
        <Text style={styles.subtitle}>
          Tüm kullanıcıların aktif ve geçmiş zimmet kayıtları.
        </Text>
        <Text style={styles.count}>
          Toplam kayıt: {loans?.length ?? 0}
        </Text>
      </View>

      <FlatList
        data={loans ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LoanCard loan={item} />}
        contentContainerStyle={
          loans?.length ? styles.list : styles.emptyList
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Henüz zimmet kaydı bulunmuyor.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.xs,
  },
  count: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentName: {
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
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  activeBadge: {
    backgroundColor: '#FFF1D6',
  },
  returnedBadge: {
    backgroundColor: '#DDF5E5',
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  activeText: {
    color: '#8A5700',
  },
  returnedText: {
    color: '#176B3A',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    marginTop: spacing.xs,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorTitle: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
    padding: spacing.lg,
  },
});
