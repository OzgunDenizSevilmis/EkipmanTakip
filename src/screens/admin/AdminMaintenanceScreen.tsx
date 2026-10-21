import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { equipmentService } from '../../services/equipmentService';
import {
  maintenanceService,
  type MaintenanceRecord,
} from '../../services/maintenanceService';
import { colors, radii, spacing, typography } from '../../theme';

type EquipmentOption = {
  id: string;
  name: string;
  code: string;
  lifecycle_status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
};

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

function SummaryCard({
  icon,
  label,
  count,
  accent,
  iconBackground,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  count: number;
  accent: string;
  iconBackground: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.summaryCount}>{count}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MaintenanceCard({
  maintenance,
  isProcessing,
  onComplete,
}: {
  maintenance: MaintenanceRecord;
  isProcessing: boolean;
  onComplete: (maintenance: MaintenanceRecord) => void;
}) {
  const isCompleted = maintenance.closed_at !== null;

  return (
    <View style={styles.maintenanceCard}>
      <View style={styles.cardHeader}>
        <View style={styles.equipmentIcon}>
          <Ionicons
            name="construct-outline"
            size={23}
            color={colors.primary}
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {maintenance.equipment?.name ?? 'Ekipman'}
          </Text>

          {maintenance.equipment?.code ? (
            <Text style={styles.secondaryText}>
              Kod: {maintenance.equipment.code}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.statusBadge,
          isCompleted ? styles.completedBadge : styles.activeBadge,
        ]}
      >
        <Ionicons
          name={isCompleted ? 'checkmark-circle-outline' : 'time-outline'}
          size={15}
          color={isCompleted ? '#63D8B4' : '#F4C66A'}
        />
        <Text
          style={[
            styles.statusText,
            { color: isCompleted ? '#63D8B4' : '#F4C66A' },
          ]}
        >
          {isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
        </Text>
      </View>

      <View style={styles.cardDivider} />

      <Text style={styles.label}>Bakım açıklaması</Text>
      <Text style={styles.description}>{maintenance.description}</Text>

      <View style={styles.infoRow}>
        <Ionicons
          name="calendar-outline"
          size={17}
          color={colors.textSecondary}
        />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>Başlangıç tarihi</Text>
          <Text style={styles.value}>
            {formatDateTime(maintenance.opened_at)}
          </Text>
        </View>
      </View>

      {maintenance.closed_at ? (
        <View style={styles.infoRow}>
          <Ionicons
            name="checkmark-done-outline"
            size={17}
            color="#63D8B4"
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Tamamlanma tarihi</Text>
            <Text style={styles.value}>
              {formatDateTime(maintenance.closed_at)}
            </Text>
          </View>
        </View>
      ) : null}

      {!isCompleted ? (
        <TouchableOpacity
          style={[
            styles.completeButton,
            isProcessing && styles.disabledButton,
          ]}
          onPress={() => onComplete(maintenance)}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons
              name="checkmark-circle-outline"
              size={19}
              color={colors.white}
            />
          )}
          <Text style={styles.buttonText}>
            {isProcessing ? 'İşleniyor...' : 'Bakımı Tamamla'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function AdminMaintenanceScreen() {
  const queryClient = useQueryClient();

  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingMaintenanceId, setProcessingMaintenanceId] = useState<
    string | null
  >(null);

  const {
    data: equipment = [],
    isLoading: equipmentLoading,
    isError: equipmentError,
    refetch: refetchEquipment,
    isRefetching: equipmentRefetching,
  } = useQuery<EquipmentOption[]>({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await equipmentService.getEquipment();

      if (error) {
        throw error;
      }

      return (data ?? []) as EquipmentOption[];
    },
  });

  const {
    data: maintenanceRecords = [],
    isLoading: maintenanceLoading,
    isError: maintenanceError,
    refetch: refetchMaintenance,
    isRefetching: maintenanceRefetching,
  } = useQuery<MaintenanceRecord[]>({
    queryKey: ['maintenance-records'],
    queryFn: async () => {
      const { data, error } =
        await maintenanceService.getMaintenanceRecords();

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const availableEquipment = equipment.filter(
    (item) => item.lifecycle_status === 'ACTIVE',
  );

  const activeMaintenance = maintenanceRecords.filter(
    (item) => item.closed_at === null,
  );

  const completedMaintenance = maintenanceRecords.filter(
    (item) => item.closed_at !== null,
  );

  async function refreshData() {
    await Promise.all([refetchEquipment(), refetchMaintenance()]);
  }

  async function invalidateRelatedQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      queryClient.invalidateQueries({ queryKey: ['maintenance-records'] }),
      queryClient.invalidateQueries({ queryKey: ['home'] }),
    ]);
  }

  async function handleStartMaintenance() {
    if (!selectedEquipmentId) {
      Alert.alert('Ekipman seçilmedi', 'Lütfen bir ekipman seç.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Açıklama gerekli', 'Lütfen bakım açıklamasını gir.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await maintenanceService.startMaintenance({
        equipmentId: selectedEquipmentId,
        description: description.trim(),
      });

      if (error) {
        throw error;
      }

      await invalidateRelatedQueries();

      setSelectedEquipmentId('');
      setDescription('');

      Alert.alert('Başarılı', 'Bakım kaydı oluşturuldu.');
    } catch (error) {
      Alert.alert(
        'Bakım başlatılamadı',
        error instanceof Error
          ? error.message
          : 'Beklenmeyen bir hata oluştu.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCompleteMaintenance(maintenance: MaintenanceRecord) {
    Alert.alert(
      'Bakımı tamamla',
      `${maintenance.equipment?.name ?? 'Ekipman'} için bakım tamamlanacak. Devam etmek istiyor musun?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Tamamla',
          onPress: () => {
            void completeMaintenance(maintenance);
          },
        },
      ],
    );
  }

  async function completeMaintenance(maintenance: MaintenanceRecord) {
    setProcessingMaintenanceId(maintenance.id);

    try {
      const { error } = await maintenanceService.completeMaintenance(
        maintenance.id,
      );

      if (error) {
        throw error;
      }

      await invalidateRelatedQueries();

      Alert.alert('Başarılı', 'Bakım tamamlandı ve ekipman aktif edildi.');
    } catch (error) {
      Alert.alert(
        'İşlem başarısız',
        error instanceof Error ? error.message : 'Bakım tamamlanamadı.',
      );
    } finally {
      setProcessingMaintenanceId(null);
    }
  }

  const isLoading = equipmentLoading || maintenanceLoading;
  const isRefetching = equipmentRefetching || maintenanceRefetching;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={styles.stateTitle}>Bakım kayıtları yükleniyor</Text>
        <Text style={styles.stateDescription}>
          Ekipman ve bakım bilgileri hazırlanıyor.
        </Text>
      </View>
    );
  }

  if (equipmentError && maintenanceError) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <Ionicons
            name="cloud-offline-outline"
            size={30}
            color={colors.error}
          />
        </View>
        <Text style={styles.stateTitle}>Veriler yüklenemedi</Text>
        <Text style={styles.stateDescription}>
          Bakım bilgileri alınırken bir sorun oluştu. Lütfen tekrar dene.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            void refreshData();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={19} color={colors.white} />
          <Text style={styles.primaryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void refreshData();
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="construct-outline"
            size={27}
            color={colors.primary}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.screenTitle}>Bakım Yönetimi</Text>
          <Text style={styles.subtitle}>
            Ekipmanların bakım süreçlerini takip et ve yönet.
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard
          icon="time-outline"
          label="Devam Eden"
          count={activeMaintenance.length}
          accent="#F4C66A"
          iconBackground="#3B301B"
        />
        <SummaryCard
          icon="checkmark-circle-outline"
          label="Tamamlanan"
          count={completedMaintenance.length}
          accent="#63D8B4"
          iconBackground="#173A32"
        />
        <SummaryCard
          icon="desktop-outline"
          label="Uygun Ekipman"
          count={equipmentError ? 0 : availableEquipment.length}
          accent="#8CB5FF"
          iconBackground="#1C3154"
        />
      </View>

      <View style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="add-circle-outline"
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Yeni Bakım Başlat</Text>
            <Text style={styles.sectionSubtitle}>
              Bakım kaydı oluşturmak için bilgileri gir.
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Ekipman seçimi *</Text>

        {equipmentError ? (
          <View style={styles.inlineError}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={colors.error}
            />
            <Text style={styles.errorText}>Ekipman listesi yüklenemedi.</Text>
          </View>
        ) : availableEquipment.length === 0 ? (
          <View style={styles.emptyInline}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              Bakım başlatılabilecek aktif ekipman bulunmuyor.
            </Text>
          </View>
        ) : (
          <View style={styles.equipmentList}>
            {availableEquipment.map((item) => {
              const isSelected = selectedEquipmentId === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.equipmentOption,
                    isSelected && styles.selectedEquipmentOption,
                  ]}
                  onPress={() => setSelectedEquipmentId(item.id)}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      isSelected && styles.selectedOptionIcon,
                    ]}
                  >
                    <Ionicons
                      name="desktop-outline"
                      size={21}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                  </View>

                  <View style={styles.titleContainer}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.secondaryText}>
                      Kod: {item.code}
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      isSelected
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={22}
                    color={
                      isSelected ? colors.primary : colors.textSecondary
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Bakım açıklaması *</Text>
        <TextInput
          style={styles.textInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Bakım nedenini ve yapılacak işlemi yaz..."
          placeholderTextColor={colors.placeholder}
          multiline
          textAlignVertical="top"
          maxLength={1000}
          editable={!isSubmitting}
        />
        <Text style={styles.characterCount}>
          {description.length}/1000 karakter
        </Text>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (isSubmitting ||
              equipmentError ||
              availableEquipment.length === 0) &&
              styles.disabledButton,
          ]}
          onPress={() => {
            void handleStartMaintenance();
          }}
          disabled={
            isSubmitting ||
            equipmentError ||
            availableEquipment.length === 0
          }
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons
              name="construct-outline"
              size={19}
              color={colors.white}
            />
          )}
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Bakım Başlatılıyor...' : 'Bakımı Başlat'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listSectionHeader}>
        <View style={styles.listSectionIcon}>
          <Ionicons name="time-outline" size={22} color="#F4C66A" />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Devam Eden Bakımlar</Text>
          <Text style={styles.sectionSubtitle}>
            {activeMaintenance.length} aktif bakım kaydı
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {activeMaintenance.length}
          </Text>
        </View>
      </View>

      {maintenanceError ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="alert-circle-outline"
            size={23}
            color={colors.error}
          />
          <Text style={styles.errorText}>Bakım kayıtları yüklenemedi.</Text>
        </View>
      ) : activeMaintenance.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="checkmark-done-outline"
              size={26}
              color="#63D8B4"
            />
          </View>
          <Text style={styles.emptyTitle}>Aktif bakım yok</Text>
          <Text style={styles.emptyText}>
            Şu anda devam eden bir bakım kaydı bulunmuyor.
          </Text>
        </View>
      ) : (
        activeMaintenance.map((item) => (
          <MaintenanceCard
            key={item.id}
            maintenance={item}
            isProcessing={processingMaintenanceId === item.id}
            onComplete={handleCompleteMaintenance}
          />
        ))
      )}

      <View style={[styles.listSectionHeader, styles.completedSectionHeader]}>
        <View style={styles.listSectionIconCompleted}>
          <Ionicons
            name="checkmark-done-outline"
            size={22}
            color="#63D8B4"
          />
        </View>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Tamamlanan Bakımlar</Text>
          <Text style={styles.sectionSubtitle}>
            Geçmiş bakım kayıtları
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {completedMaintenance.length}
          </Text>
        </View>
      </View>

      {maintenanceError ? null : completedMaintenance.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="file-tray-outline"
              size={26}
              color={colors.textSecondary}
            />
          </View>
          <Text style={styles.emptyTitle}>Geçmiş kayıt yok</Text>
          <Text style={styles.emptyText}>
            Tamamlanan bakım kayıtları burada görüntülenecek.
          </Text>
        </View>
      ) : (
        completedMaintenance.map((item) => (
          <MaintenanceCard
            key={item.id}
            maintenance={item}
            isProcessing={false}
            onComplete={handleCompleteMaintenance}
          />
        ))
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
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
    lineHeight: 19,
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
    fontSize: 23,
    fontWeight: '800',
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
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
    lineHeight: 18,
  },
  label: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  equipmentList: {
    gap: spacing.sm,
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  selectedEquipmentOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOptionIcon: {
    backgroundColor: colors.background,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  secondaryText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  textInput: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: typography.body,
    lineHeight: 21,
  },
  characterCount: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 49,
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  completedSectionHeader: {
    marginTop: spacing.xl,
  },
  listSectionIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: '#3B301B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSectionIconCompleted: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: '#173A32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  countBadgeText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  maintenanceCard: {
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
  activeBadge: {
    backgroundColor: '#3B301B',
  },
  completedBadge: {
    backgroundColor: '#173A32',
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
  description: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 21,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    marginTop: spacing.xl,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
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
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorBackground,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: typography.body,
    lineHeight: 21,
  },
  emptyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: 'center',
  },
});
