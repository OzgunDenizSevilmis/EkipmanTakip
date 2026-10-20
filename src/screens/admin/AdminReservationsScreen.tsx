import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { reservationService } from '../../services/reservationService';
import type { Reservation } from '../../types/reservation';
import { colors, radii, spacing, typography } from '../../theme';
import type { AppStackParamList } from '../../navigation/AppStack';

type AdminReservationsScreenProps = NativeStackScreenProps<
  AppStackParamList,
  'AdminReservations'
>;

type LoanAction = 'DELIVERY' | 'RETURN';

type EquipmentLifecycleStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

type ReservationWithEquipment = Reservation & {
  equipment?: {
    id: string;
    name: string;
    code: string;
    lifecycle_status: EquipmentLifecycleStatus;
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
    default:
      return status;
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

export default function AdminReservationsScreen({
  route,
}: AdminReservationsScreenProps) {
  const queryClient = useQueryClient();
  const equipmentId = route.params?.equipmentId;

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<
    string | null
  >(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [loanAction, setLoanAction] = useState<LoanAction>('DELIVERY');
  const [loanReservation, setLoanReservation] =
    useState<ReservationWithEquipment | null>(null);
  const [condition, setCondition] = useState('İyi durumda');
  const [loanNote, setLoanNote] = useState('');
  const [isProcessingLoan, setIsProcessingLoan] = useState(false);

  const {
    data: reservations = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery<ReservationWithEquipment[]>({
    queryKey: ['admin-reservations'],
    queryFn: async () => {
      const { data, error: reservationError } =
        await reservationService.getAllReservations();

      if (reservationError) {
        throw reservationError;
      }

      return (data ?? []) as ReservationWithEquipment[];
    },
  });

  const filteredReservations = equipmentId
    ? reservations.filter((item) => item.equipment_id === equipmentId)
    : reservations;

  const refreshReservationQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['admin-reservations'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['my-reservations'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['home'],
      }),
    ]);
  }, [queryClient]);

  const openLoanModal = useCallback(
    (reservation: ReservationWithEquipment, action: LoanAction) => {
      setLoanReservation(reservation);
      setLoanAction(action);
      setCondition('İyi durumda');
      setLoanNote('');
      setLoanModalVisible(true);
    },
    [],
  );

  const handleQrEquipment = useCallback(() => {
    if (!equipmentId) {
      return;
    }

    const equipmentReservations = reservations.filter(
      (item) => item.equipment_id === equipmentId,
    );

    const deliveredReservations = equipmentReservations.filter(
      (item) => item.status === 'DELIVERED',
    );

    const approvedReservations = equipmentReservations.filter(
      (item) => item.status === 'APPROVED',
    );

    // Aktif zimmet varsa iade akışını aç.
    if (deliveredReservations.length === 1) {
      openLoanModal(deliveredReservations[0], 'RETURN');
      return;
    }

    if (deliveredReservations.length > 1) {
      Alert.alert(
        'Birden Fazla Aktif Kayıt',
        'Bu ekipmana ait birden fazla teslim edilmiş rezervasyon var. Lütfen kayıtları kontrol edin.',
      );
      return;
    }

    // Aktif zimmet yoksa onaylı rezervasyonu kontrol et.
    if (approvedReservations.length === 1) {
      const reservation = approvedReservations[0];
      const lifecycleStatus = reservation.equipment?.lifecycle_status;

      if (lifecycleStatus !== 'ACTIVE') {
        const message =
          lifecycleStatus === 'MAINTENANCE'
            ? 'Bu ekipman bakımda olduğu için teslim edilemez.'
            : lifecycleStatus === 'INACTIVE'
              ? 'Kullanım dışı ekipman teslim edilemez.'
              : 'Ekipmanın güncel durumu doğrulanamadığı için teslim başlatılamadı.';

        Alert.alert('Teslim İşlemi Yapılamıyor', message);
        return;
      }

      openLoanModal(reservation, 'DELIVERY');
      return;
    }

    if (approvedReservations.length > 1) {
      Alert.alert(
        'Birden Fazla Onaylı Rezervasyon',
        'Bu ekipman için birden fazla onaylı rezervasyon bulundu. İşlem yapmadan önce kayıtları kontrol edin.',
      );
      return;
    }

    Alert.alert(
      'İşlem Bulunamadı',
      'Bu ekipman için teslim veya iade yapılabilecek uygun bir rezervasyon bulunamadı. Rezervasyon durumunu kontrol edin.',
    );
  }, [equipmentId, reservations, openLoanModal]);

  const handleApprove = useCallback(
    async (reservationId: string) => {
      const { error: approveError } =
        await reservationService.approveReservation(reservationId);

      if (approveError) {
        Alert.alert(
          'Onaylama Başarısız',
          approveError.message || 'Rezervasyon onaylanamadı.',
        );
        return;
      }

      await refreshReservationQueries();
      Alert.alert('Başarılı', 'Rezervasyon onaylandı.');
    },
    [refreshReservationQueries],
  );

  function confirmApprove(reservationId: string) {
    Alert.alert(
      'Rezervasyonu Onayla',
      'Bu rezervasyonu onaylamak istediğine emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: () => {
            void handleApprove(reservationId);
          },
        },
      ],
    );
  }

  function openRejectModal(reservationId: string) {
    setSelectedReservationId(reservationId);
    setRejectionReason('');
    setRejectModalVisible(true);
  }

  async function handleReject() {
    if (!selectedReservationId) {
      return;
    }

    if (!rejectionReason.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen red nedeni gir.');
      return;
    }

    setIsRejecting(true);

    try {
      const { error: rejectError } =
        await reservationService.rejectReservation(
          selectedReservationId,
          rejectionReason.trim(),
        );

      if (rejectError) {
        Alert.alert(
          'Red İşlemi Başarısız',
          rejectError.message || 'Rezervasyon reddedilemedi.',
        );
        return;
      }

      setRejectModalVisible(false);
      setSelectedReservationId(null);
      setRejectionReason('');

      await refreshReservationQueries();
      Alert.alert('Başarılı', 'Rezervasyon reddedildi.');
    } catch {
      Alert.alert(
        'İşlem Başarısız',
        'Rezervasyon reddedilirken beklenmeyen bir hata oluştu.',
      );
    } finally {
      setIsRejecting(false);
    }
  }

  function closeRejectModal() {
    if (isRejecting) {
      return;
    }

    setRejectModalVisible(false);
    setSelectedReservationId(null);
    setRejectionReason('');
  }

  function closeLoanModal() {
    if (isProcessingLoan) {
      return;
    }

    setLoanModalVisible(false);
    setLoanReservation(null);
    setLoanNote('');
    setCondition('İyi durumda');
  }

  async function handleLoanAction() {
    if (!loanReservation) {
      return;
    }

    if (!condition.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen ekipmanın durumunu belirt.');
      return;
    }

    setIsProcessingLoan(true);

    try {
      const result =
        loanAction === 'DELIVERY'
          ? await reservationService.deliverEquipment({
              reservationId: loanReservation.id,
              condition: condition.trim(),
              deliveryNote: loanNote.trim() || undefined,
            })
          : await reservationService.returnEquipment({
              reservationId: loanReservation.id,
              condition: condition.trim(),
              returnNote: loanNote.trim() || undefined,
            });

      if (result.error) {
        Alert.alert(
          loanAction === 'DELIVERY'
            ? 'Teslim İşlemi Başarısız'
            : 'İade İşlemi Başarısız',
          result.error.message ||
            'İşlem tamamlanamadı. Lütfen tekrar dene.',
        );
        return;
      }

      setLoanModalVisible(false);
      setLoanReservation(null);
      setLoanNote('');
      setCondition('İyi durumda');

      await refreshReservationQueries();

      Alert.alert(
        'Başarılı',
        loanAction === 'DELIVERY'
          ? 'Ekipman kullanıcıya teslim edildi.'
          : 'Ekipman iade alındı.',
      );
    } catch {
      Alert.alert(
        'İşlem Başarısız',
        'Beklenmeyen bir hata oluştu. Lütfen tekrar dene.',
      );
    } finally {
      setIsProcessingLoan(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Rezervasyonlar yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          Rezervasyonlar yüklenemedi. Lütfen tekrar dene.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            void refetch();
          }}
        >
          <Text style={styles.buttonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Rezervasyon Yönetimi</Text>
        <Text style={styles.subtitle}>
          {equipmentId
            ? 'QR ile seçilen ekipmanın rezervasyon, teslim ve iade işlemleri.'
            : 'Rezervasyon, teslim ve iade işlemlerini yönet.'}
        </Text>
      </View>

      {equipmentId ? (
        <View style={styles.qrActionContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleQrEquipment}
          >
            <Text style={styles.buttonText}>
              Teslim / İade İşlemini Aç
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredReservations.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>
                  {item.equipment?.name || 'Ekipman'}
                </Text>
                {item.equipment?.code ? (
                  <Text style={styles.equipmentCode}>
                    {item.equipment.code}
                  </Text>
                ) : null}
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Başlangıç</Text>
              <Text style={styles.value}>
                {formatDateTime(item.start_at)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.label}>Bitiş</Text>
              <Text style={styles.value}>{formatDateTime(item.end_at)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.label}>Kullanım Amacı</Text>
              <Text style={styles.value}>{item.purpose}</Text>
            </View>

            {item.rejection_reason ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Red Nedeni</Text>
                  <Text style={styles.rejectionReason}>
                    {item.rejection_reason}
                  </Text>
                </View>
              </>
            ) : null}

            {item.status === 'PENDING' ? (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => confirmApprove(item.id)}
                >
                  <Text style={styles.buttonText}>Onayla</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => openRejectModal(item.id)}
                >
                  <Text style={styles.rejectButtonText}>Reddet</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {item.status === 'APPROVED' ? (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => openLoanModal(item, 'DELIVERY')}
                >
                  <Text style={styles.buttonText}>Teslim Et</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {item.status === 'DELIVERED' ? (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => openLoanModal(item, 'RETURN')}
                >
                  <Text style={styles.buttonText}>İade Al</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {equipmentId
                ? 'Bu ekipman için rezervasyon bulunamadı'
                : 'Rezervasyon bulunamadı'}
            </Text>
            <Text style={styles.emptyText}>
              {equipmentId
                ? 'Bu ekipmana ait kayıtlı rezervasyon bulunmuyor.'
                : 'Kullanıcıların oluşturduğu rezervasyonlar burada görüntülenecek.'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRejectModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rezervasyonu Reddet</Text>
            <Text style={styles.modalDescription}>
              Lütfen rezervasyonu neden reddettiğini belirt.
            </Text>

            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Red nedeni..."
              placeholderTextColor={colors.textSecondary}
              multiline
              style={styles.reasonInput}
              editable={!isRejecting}
              maxLength={1000}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeRejectModal}
                disabled={isRejecting}
              >
                <Text style={styles.cancelButtonText}>Vazgeç</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmRejectButton}
                onPress={() => {
                  void handleReject();
                }}
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.confirmRejectText}>Reddet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={loanModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeLoanModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {loanAction === 'DELIVERY' ? 'Ekipman Teslimi' : 'Ekipman İadesi'}
            </Text>

            <Text style={styles.modalDescription}>
              {loanReservation?.equipment?.name || 'Ekipman'}
              {'\n'}
              {loanAction === 'DELIVERY'
                ? 'Teslim öncesi ekipmanın durumunu belirt.'
                : 'İade alınan ekipmanın son durumunu belirt.'}
            </Text>

            <Text style={styles.inputLabel}>Ekipmanın Durumu *</Text>
            <TextInput
              value={condition}
              onChangeText={setCondition}
              placeholder="Örn. İyi durumda"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              editable={!isProcessingLoan}
              maxLength={200}
            />

            <Text style={styles.inputLabel}>
              {loanAction === 'DELIVERY'
                ? 'Teslim Notu (İsteğe bağlı)'
                : 'İade Notu (İsteğe bağlı)'}
            </Text>
            <TextInput
              value={loanNote}
              onChangeText={setLoanNote}
              placeholder="Açıklama ekleyebilirsin..."
              placeholderTextColor={colors.textSecondary}
              multiline
              style={styles.reasonInput}
              editable={!isProcessingLoan}
              maxLength={1000}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeLoanModal}
                disabled={isProcessingLoan}
              >
                <Text style={styles.cancelButtonText}>Vazgeç</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => {
                  void handleLoanAction();
                }}
                disabled={isProcessingLoan}
              >
                {isProcessingLoan ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.buttonText}>
                    {loanAction === 'DELIVERY'
                      ? 'Teslim Et'
                      : 'İadeyi Tamamla'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  qrActionContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  rejectButtonText: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: '700',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  modalDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  textInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  reasonInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: typography.body,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  confirmRejectButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRejectText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '700',
  },
});