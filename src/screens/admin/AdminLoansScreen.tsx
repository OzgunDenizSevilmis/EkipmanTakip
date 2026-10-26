import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

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

function SummaryCard({
  title,
  value,
  description,
  variant,
}: {
  title: string;
  value: number;
  description: string;
  variant: 'active' | 'returned';
}) {
  return (
    <View style={styles.summaryCard}>
      <View
        style={[
          styles.summaryIndicator,
          variant === 'active' ? styles.activeIndicator : styles.returnedIndicator,
        ]}
      />
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryDescription}>{description}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LoanCard({ loan }: { loan: Loan }) {
  const isReturned = Boolean(loan.returned_at);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.equipmentInfo}>
          <Text style={styles.equipmentName}>{loan.equipment?.name ?? 'Ekipman bulunamadı'}</Text>
          <Text style={styles.equipmentCode}>
            {loan.equipment?.code ? `Kod: ${loan.equipment.code}` : 'Ekipman kodu bulunamadı'}
          </Text>
        </View>

        <View style={[styles.statusBadge, isReturned ? styles.returnedBadge : styles.activeBadge]}>
          <View style={[styles.statusDot, isReturned ? styles.returnedDot : styles.activeDot]} />
          <Text style={[styles.statusText, isReturned ? styles.returnedText : styles.activeText]}>
            {isReturned ? 'İade Edildi' : 'Üzerinde'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.personSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(loan.profile?.full_name || '?').trim().charAt(0).toLocaleUpperCase('tr-TR')}
          </Text>
        </View>
        <View style={styles.personInfo}>
          <Text style={styles.personLabel}>Zimmet alan kullanıcı</Text>
          <Text style={styles.personName}>
            {loan.profile?.full_name || 'Kullanıcı bilgisi bulunamadı'}
          </Text>
        </View>
      </View>

      <View style={styles.dateSection}>
        <InfoRow label="Teslim tarihi" value={formatDate(loan.checked_out_at)} />
        <InfoRow label="Planlanan iade" value={formatDate(loan.due_at)} />
        {isReturned ? (
          <InfoRow label="Gerçek iade tarihi" value={formatDate(loan.returned_at)} />
        ) : null}
      </View>

      {loan.condition ? (
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>Ekipman durumu</Text>
          <Text style={styles.noteText}>{loan.condition}</Text>
        </View>
      ) : null}

      {loan.delivery_note ? (
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>Teslim notu</Text>
          <Text style={styles.noteText}>{loan.delivery_note}</Text>
        </View>
      ) : null}

      {loan.return_note ? (
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>İade notu</Text>
          <Text style={styles.noteText}>{loan.return_note}</Text>
        </View>
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
      const { data, error: serviceError } = await loanService.getAllLoans();

      if (serviceError) throw serviceError;

      return (data ?? []) as Loan[];
    },
  });

  const loanList = loans ?? [];
  const activeCount = loanList.filter((loan) => !loan.returned_at).length;
  const returnedCount = loanList.filter((loan) => Boolean(loan.returned_at)).length;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.helperText}>Zimmet kayıtları yükleniyor...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>!</Text>
        </View>
        <Text style={styles.errorTitle}>Zimmetler yüklenemedi</Text>
        <Text style={styles.helperText}>
          {error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={loanList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LoanCard loan={item} />}
        contentContainerStyle={loanList.length ? styles.list : styles.emptyList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowDot} />
                <Text style={styles.eyebrowText}>YÖNETİM PANELİ</Text>
              </View>

              <Text style={styles.title}>Zimmet Yönetimi</Text>
              <Text style={styles.subtitle}>
                Kullanıcılara teslim edilen ekipmanları ve geçmiş zimmet kayıtlarını buradan takip
                edebilirsin.
              </Text>

              <View style={styles.totalCard}>
                <View style={styles.totalTextContainer}>
                  <Text style={styles.totalLabel}>Toplam zimmet kaydı</Text>
                  <Text style={styles.totalValue}>{loanList.length}</Text>
                </View>
                <View style={styles.totalIcon}>
                  <Text style={styles.totalIconText}>Z</Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <SummaryCard
                title="Aktif"
                value={activeCount}
                description="Henüz iade edilmedi"
                variant="active"
              />
              <SummaryCard
                title="İade edildi"
                value={returnedCount}
                description="İade işlemi tamamlandı"
                variant="returned"
              />
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Zimmet kayıtları</Text>
                <Text style={styles.sectionSubtitle}>Tüm teslim ve iade geçmişi</Text>
              </View>
              <View style={styles.recordCount}>
                <Text style={styles.recordCountText}>{loanList.length} kayıt</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>Z</Text>
            </View>
            <Text style={styles.emptyTitle}>Henüz zimmet kaydı yok</Text>
            <Text style={styles.emptyText}>
              Ekipman teslim işlemleri tamamlandığında kayıtlar burada görüntülenecek.
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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  emptyList: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  eyebrowText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  totalTextContainer: {
    flex: 1,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  totalValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  totalIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalIconText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  summaryIndicator: {
    width: 28,
    height: 4,
    borderRadius: radii.pill,
    marginBottom: spacing.md,
  },
  activeIndicator: {
    backgroundColor: colors.primary,
  },
  returnedIndicator: {
    backgroundColor: '#39C98A',
  },
  summaryTitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  summaryDescription: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  recordCount: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recordCountText: {
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
    fontWeight: '800',
    lineHeight: 22,
  },
  equipmentCode: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  activeBadge: {
    backgroundColor: colors.primarySoft,
  },
  returnedBadge: {
    backgroundColor: '#173A35',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    marginRight: spacing.xs,
  },
  activeDot: {
    backgroundColor: colors.primary,
  },
  returnedDot: {
    backgroundColor: '#39C98A',
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  activeText: {
    color: colors.primary,
  },
  returnedText: {
    color: '#65D9A6',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  personSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '800',
  },
  personInfo: {
    flex: 1,
  },
  personLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  personName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  dateSection: {
    marginTop: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  infoValue: {
    flex: 1.4,
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 18,
  },
  noteSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  noteLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  noteText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 21,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.md,
  },
  errorIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  errorIconText: {
    color: colors.error,
    fontSize: 28,
    fontWeight: '800',
  },
  errorTitle: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '800',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
});
