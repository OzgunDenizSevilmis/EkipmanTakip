import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import { EquipmentCard } from '../../components/EquipmentCard';
import { equipmentService } from '../../services/equipmentService';
import type { AppStackParamList } from '../../navigation/AppStack';
import { colors, radii, spacing, typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';


const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

type DatePickerTarget = 'start' | 'end';

function formatDate(date: Date | null): string {
  if (!date) {
    return '';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

function startOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function EquipmentScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [startDateSelection, setStartDateSelection] = useState<Date | null>(
    null,
  );
  const [endDateSelection, setEndDateSelection] = useState<Date | null>(null);
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  const [datePickerTarget, setDatePickerTarget] =
    useState<DatePickerTarget | null>(null);
  const [pickerDraftDate, setPickerDraftDate] = useState(new Date());
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['equipment', 'active-categories'],
    queryFn: async () => {
      const { data, error } = await equipmentService.getActiveCategories();

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const {
    data: result,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'equipment',
      'catalog',
      {
        page: currentPage,
        pageSize: PAGE_SIZE,
        search,
        categoryId: selectedCategoryId,
        startAt: appliedStartDate,
        endAt: appliedEndDate,
        availableOnly,
      },
    ],
    queryFn: async () => {
      const { data, count, error: requestError } =
        await equipmentService.getEquipment({
          page: currentPage,
          pageSize: PAGE_SIZE,
          search,
          categoryId: selectedCategoryId || undefined,
          startAt: appliedStartDate || undefined,
          endAt: appliedEndDate || undefined,
          availableOnly,
        });

      if (requestError) {
        throw requestError;
      }

      return {
        equipment: data ?? [],
        count: count ?? 0,
      };
    },
  });

  const equipment = result?.equipment ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const isInitialLoading = (isLoading || isLoadingCategories) && !result;

  const openDatePicker = (target: DatePickerTarget) => {
    const selectedDate =
      target === 'start' ? startDateSelection : endDateSelection;

    const fallbackDate =
      target === 'end' && startDateSelection
        ? startDateSelection
        : new Date();

    setPickerDraftDate(selectedDate ?? fallbackDate);
    setDatePickerTarget(target);
    setDateError('');
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (selectedDate) {
      setPickerDraftDate(selectedDate);
    }

    // Android's native calendar is closed with the system confirmation
    // or dismissal action. iOS uses the modal's explicit buttons.
    if (Platform.OS === 'android') {
      if (selectedDate && datePickerTarget === 'start') {
        setStartDateSelection(selectedDate);

        if (
          endDateSelection &&
          startOfLocalDay(endDateSelection).getTime() <
            startOfLocalDay(selectedDate).getTime()
        ) {
          setEndDateSelection(null);
        }
      } else if (selectedDate && datePickerTarget === 'end') {
        if (
          startDateSelection &&
          startOfLocalDay(selectedDate).getTime() <
            startOfLocalDay(startDateSelection).getTime()
        ) {
          setDateError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
        } else {
          setEndDateSelection(selectedDate);
          setDateError('');
        }
      }

      setDatePickerTarget(null);
    }
  };

  const confirmDateSelection = () => {
    if (datePickerTarget === 'start') {
      setStartDateSelection(pickerDraftDate);

      if (
        endDateSelection &&
        startOfLocalDay(endDateSelection).getTime() <
          startOfLocalDay(pickerDraftDate).getTime()
      ) {
        setEndDateSelection(null);
      }
    } else if (datePickerTarget === 'end') {
      if (
        startDateSelection &&
        startOfLocalDay(pickerDraftDate).getTime() <
          startOfLocalDay(startDateSelection).getTime()
      ) {
        setDateError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
        return;
      }

      setEndDateSelection(pickerDraftDate);
    }

    setDateError('');
    setDatePickerTarget(null);
  };

  const applyAvailabilityFilters = () => {
    if (Boolean(startDateSelection) !== Boolean(endDateSelection)) {
      setDateError('Lütfen hem başlangıç hem de bitiş tarihini seç.');
      return;
    }

    if (availableOnly && (!startDateSelection || !endDateSelection)) {
      setDateError(
        'Yalnızca müsait ekipmanları filtrelemek için tarih aralığı seç.',
      );
      return;
    }

    if (startDateSelection && endDateSelection) {
      const normalizedStart = startOfLocalDay(startDateSelection);
      const normalizedEnd = endOfLocalDay(endDateSelection);

      if (normalizedEnd.getTime() < normalizedStart.getTime()) {
        setDateError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
        return;
      }

      setAppliedStartDate(normalizedStart.toISOString());
      setAppliedEndDate(normalizedEnd.toISOString());
    } else {
      setAppliedStartDate('');
      setAppliedEndDate('');
    }

    setDateError('');
    setCurrentPage(1);
  };

  const clearAvailabilityFilters = () => {
    setStartDateSelection(null);
    setEndDateSelection(null);
    setAppliedStartDate('');
    setAppliedEndDate('');
    setAvailableOnly(false);
    setDateError('');
    setCurrentPage(1);
    setDatePickerTarget(null);
  };

  const toggleAvailableOnly = () => {
    if (availableOnly) {
      setAvailableOnly(false);
      setCurrentPage(1);
      setDateError('');
      return;
    }

    if (!appliedStartDate || !appliedEndDate) {
      setDateError(
        'Önce başlangıç ve bitiş tarihlerini seçip "Filtreyi Uygula" butonuna bas.',
      );
      return;
    }

    setAvailableOnly(true);
    setCurrentPage(1);
    setDateError('');
  };


const headerContent = (
  <View>
    <View style={styles.pageHeading}>
      <View style={styles.headingIcon}>
        <Ionicons name="cube-outline" size={25} color={colors.primary} />
      </View>

      <View style={styles.headerText}>
        <Text style={styles.title}>Ekipmanlar</Text>
        <Text style={styles.subtitle}>
          Ekipmanları keşfet, müsaitlik durumunu kontrol et.
        </Text>
      </View>
    </View>

    <View style={styles.searchRow}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.textSecondary}
        />
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Ekipman adı veya kodu ara..."
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Ekipman ara"
        />
        {searchInput.length > 0 ? (
          <TouchableOpacity
            onPress={() => setSearchInput('')}
            accessibilityRole="button"
            accessibilityLabel="Aramayı temizle"
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
        style={styles.qrButton}
        onPress={() => navigation.navigate('QRScanner')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="QR kod okut"
      >
        <Ionicons name="scan-outline" size={22} color={colors.white} />
      </TouchableOpacity>
    </View>

    <View style={styles.filterPanel}>
      <View style={styles.panelHeading}>
        <View style={styles.panelHeadingIcon}>
          <Ionicons
            name="options-outline"
            size={19}
            color={colors.primary}
          />
        </View>
        <View style={styles.panelHeadingText}>
          <Text style={styles.panelTitle}>Filtreler</Text>
          <Text style={styles.panelSubtitle}>
            İhtiyacına uygun ekipmanı bul
          </Text>
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Kategori</Text>

        <FlatList
          horizontal
          data={[{ id: '', name: 'Tümü' }, ...categories]}
          keyExtractor={(item) => item.id || 'all-categories'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategoryId === item.id;

            return (
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => {
                  setSelectedCategoryId(item.id);
                  setCurrentPage(1);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {categoriesError ? (
        <View style={styles.categoryErrorContainer}>
          <Text style={styles.inlineError}>
            Kategoriler yüklenemedi. Tekrar deneyebilirsin.
          </Text>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => void refetchCategories()}
            accessibilityRole="button"
          >
            <Text style={styles.smallButtonText}>Kategorileri yenile</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.filterDivider} />

      <View style={styles.availabilitySection}>
        <View style={styles.dateSectionHeading}>
          <Ionicons
            name="calendar-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.filterLabel}>Müsaitlik tarih aralığı</Text>
        </View>

        <Text style={styles.dateHint}>
          Kullanım dönemini seçerek uygun ekipmanları filtrele.
        </Text>

        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => openDatePicker('start')}
            accessibilityRole="button"
            accessibilityLabel="Başlangıç tarihi seç"
          >
            <Text style={styles.dateButtonLabel}>BAŞLANGIÇ</Text>
            <View style={styles.dateValueRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.dateButtonValue,
                  !startDateSelection && styles.datePlaceholder,
                ]}
              >
                {startDateSelection
                  ? formatDate(startDateSelection)
                  : 'Tarih seç'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => openDatePicker('end')}
            accessibilityRole="button"
            accessibilityLabel="Bitiş tarihi seç"
          >
            <Text style={styles.dateButtonLabel}>BİTİŞ</Text>
            <View style={styles.dateValueRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.dateButtonValue,
                  !endDateSelection && styles.datePlaceholder,
                ]}
              >
                {endDateSelection ? formatDate(endDateSelection) : 'Tarih seç'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.availabilityToggle}
          onPress={toggleAvailableOnly}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: availableOnly }}
        >
          <View
            style={[
              styles.checkbox,
              availableOnly && styles.checkboxSelected,
            ]}
          >
            {availableOnly ? (
              <Ionicons name="checkmark" size={15} color={colors.white} />
            ) : null}
          </View>
          <Text style={styles.availabilityToggleText}>
            Yalnızca müsait ekipmanları göster
          </Text>
        </TouchableOpacity>

        {dateError ? (
          <View style={styles.dateErrorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={17}
              color={colors.error}
            />
            <Text style={styles.inlineError}>{dateError}</Text>
          </View>
        ) : null}

        <View style={styles.dateActions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={applyAvailabilityFilters}
            accessibilityRole="button"
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={17}
              color={colors.white}
            />
            <Text style={styles.primaryButtonText}>Filtreyi Uygula</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearAvailabilityFilters}
            accessibilityRole="button"
          >
            <Text style={styles.clearButtonText}>Temizle</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>

    <View style={styles.resultsHeader}>
      <View>
        <Text style={styles.resultsTitle}>Ekipman kataloğu</Text>
        <Text style={styles.resultsText}>
          {totalCount} ekipman bulundu
        </Text>
      </View>

      {isRefetching ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={styles.resultsIcon}>
          <Ionicons
            name="grid-outline"
            size={19}
            color={colors.primary}
          />
        </View>
      )}
    </View>

    {error && result ? (
      <Text style={styles.inlineError}>
        Güncel veriler alınamadı. Önceki sonuçlar gösteriliyor.
      </Text>
    ) : null}
  </View>
);


  if (isInitialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Ekipmanlar yükleniyor...</Text>
      </View>
    );
  }

  if (error && !result) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          Ekipmanlar yüklenemedi: {String(error)}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => void refetch()}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        data={equipment}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EquipmentCard
            equipment={item}
            onPress={() =>
              navigation.navigate('EquipmentDetail', {
                equipmentId: item.id,
              })
            }
          />
        )}
        ListHeaderComponent={headerContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Ekipman bulunamadı</Text>
            <Text style={styles.emptyText}>
              Arama veya filtreleri değiştirerek tekrar deneyebilirsin.
            </Text>
          </View>
        }
        ListFooterComponent={
          totalCount > 0 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  page <= 1 && styles.pageButtonDisabled,
                ]}
                disabled={page <= 1}
                onPress={() =>
                  setCurrentPage((current) => Math.max(1, current - 1))
                }
                accessibilityRole="button"
                accessibilityLabel="Önceki sayfa"
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    page <= 1 && styles.pageButtonTextDisabled,
                  ]}
                >
                  Önceki
                </Text>
              </TouchableOpacity>

              <Text style={styles.pageIndicator}>
                {page} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  page >= totalPages && styles.pageButtonDisabled,
                ]}
                disabled={page >= totalPages}
                onPress={() =>
                  setCurrentPage((current) =>
                    Math.min(totalPages, current + 1),
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Sonraki sayfa"
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    page >= totalPages && styles.pageButtonTextDisabled,
                  ]}
                >
                  Sonraki
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          equipment.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <Modal
        visible={datePickerTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.modalTitle}>
              {datePickerTarget === 'start'
                ? 'Başlangıç tarihi seç'
                : 'Bitiş tarihi seç'}
            </Text>

            <DateTimePicker
              value={pickerDraftDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={handleDateChange}
              locale="tr-TR"
              maximumDate={
                datePickerTarget === 'start' && endDateSelection
                  ? endDateSelection
                  : undefined
              }
              minimumDate={
                datePickerTarget === 'end' && startDateSelection
                  ? startDateSelection
                  : undefined
              }
              style={styles.datePicker}
            />

            {Platform.OS === 'ios' ? (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setDatePickerTarget(null)}
                  accessibilityRole="button"
                >
                  <Text style={styles.clearButtonText}>Vazgeç</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={confirmDateSelection}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryButtonText}>Tamam</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.androidCancelButton}
                onPress={() => setDatePickerTarget(null)}
                accessibilityRole="button"
              >
                <Text style={styles.clearButtonText}>Kapat</Text>
              </TouchableOpacity>
            )}
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
    paddingHorizontal: spacing.xl,
  },
  list: {
    flex: 1,
  },
