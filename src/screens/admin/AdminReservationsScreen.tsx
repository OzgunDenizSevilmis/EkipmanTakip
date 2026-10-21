import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
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

function getStatusStyle(status: Reservation['status']) {
  switch (status) {
    case 'PENDING':
      return {
        label: getStatusLabel(status),
        icon: 'time-outline' as const,
        background: '#3B301B',
        foreground: '#F4C66A',
      };
    case 'APPROVED':
      return {
        label: getStatusLabel(status),
        icon: 'checkmark-circle-outline' as const,
        background: '#173A32',
        foreground: '#63D8B4',
      };
    case 'DELIVERED':
      return {
        label: getStatusLabel(status),
        icon: 'cube-outline' as const,
        background: '#1C3154',
        foreground: '#8CB5FF',
      };
    case 'COMPLETED':
      return {
        label: getStatusLabel(status),
        icon: 'checkmark-done-outline' as const,
        background: '#173A32',
        foreground: '#63D8B4',
      };
    case 'REJECTED':
    case 'CANCELLED':
      return {
        label: getStatusLabel(status),
        icon: 'close-circle-outline' as const,
        background: '#3A202B',
        foreground: '#FF8498',
      };
    case 'EXPIRED':
    default:
      return {
        label: getStatusLabel(status),
        icon: 'alert-circle-outline' as const,
        background: colors.surfaceElevated,
        foreground: colors.textSecondary,
      };
  }
}

