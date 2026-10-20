import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/AppStack';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { useQuery } from '@tanstack/react-query';

import { equipmentService } from '../../services/equipmentService';
import { colors, radii, spacing, typography } from '../../theme';

type QRScannerScreenProps = NativeStackScreenProps<
  AppStackParamList,
  'QRScanner'
>;
type EquipmentStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

function getEquipmentStatusLabel(status: EquipmentStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'Kullanıma Uygun';
    case 'MAINTENANCE':
      return 'Bakımda';
    case 'INACTIVE':
      return 'Kullanım Dışı';
    default:
      return status;
  }
}

export default function QRScannerScreen({
  navigation,
}: QRScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const equipmentQuery = useQuery({
    queryKey: ['equipment-by-code', scannedCode],
    enabled: Boolean(scannedCode),
    queryFn: async () => {
      const { data, error } =
        await equipmentService.getEquipmentByCode(scannedCode!);

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          'Girilen kodla eşleşen bir ekipman bulunamadı. Kodu kontrol edip tekrar deneyin.',
        );
      }

      return data;
    },
    retry: false,
  });

  function handleCode(code: string) {
    const normalizedCode = code.trim();

    if (!normalizedCode) {
      Alert.alert(
        'Ekipman kodu gerekli',
        'Lütfen bir QR kod okutun veya ekipman kodunu manuel olarak girin.',
      );
      return;
    }

    setManualCode(normalizedCode);
    setScannedCode(normalizedCode);
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scannedCode || isSearching) {
      return;
    }

    setIsSearching(true);
    handleCode(result.data);
  }

  function resetScanner() {
    setScannedCode(null);
    setIsSearching(false);
    setManualCode('');
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          Kamera erişimi kontrol ediliyor...
        </Text>
      </View>
    );
  }

  const hasPermission = permission.granted;

return (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.scrollContent}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
    
      <View style={styles.header}>
        <Text style={styles.eyebrow}>EKİPMAN YÖNETİMİ</Text>
        <Text style={styles.title}>QR Kod Okutma</Text>
        <Text style={styles.subtitle}>
          Ekipman bilgilerine hızlıca ulaşmak için QR kodu okutun
          veya ekipman kodunu manuel olarak girin.
        </Text>
      </View>

      {hasPermission ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>01</Text>
            </View>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Kamerayla Tara</Text>
              <Text style={styles.sectionDescription}>
                QR kodu kamera görüntüsünün içine hizalayın.
              </Text>
            </View>
          </View>

          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={
                scannedCode ? undefined : handleBarcodeScanned
              }
            />

            <View pointerEvents="none" style={styles.scanOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            <View style={styles.cameraHint}>
              <Text style={styles.cameraHintText}>
                QR kodu çerçevenin içine getirin
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Text style={styles.permissionIconText}>!</Text>
          </View>
          <Text style={styles.sectionTitle}>Kamera erişimi gerekli</Text>
          <Text style={styles.sectionDescription}>
            QR kod tarama özelliğini kullanmak için kamera izni
            vermeniz gerekir. İzin vermeden de ekipman kodunu
            manuel olarak arayabilirsiniz.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              void requestPermission();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              Kamera İznini Ver
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.manualCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Text style={styles.sectionIconText}>02</Text>
          </View>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Kod ile Ara</Text>
            <Text style={styles.sectionDescription}>
              Ekipmanın üzerindeki kodu girerek kaydı bulun.
            </Text>
          </View>
        </View>

        <Text style={styles.inputLabel}>Ekipman Kodu</Text>
        <TextInput
          style={styles.input}
          value={manualCode}
          onChangeText={setManualCode}
          placeholder="Örn. KAM001"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={100}
          returnKeyType="search"
          accessibilityLabel="Ekipman kodu"
          onSubmitEditing={() => handleCode(manualCode)}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => handleCode(manualCode)}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Ekipmanı Ara</Text>
        </TouchableOpacity>
      </View>

      {scannedCode ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultEyebrow}>ARAMA SONUCU</Text>

          {equipmentQuery.isLoading ? (
            <View style={styles.resultLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.sectionDescription}>
                Ekipman kaydı sorgulanıyor...
              </Text>
            </View>
          ) : equipmentQuery.isError ? (
            <>
              <Text style={styles.errorTitle}>
                Ekipman bulunamadı
              </Text>
              <Text style={styles.sectionDescription}>
                {equipmentQuery.error instanceof Error
                  ? equipmentQuery.error.message
                  : 'Arama sırasında bir hata oluştu. Lütfen tekrar deneyin.'}
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={resetScanner}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  Yeniden Ara
                </Text>
              </TouchableOpacity>
            </>
          ) : equipmentQuery.data ? (
            <>
              <Text style={styles.equipmentName}>
                {equipmentQuery.data.name}
              </Text>

              <View style={styles.equipmentInfoRow}>
                <Text style={styles.infoLabel}>Ekipman Kodu</Text>
                <Text style={styles.infoValue}>
                  {equipmentQuery.data.code}
                </Text>
              </View>

              <View style={styles.equipmentInfoRow}>
                <Text style={styles.infoLabel}>Kullanım Durumu</Text>
                <Text style={styles.infoValue}>
                  {getEquipmentStatusLabel(
                    equipmentQuery.data.lifecycle_status as EquipmentStatus,
                  )}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() =>
                  navigation.navigate('EquipmentDetail', {
                    equipmentId: equipmentQuery.data.id,
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  Ekipman Detaylarını Görüntüle
                </Text>
              </TouchableOpacity>

<TouchableOpacity
  style={styles.secondaryButton}
  onPress={() =>
    navigation.navigate('AdminReservations', {
      equipmentId: equipmentQuery.data.id,
    })
  }
  activeOpacity={0.8}
>
  <Text style={styles.secondaryButtonText}>
    Teslim / İade İşlemlerine Git
  </Text>
</TouchableOpacity>


              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={resetScanner}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>
                  Başka Ekipman Ara
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: colors.background,
},
scrollContent: {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,
  paddingBottom: spacing.xl,
  flexGrow: 1,
},

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  title: {
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  sectionHeading: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  sectionDescription: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  cameraContainer: {
    height: 245,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#101828',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 190,
    height: 150,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: radii.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: radii.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: radii.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: radii.md,
  },
  cameraHint: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    backgroundColor: 'rgba(16, 24, 40, 0.82)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  cameraHintText: {
    color: '#FFFFFF',
    fontSize: typography.caption,
    fontWeight: '500',
  },
  permissionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  permissionIconText: {
    color: colors.primary,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  manualCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  inputLabel: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: typography.body,
  },
  primaryButton: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  resultEyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  resultLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  equipmentName: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  equipmentInfoRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  infoValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
  errorTitle: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
  },
});