header: {
  paddingTop: spacing.xl,
  paddingBottom: spacing.lg,
  gap: spacing.md,
},
  headerText: {
    gap: spacing.xs,
  },
title: {
  color: colors.text,
  fontSize: typography.heading,
  fontWeight: '800',
},
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
  },
qrButton: {
  width: 48,
  height: 48,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.primary,
  borderRadius: radii.md,
},
  qrButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
searchInput: {
  flex: 1,
  minWidth: 0,
  paddingVertical: spacing.md,
  color: colors.text,
  fontSize: typography.body,
},
filterSection: {
  gap: spacing.sm,
},
  filterLabel: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '700',
  },
  categoryList: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: colors.white,
  },
  categoryErrorContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  smallButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  smallButtonText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  availabilitySection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  dateHint: {
    color: colors.textSecondary,
    fontSize: typography.label,
  },
dateButton: {
  flex: 1,
  minWidth: 0,
  minHeight: 72,
  justifyContent: 'center',
  gap: spacing.sm,
  backgroundColor: colors.background,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: radii.md,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
},
  dateButtonTextContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  dateButtonLabel: {
  color: colors.textSecondary,
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 0.7,
},
dateButtonValue: {
  flexShrink: 1,
  color: colors.text,
  fontSize: typography.caption,
  fontWeight: '700',
},
  datePlaceholder: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  calendarIcon: {
    color: colors.primary,
    fontSize: 24,
    marginLeft: spacing.md,
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTick: {
    color: colors.white,
    fontWeight: '800',
  },
  availabilityToggleText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.label,
  },
  dateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
 primaryButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.xs,
  backgroundColor: colors.primary,
  borderRadius: radii.md,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
},

  primaryButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  clearButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  clearButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
resultsHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: spacing.xl,
  paddingBottom: spacing.md,
},
  resultsText: {
    color: colors.textSecondary,
    fontSize: typography.label,
  },
  inlineError: {
    color: colors.error,
    fontSize: typography.label,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.label,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  pageButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pageButtonDisabled: {
    opacity: 0.45,
  },
  pageButtonText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '700',
  },
  pageButtonTextDisabled: {
    color: colors.textSecondary,
  },
  pageIndicator: {
    color: colors.textSecondary,
    fontSize: typography.label,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
  },
  error: {
    color: colors.error,
    fontSize: typography.body,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  datePickerModal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  datePicker: {
    alignSelf: 'stretch',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  androidCancelButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

pageHeading: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.md,
  paddingTop: spacing.xl,
  paddingBottom: spacing.lg,
},
headingIcon: {
  width: 48,
  height: 48,
  borderRadius: radii.md,
  backgroundColor: colors.primarySoft,
  alignItems: 'center',
  justifyContent: 'center',
},
searchRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
},
searchContainer: {
  flex: 1,
  minWidth: 0,
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: radii.md,
  paddingHorizontal: spacing.md,
},
filterPanel: {
  marginTop: spacing.lg,
  padding: spacing.lg,
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radii.lg,
  gap: spacing.md,
},
panelHeading: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
},
panelHeadingIcon: {
  width: 38,
  height: 38,
  borderRadius: radii.md,
  backgroundColor: colors.primarySoft,
  alignItems: 'center',
  justifyContent: 'center',
},
panelHeadingText: {
  flex: 1,
  gap: spacing.xs,
},
panelTitle: {
  color: colors.text,
  fontSize: typography.body,
  fontWeight: '700',
},
panelSubtitle: {
  color: colors.textSecondary,
  fontSize: typography.caption,
},
filterDivider: {
  height: 1,
  backgroundColor: colors.border,
},
dateSectionHeading: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
},
dateRow: {
  flexDirection: 'row',
  gap: spacing.sm,
},
dateValueRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
},
dateErrorContainer: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: spacing.xs,
},
resultsTitle: {
  color: colors.text,
  fontSize: typography.body,
  fontWeight: '700',
},
resultsIcon: {
  width: 38,
  height: 38,
  borderRadius: radii.md,
  backgroundColor: colors.primarySoft,
  alignItems: 'center',
  justifyContent: 'center',
},

});