function formatDateTime(value: string) {
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

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.textSecondary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
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
  const [isApproving, setIsApproving] = useState<string | null>(null);

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

  const pendingCount = filteredReservations.filter(
    (item) => item.status === 'PENDING',
  ).length;

  const approvedCount = filteredReservations.filter(
    (item) => item.status === 'APPROVED',
  ).length;

  const deliveredCount = filteredReservations.filter(
    (item) => item.status === 'DELIVERED',
  ).length;

  const refreshReservationQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-reservations'] }),
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] }),
      queryClient.invalidateQueries({ queryKey: ['home'] }),
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
      setIsApproving(reservationId);

      try {
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
      } catch {
        Alert.alert(
          'İşlem Başarısız',
          'Rezervasyon onaylanırken beklenmeyen bir hata oluştu.',
        );
      } finally {
        setIsApproving(null);
      }
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
          result.error.message || 'İşlem tamamlanamadı. Lütfen tekrar dene.',
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Rezervasyonlar yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.stateIcon}>
          <Ionicons
            name="cloud-offline-outline"
            size={30}
            color={colors.error}
          />
        </View>
        <Text style={styles.stateTitle}>Veriler yüklenemedi</Text>
        <Text style={styles.error}>
          Rezervasyonlar yüklenirken bir sorun oluştu.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            void refetch();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.white} />
          <Text style={styles.buttonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredReservations.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons
                  name="clipboard-outline"
                  size={25}
                  color={colors.primary}
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.screenTitle}>Rezervasyon Yönetimi</Text>
                <Text style={styles.subtitle}>
                  {equipmentId
                    ? 'Seçilen ekipmanın rezervasyon, teslim ve iade işlemleri.'
                    : 'Rezervasyonları ve ekipman hareketlerini yönet.'}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <SummaryCard
                icon="time-outline"
                label="Bekleyen"
                count={pendingCount}
                accent="#F4C66A"
                background="#3B301B"
              />
              <SummaryCard
                icon="checkmark-circle-outline"
                label="Onaylı"
                count={approvedCount}
                accent="#63D8B4"
                background="#173A32"
              />
              <SummaryCard
                icon="cube-outline"
                label="Teslimde"
                count={deliveredCount}
                accent="#8CB5FF"
                background="#1C3154"
              />
            </View>

            {equipmentId ? (
              <View style={styles.qrActionContainer}>
                <View style={styles.qrInfo}>
                  <Ionicons
                    name="qr-code-outline"
                    size={22}
                    color={colors.primary}
                  />
                  <View style={styles.qrInfoText}>
                    <Text style={styles.qrTitle}>QR ekipman işlemi</Text>
                    <Text style={styles.qrSubtitle}>
                      Uygun kayda göre teslim veya iade başlat.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleQrEquipment}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={19}
                    color={colors.white}
                  />
                  <Text style={styles.buttonText}>Teslim / İade Aç</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.listHeading}>
              <View>
                <Text style={styles.sectionTitle}>Rezervasyonlar</Text>
                <Text style={styles.sectionSubtitle}>
                  {filteredReservations.length} kayıt listeleniyor
                </Text>
              </View>
              <View style={styles.listHeadingIcon}>
                <Ionicons
                  name="list-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          const isApprovingThis = isApproving === item.id;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.equipmentIcon}>
                  <Ionicons
                    name="desktop-outline"
                    size={23}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.titleContainer}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.equipment?.name || 'Ekipman'}
                  </Text>
                  <Text style={styles.equipmentCode}>
                    {item.equipment?.code
                      ? `Kod: ${item.equipment.code}`
                      : 'Ekipman kodu belirtilmemiş'}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusStyle.background },
                ]}
              >
                <Ionicons
                  name={statusStyle.icon}
                  size={15}
                  color={statusStyle.foreground}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: statusStyle.foreground },
                  ]}
                >
                  {statusStyle.label}
                </Text>
              </View>

              <View style={styles.cardDivider} />

              <InfoRow
                label="Başlangıç"
                value={formatDateTime(item.start_at)}
                icon="calendar-outline"
              />
              <InfoRow
                label="Bitiş"
                value={formatDateTime(item.end_at)}
                icon="calendar-clear-outline"
              />
              <InfoRow
                label="Kullanım amacı"
                value={item.purpose}
                icon="document-text-outline"
              />

              {item.rejection_reason ? (
                <View style={styles.rejectionBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={colors.error}
                  />
                  <View style={styles.rejectionContent}>
                    <Text style={styles.rejectionLabel}>Red nedeni</Text>
                    <Text style={styles.rejectionReason}>
                      {item.rejection_reason}
                    </Text>
                  </View>
                </View>
              ) : null}

              {item.status === 'PENDING' ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => confirmApprove(item.id)}
                    disabled={isApproving !== null}
                    activeOpacity={0.8}
                  >
                    {isApprovingThis ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-outline"
                          size={18}
                          color={colors.white}
                        />
                        <Text style={styles.buttonText}>Onayla</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => openRejectModal(item.id)}
                    disabled={isApproving !== null}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="close-outline"
                      size={18}
                      color={colors.error}
                    />
                    <Text style={styles.rejectButtonText}>Reddet</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {item.status === 'APPROVED' ? (
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => openLoanModal(item, 'DELIVERY')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="arrow-up-circle-outline"
                    size={19}
                    color={colors.white}
                  />
                  <Text style={styles.buttonText}>Ekipmanı Teslim Et</Text>
                </TouchableOpacity>
              ) : null}

              {item.status === 'DELIVERED' ? (
                <TouchableOpacity
                  style={styles.returnButton}
                  onPress={() => openLoanModal(item, 'RETURN')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="arrow-down-circle-outline"
                    size={19}
                    color="#63D8B4"
                  />
                  <Text style={styles.returnButtonText}>İade Al</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="file-tray-outline"
                size={34}
                color={colors.textSecondary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {equipmentId
                ? 'Bu ekipman için rezervasyon yok'
                : 'Henüz rezervasyon bulunmuyor'}
            </Text>
            <Text style={styles.emptyText}>
              {equipmentId
                ? 'Seçilen ekipmana ait kayıtlı rezervasyon bulunmuyor.'
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
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <View style={styles.modalIcon}>
                <Ionicons
                  name="close-circle-outline"
                  size={25}
                  color={colors.error}
                />
              </View>
              <Text style={styles.modalTitle}>Rezervasyonu Reddet</Text>
              <Text style={styles.modalDescription}>
                Rezervasyonun neden reddedildiğini açıklaman gerekiyor.
              </Text>

              <Text style={styles.inputLabel}>Red nedeni *</Text>
              <TextInput
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Red nedenini yaz..."
                placeholderTextColor={colors.placeholder}
                multiline
                style={styles.reasonInput}
                editable={!isRejecting}
                maxLength={1000}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeRejectModal}
                  disabled={isRejecting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Vazgeç</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmRejectButton,
                    isRejecting && styles.disabledButton,
                  ]}
                  onPress={() => {
                    void handleReject();
                  }}
                  disabled={isRejecting}
                  activeOpacity={0.8}
                >
                  {isRejecting ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.confirmRejectText}>Reddet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={loanModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeLoanModal}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <View
                style={[
                  styles.modalIcon,
                  loanAction === 'RETURN' && styles.returnModalIcon,
                ]}
              >
                <Ionicons
                  name={
                    loanAction === 'DELIVERY'
                      ? 'arrow-up-circle-outline'
                      : 'arrow-down-circle-outline'
                  }
                  size={25}
                  color={
                    loanAction === 'DELIVERY' ? colors.primary : '#63D8B4'
                  }
                />
              </View>

              <Text style={styles.modalTitle}>
                {loanAction === 'DELIVERY'
                  ? 'Ekipman Teslimi'
                  : 'Ekipman İadesi'}
              </Text>

              <Text style={styles.modalDescription}>
                {loanReservation?.equipment?.name || 'Ekipman'}
                {'\n'}
                {loanAction === 'DELIVERY'
                  ? 'Teslim öncesi ekipmanın durumunu belirt.'
                  : 'İade alınan ekipmanın son durumunu belirt.'}
              </Text>

              <Text style={styles.inputLabel}>Ekipmanın durumu *</Text>
              <TextInput
                value={condition}
                onChangeText={setCondition}
                placeholder="Örn. İyi durumda"
                placeholderTextColor={colors.placeholder}
                style={styles.textInput}
                editable={!isProcessingLoan}
                maxLength={200}
              />

              <Text style={styles.inputLabel}>
                {loanAction === 'DELIVERY'
                  ? 'Teslim notu (isteğe bağlı)'
                  : 'İade notu (isteğe bağlı)'}
              </Text>
              <TextInput
                value={loanNote}
                onChangeText={setLoanNote}
                placeholder="Ek açıklama yazabilirsin..."
                placeholderTextColor={colors.placeholder}
                multiline
                style={styles.reasonInput}
                editable={!isProcessingLoan}
                maxLength={1000}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeLoanModal}
                  disabled={isProcessingLoan}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Vazgeç</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.approveButton,
                    isProcessingLoan && styles.disabledButton,
                  ]}
                  onPress={() => {
                    void handleLoanAction();
                  }}
                  disabled={isProcessingLoan}
                  activeOpacity={0.8}
                >
                  {isProcessingLoan ? (
                    <ActivityIndicator color={colors.white} size="small" />
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
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  count,
  accent,
  background,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  count: number;
  accent: string;
  background: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={19} color={accent} />
      </View>
      <Text style={styles.summaryCount}>{count}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
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
    paddingBottom: spacing.xxxl,
  },
  emptyList: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  screenTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  summaryCount: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  qrActionContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  qrInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  qrInfoText: {
    flex: 1,
  },
  qrTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  qrSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  listHeadingIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  equipmentIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    lineHeight: 21,
  },
  equipmentCode: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    paddingTop: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 21,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.errorBackground,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  rejectionContent: {
    flex: 1,
  },
  rejectionLabel: {
    color: colors.error,
    fontSize: typography.caption,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  rejectionReason: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  rejectButtonText: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: '700',
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#286B58',
    backgroundColor: '#173A32',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    minHeight: 48,
  },
  returnButtonText: {
    color: '#63D8B4',
    fontSize: typography.body,
    fontWeight: '700',
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.md,
  },
  error: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  returnModalIcon: {
    backgroundColor: '#173A32',
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  modalDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  inputLabel: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: typography.body,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  reasonInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: typography.body,
    padding: spacing.md,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  confirmRejectButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRejectText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.65,
  },
});
