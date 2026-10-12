
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.cardTitle}>
            {maintenance.equipment?.name ?? 'Ekipman'}
          </Text>

          {maintenance.equipment?.code ? (
            <Text style={styles.secondaryText}>
              {maintenance.equipment.code}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.statusBadge,
            isCompleted ? styles.completedBadge : styles.activeBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>Bakım Açıklaması</Text>
      <Text style={styles.description}>{maintenance.description}</Text>

      <View style={styles.divider} />

      <Text style={styles.label}>Başlangıç</Text>
      <Text style={styles.value}>
        {formatDateTime(maintenance.opened_at)}
      </Text>

      {maintenance.closed_at ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.label}>Tamamlanma</Text>
          <Text style={styles.value}>
            {formatDateTime(maintenance.closed_at)}
          </Text>
        </>
      ) : null}

      {!isCompleted ? (
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isProcessing && styles.disabledButton,
          ]}
          onPress={() => onComplete(maintenance)}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
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
      Alert.alert(
        'Açıklama gerekli',
        'Lütfen bakım açıklamasını gir.',
      );
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
        error instanceof Error
          ? error.message
          : 'Bakım tamamlanamadı.',
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.secondaryText}>
          Bakım bilgileri yükleniyor...
        </Text>
      </View>
    );
  }

  if (equipmentError && maintenanceError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Bakım bilgileri yüklenemedi.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            void refreshData();
          }}
        >
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
          onRefresh={refreshData}
          tintColor={colors.primary}
        />
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Bakım Yönetimi</Text>
      <Text style={styles.subtitle}>
        Ekipmanların bakım süreçlerini yönet.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yeni Bakım Başlat</Text>

        <Text style={styles.label}>Ekipman Seç</Text>

        {equipmentError ? (
          <Text style={styles.errorText}>
            Ekipman listesi yüklenemedi.
          </Text>
        ) : availableEquipment.length === 0 ? (
          <Text style={styles.emptyText}>
            Bakım başlatılabilecek aktif ekipman bulunmuyor.
          </Text>
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
                  activeOpacity={0.8}
                >
                  <View style={styles.titleContainer}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.secondaryText}>{item.code}</Text>
                  </View>

                  <Text
                    style={[
                      styles.optionStatus,
                      isSelected && styles.selectedOptionStatus,
                    ]}
                  >
                    {isSelected ? 'Seçildi' : 'Seç'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Bakım Açıklaması</Text>

        <TextInput
          style={styles.textInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Bakım nedenini ve yapılacak işlemi yaz..."
          placeholderTextColor={colors.textSecondary}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (isSubmitting || availableEquipment.length === 0) &&
              styles.disabledButton,
          ]}
          onPress={() => {
            void handleStartMaintenance();
          }}
          disabled={isSubmitting || availableEquipment.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? 'Bakım Başlatılıyor...' : 'Bakımı Başlat'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Devam Eden Bakımlar</Text>

      {maintenanceError ? (
        <Text style={styles.errorText}>
          Bakım kayıtları yüklenemedi.
        </Text>
      ) : activeMaintenance.length === 0 ? (
        <Text style={styles.emptyText}>
          Devam eden bakım kaydı bulunmuyor.
        </Text>
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

      <Text style={styles.sectionTitle}>Tamamlanan Bakımlar</Text>

      {maintenanceError ? null : completedMaintenance.length === 0 ? (
        <Text style={styles.emptyText}>
          Tamamlanmış bakım kaydı bulunmuyor.
        </Text>
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
  screenTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  equipmentList: {
    gap: spacing.sm,
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  titleContainer: {
    flex: 1,
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
    gap: spacing.md,
    marginBottom: spacing.md,
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
  optionStatus: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  selectedOptionStatus: {
    color: colors.primary,
  },
  statusBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primarySoft,
  },
  activeBadge: {
    backgroundColor: colors.primarySoft,
  },
  completedBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  statusText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  description: {
    color: colors.text,
    fontSize: typography.body,
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  textInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: typography.body,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
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
