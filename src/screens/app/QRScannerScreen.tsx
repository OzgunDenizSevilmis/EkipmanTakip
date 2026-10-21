import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '../../navigation/AppStack';
import { equipmentService } from '../../services/equipmentService';
import { colors, radii, spacing, typography } from '../../theme';

type QRScannerScreenProps = NativeStackScreenProps<
  AppStackParamList,
  'QRScanner'
>;

type EquipmentStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';

function getEquipmentStatus(status: EquipmentStatus) {
  switch (status) {
    case 'ACTIVE':
      return {
        label: 'Kullanıma Uygun',
        icon: 'checkmark-circle-outline' as const,
        backgroundColor: '#153A34',
        textColor: '#53D6B0',
      };

    case 'MAINTENANCE':
      return {
        label: 'Bakımda',
        icon: 'construct-outline' as const,
        backgroundColor: colors.errorBackground,
        textColor: colors.error,
      };

    case 'INACTIVE':
      return {
        label: 'Kullanım Dışı',
        icon: 'pause-circle-outline' as const,
        backgroundColor: colors.surfaceElevated,
        textColor: colors.textSecondary,
      };
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

    if (isSearching) {
      return;
    }

    setIsSearching(true);
    setManualCode(normalizedCode);
    setScannedCode(normalizedCode);
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scannedCode || isSearching) {
      return;
    }

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
        <View style={styles.loadingIcon}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={styles.stateTitle}>Kamera hazırlanıyor</Text>
        <Text style={styles.stateDescription}>
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
        <View style={styles.headerIcon}>
          <Ionicons
            name="qr-code-outline"
            size={30}
            color={colors.primary}
          />
        </View>

        <Text style={styles.eyebrow}>HIZLI ERİŞİM</Text>
        <Text style={styles.title}>QR Kod Tarayıcı</Text>
        <Text style={styles.subtitle}>
          Ekipmanın QR kodunu okutarak bilgilerine ulaşabilir veya üzerindeki
          ekipman kodunu manuel olarak arayabilirsin.
        </Text>
      </View>

      {hasPermission ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="camera-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Kamerayla tara</Text>
              <Text style={styles.sectionDescription}>
                QR kodu çerçevenin içine hizala.
              </Text>
            </View>

            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>CANLI</Text>
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
                scannedCode || isSearching
                  ? undefined
                  : handleBarcodeScanned
              }
            />

            <View pointerEvents="none" style={styles.scanOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />

                <View style={styles.scanCenter}>
                  <Ionicons
                    name="qr-code-outline"
                    size={36}
                    color="rgba(255,255,255,0.8)"
                  />
                </View>
              </View>
            </View>

            <View style={styles.cameraHint}>
              <Ionicons
                name="scan-outline"
                size={16}
                color={colors.white}
              />
              <Text style={styles.cameraHintText}>
                QR kodu çerçevenin içine getir
              </Text>
            </View>

            {isSearching ? (
              <View style={styles.cameraSearching}>
                <ActivityIndicator color={colors.white} />
                <Text style={styles.cameraSearchingText}>
                  Kod kontrol ediliyor...
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.tipRow}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles.tipText}>
              Daha iyi sonuç için QR kodu aydınlık bir ortamda okut.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Ionicons
              name="camera-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <Text style={styles.sectionTitle}>Kamera erişimi gerekli</Text>
          <Text style={styles.sectionDescription}>
            QR kod taramak için kamera izni vermelisin. İzin vermeden de
            ekipman kodunu aşağıdaki alana girerek arama yapabilirsin.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => void requestPermission()}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Ionicons name="camera-outline" size={19} color={colors.white} />
            <Text style={styles.primaryButtonText}>Kamera iznini ver</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.manualCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="keypad-outline"
              size={22}
              color={colors.primary}
            />
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Kod ile ara</Text>
            <Text style={styles.sectionDescription}>
              Ekipman kodunu manuel olarak gir.
            </Text>
          </View>
        </View>

        <Text style={styles.inputLabel}>EKİPMAN KODU</Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="barcode-outline"
            size={21}
            color={colors.textSecondary}
          />

          <TextInput
            style={styles.input}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Örn. KAM001"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={100}
            returnKeyType="search"
            accessibilityLabel="Ekipman kodu"
            editable={!isSearching}
            onSubmitEditing={() => handleCode(manualCode)}
          />

          {manualCode.length > 0 ? (
            <TouchableOpacity
              onPress={() => setManualCode('')}
              accessibilityRole="button"
              accessibilityLabel="Kodu temizle"
              disabled={isSearching}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isSearching && styles.disabledButton,
          ]}
          onPress={() => handleCode(manualCode)}
          activeOpacity={0.8}
          disabled={isSearching}
          accessibilityRole="button"
        >
          {isSearching ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons
                name="search-outline"
                size={19}
                color={colors.white}
              />
              <Text style={styles.primaryButtonText}>Ekipmanı ara</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {scannedCode ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultHeaderIcon}>
              <Ionicons
                name="clipboard-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.resultHeaderText}>
              <Text style={styles.resultEyebrow}>ARAMA SONUCU</Text>
              <Text style={styles.resultCode}>{scannedCode}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {equipmentQuery.isLoading ? (
            <View style={styles.resultLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.sectionDescription}>
                Ekipman kaydı sorgulanıyor...
              </Text>
            </View>
          ) : equipmentQuery.isError ? (
            <View style={styles.resultError}>
              <View style={styles.errorIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={25}
                  color={colors.error}
                />
              </View>

              <Text style={styles.errorTitle}>Ekipman bulunamadı</Text>
              <Text style={styles.sectionDescription}>
                {equipmentQuery.error instanceof Error
                  ? equipmentQuery.error.message
                  : 'Arama sırasında bir hata oluştu. Lütfen tekrar deneyin.'}
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={resetScanner}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons
                  name="refresh-outline"
                  size={19}
                  color={colors.white}
                />
                <Text style={styles.primaryButtonText}>Yeniden ara</Text>
              </TouchableOpacity>
            </View>
          ) : equipmentQuery.data ? (
            <>
              <View style={styles.equipmentHeading}>
                <View style={styles.equipmentIcon}>
                  <Ionicons
                    name="cube-outline"
                    size={27}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.equipmentHeadingText}>
                  <Text style={styles.equipmentName}>
                    {equipmentQuery.data.name}
                  </Text>
                  <Text style={styles.equipmentCode}>
                    {equipmentQuery.data.code}
                  </Text>
                </View>
              </View>

              <View style={styles.equipmentInfoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="barcode-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ekipman kodu</Text>
                  <Text style={styles.infoValue}>
                    {equipmentQuery.data.code}
                  </Text>
                </View>
              </View>

              <View style={styles.equipmentInfoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Kullanım durumu</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getEquipmentStatus(
                          equipmentQuery.data.lifecycle_status as EquipmentStatus,
                        ).backgroundColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        getEquipmentStatus(
                          equipmentQuery.data.lifecycle_status as EquipmentStatus,
                        ).icon
                      }
                      size={15}
                      color={
                        getEquipmentStatus(
                          equipmentQuery.data.lifecycle_status as EquipmentStatus,
                        ).textColor
                      }
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: getEquipmentStatus(
                            equipmentQuery.data.lifecycle_status as EquipmentStatus,
                          ).textColor,
                        },
                      ]}
                    >
                      {getEquipmentStatus(
                        equipmentQuery.data.lifecycle_status as EquipmentStatus,
                      ).label}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() =>
                  navigation.navigate('EquipmentDetail', {
                    equipmentId: equipmentQuery.data.id,
                  })
                }
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons
                  name="open-outline"
                  size={19}
                  color={colors.white}
                />
                <Text style={styles.primaryButtonText}>
                  Ekipman detaylarını görüntüle
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
                accessibilityRole="button"
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={19}
                  color={colors.primary}
                />
                <Text style={styles.secondaryButtonText}>
                  Teslim / iade işlemlerine git
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.textButton}
                onPress={resetScanner}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons
                  name="scan-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.textButtonLabel}>Başka ekipman ara</Text>
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
    paddingBottom: spacing.xxxl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 58,
    height: 58,
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
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
    lineHeight: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: '#153A34',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: '#53D6B0',
  },
  liveText: {
    color: '#53D6B0',
    fontSize: 10,
    fontWeight: '700',
  },
  cameraContainer: {
    height: 290,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#101828',
    borderWidth: 1,
    borderColor: colors.border,
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
    width: 210,
    height: 175,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCenter: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: 'rgba(11,18,32,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: radii.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: radii.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: radii.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: radii.md,
  },
  cameraHint: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(11,18,32,0.88)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  cameraHintText: {
    color: colors.white,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  cameraSearching: {
   ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(11,18,32,0.82)',
  },
  cameraSearchingText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '600',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tipText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  permissionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  permissionIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  manualCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    color: colors.text,
    fontSize: typography.body,
  },
  primaryButton: {
    minHeight: 50,
    flexDirection: 'row',
    gap: spacing.sm,
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
    flexShrink: 1,
  },
  disabledButton: {
    opacity: 0.65,
  },
  secondaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  textButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  textButtonLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  resultHeaderIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  resultEyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
  resultCode: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  resultLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  resultError: {
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  errorIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  errorTitle: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  equipmentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  equipmentIcon: {
    width: 54,
    height: 54,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentHeadingText: {
    flex: 1,
    gap: spacing.xs,
  },
  equipmentName: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  equipmentCode: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  equipmentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
});