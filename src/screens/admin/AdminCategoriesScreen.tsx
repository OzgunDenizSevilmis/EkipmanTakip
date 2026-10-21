import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { categoryService } from '../../services/categoryService';
import { colors, radii, spacing, typography } from '../../theme';
import type { Category } from '../../types/category';

export default function AdminCategoriesScreen() {
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] =
    useState<string | null>(null);

  const {
    data: categories = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const result = await categoryService.getCategories();

      if (result.error) {
        throw result.error;
      }

      return result.data ?? [];
    },
  });

  const activeCount = categories.filter(
    (category) => category.isActive,
  ).length;

  const inactiveCount = categories.length - activeCount;

  const openCreateForm = () => {
    setEditingCategory(null);
    setCategoryName('');
    setModalVisible(true);
  };

  const openEditForm = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setModalVisible(true);
  };

  const closeForm = () => {
    if (saving) return;

    setModalVisible(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const saveCategory = async () => {
    const name = categoryName.trim();

    if (!name) {
      Alert.alert('Eksik bilgi', 'Kategori adı zorunludur.');
      return;
    }

    if (name.length > 100) {
      Alert.alert(
        'Geçersiz kategori adı',
        'Kategori adı en fazla 100 karakter olabilir.',
      );
      return;
    }

    setSaving(true);

    try {
      const result = editingCategory
        ? await categoryService.updateCategory(editingCategory.id, {
            name,
          })
        : await categoryService.createCategory({ name });

      if (result.error) {
        throw result.error;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['categories'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['active-equipment-categories'],
        }),
      ]);

      const wasEditing = Boolean(editingCategory);

      setModalVisible(false);
      setEditingCategory(null);
      setCategoryName('');

      Alert.alert(
        'İşlem başarılı',
        wasEditing
          ? 'Kategori adı güncellendi.'
          : 'Yeni kategori oluşturuldu.',
      );
    } catch (saveError) {
      Alert.alert(
        'İşlem başarısız',
        saveError instanceof Error
          ? saveError.message
          : 'Kategori kaydedilirken bir hata oluştu.',
      );
    } finally {
      setSaving(false);
    }
  };

  const changeCategoryStatus = (category: Category) => {
    if (changingStatusId) return;

    const nextIsActive = !category.isActive;

    Alert.alert(
      nextIsActive ? 'Kategoriyi aktifleştir' : 'Kategoriyi pasife al',
      nextIsActive
        ? `“${category.name}” kategorisi yeniden aktif olacak.`
        : `“${category.name}” kategorisi yeni ekipman seçimlerinde kullanılamayacak. Mevcut ekipman kayıtları silinmeyecek.`,
      [
        {
          text: 'Vazgeç',
          style: 'cancel',
        },
        {
          text: nextIsActive ? 'Aktifleştir' : 'Pasife al',
          style: nextIsActive ? 'default' : 'destructive',
          onPress: () =>
            void confirmCategoryStatus(category, nextIsActive),
        },
      ],
    );
  };

  const confirmCategoryStatus = async (
    category: Category,
    isActive: boolean,
  ) => {
    if (changingStatusId) return;

    setChangingStatusId(category.id);

    try {
      const result = await categoryService.setCategoryActive(
        category.id,
        isActive,
      );

      if (result.error) {
        throw result.error;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['categories'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['active-equipment-categories'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['equipment'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['home'],
        }),
      ]);

      Alert.alert(
        'İşlem başarılı',
        isActive
          ? 'Kategori aktifleştirildi.'
          : 'Kategori pasife alındı.',
      );
    } catch (statusError) {
      Alert.alert(
        'İşlem başarısız',
        statusError instanceof Error
          ? statusError.message
          : 'Kategori durumu değiştirilirken bir hata oluştu.',
      );
    } finally {
      setChangingStatusId(null);
    }
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const isChanging = changingStatusId === item.id;

    return (
      <View style={styles.categoryCard}>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.categoryIcon,
              !item.isActive && styles.categoryIconInactive,
            ]}
          >
            <Text
              style={[
                styles.categoryIconText,
                !item.isActive && styles.categoryIconTextInactive,
              ]}
            >
              {item.name.trim().charAt(0).toLocaleUpperCase('tr-TR')}
            </Text>
          </View>

          <View style={styles.cardTitleContainer}>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categoryDescription}>
              Ekipman kategorisi
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              item.isActive ? styles.activeBadge : styles.inactiveBadge,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                item.isActive ? styles.activeDot : styles.inactiveDot,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                item.isActive ? styles.activeText : styles.inactiveText,
              ]}
            >
              {item.isActive ? 'Aktif' : 'Pasif'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isChanging || changingStatusId !== null}
            style={({ pressed }) => [
              styles.editButton,
              pressed && styles.pressedButton,
            ]}
            onPress={() => openEditForm(item)}
          >
            <Text style={styles.editButtonText}>Düzenle</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isChanging || changingStatusId !== null}
            style={({ pressed }) => [
              styles.statusActionButton,
              item.isActive
                ? styles.deactivateButton
                : styles.activateButton,
              pressed && styles.pressedButton,
              changingStatusId !== null && styles.disabledButton,
            ]}
            onPress={() => changeCategoryStatus(item)}
          >
            {isChanging ? (
              <ActivityIndicator
                size="small"
                color={item.isActive ? colors.error : colors.primary}
              />
            ) : (
              <Text
                style={
                  item.isActive
                    ? styles.deactivateButtonText
                    : styles.activateButtonText
                }
              >
                {item.isActive ? 'Pasife al' : 'Aktifleştir'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.helperText}>
          Kategoriler yükleniyor...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.stateIcon}>
          <Text style={styles.stateIconText}>!</Text>
        </View>
        <Text style={styles.stateTitle}>
          Kategoriler yüklenemedi
        </Text>
        <Text style={styles.helperText}>
          Kategori bilgileri alınırken bir hata oluştu.
        </Text>

        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => void refetch()}
        >
          <Text style={styles.primaryButtonText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          categories.length === 0 && styles.emptyList,
        ]}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerTextContainer}>
                <View style={styles.eyebrow}>
                  <View style={styles.eyebrowDot} />
                  <Text style={styles.eyebrowText}>
                    YÖNETİM PANELİ
                  </Text>
                </View>

                <Text style={styles.title}>Kategori Yönetimi</Text>
                <Text style={styles.subtitle}>
                  Ekipman kategorilerini oluştur, düzenle ve yönet.
                </Text>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <View style={styles.overviewTop}>
                <View style={styles.overviewTextContainer}>
                  <Text style={styles.overviewLabel}>
                    Toplam kategori
                  </Text>
                  <Text style={styles.overviewValue}>
                    {categories.length}
                  </Text>
                  <Text style={styles.overviewDescription}>
                    Tanımlı kategori sayısı
                  </Text>
                </View>

                <View style={styles.overviewIcon}>
                  <Text style={styles.overviewIconText}>K</Text>
                </View>
              </View>

              <View style={styles.overviewDivider} />

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <View style={styles.statLabelRow}>
                    <View style={styles.activeDot} />
                    <Text style={styles.statLabel}>Aktif</Text>
                  </View>
                  <Text style={styles.statValue}>{activeCount}</Text>
                </View>

                <View style={styles.statSeparator} />

                <View style={styles.statItem}>
                  <View style={styles.statLabelRow}>
                    <View style={styles.inactiveDot} />
                    <Text style={styles.statLabel}>Pasif</Text>
                  </View>
                  <Text style={styles.statValue}>{inactiveCount}</Text>
                </View>
              </View>
            </View>

            <View style={styles.notice}>
              <View style={styles.noticeIcon}>
                <Text style={styles.noticeIconText}>i</Text>
              </View>
              <Text style={styles.noticeText}>
                Pasif kategoriler yeni ekipman oluştururken seçilemez.
                Bu işlem mevcut ekipman kayıtlarını silmez.
              </Text>
            </View>

            <View style={styles.sectionHeader}>
              <View style={styles.sectionTextContainer}>
                <Text style={styles.sectionTitle}>
                  Kategoriler
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Kayıtlı kategorilerini buradan yönetebilirsin.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressedButton,
                ]}
                onPress={openCreateForm}
              >
                <Text style={styles.primaryButtonText}>+ Ekle</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>K</Text>
            </View>
            <Text style={styles.emptyTitle}>
              Henüz kategori yok
            </Text>
            <Text style={styles.emptyText}>
              İlk kategorini oluşturarak ekipmanlarını gruplandırmaya
              başlayabilirsin.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.emptyAction}
              onPress={openCreateForm}
            >
              <Text style={styles.emptyActionText}>
                İlk kategoriyi oluştur
              </Text>
            </Pressable>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeadingContainer}>
              <Text style={styles.modalEyebrow}>
                KATEGORİ İŞLEMLERİ
              </Text>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Kategoriyi düzenle' : 'Yeni kategori'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {editingCategory
                  ? 'Kategori adını güncelleyebilirsin.'
                  : 'Yeni bir ekipman kategorisi tanımla.'}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Formu kapat"
              disabled={saving}
              hitSlop={8}
              style={styles.closeButton}
              onPress={closeForm}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.formContent}>
            <Text style={styles.label}>Kategori adı *</Text>

            <TextInput
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Örn. Bilgisayar"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="sentences"
              autoCorrect={false}
              maxLength={100}
              editable={!saving}
              returnKeyType="done"
              onSubmitEditing={() => void saveCategory()}
              accessibilityLabel="Kategori adı"
              style={styles.input}
            />

            <View style={styles.inputFooter}>
              <Text style={styles.helperText}>
                Açıklayıcı ve anlaşılır bir kategori adı kullan.
              </Text>
              <Text style={styles.characterCount}>
                {categoryName.length}/100
              </Text>
            </View>

            <View style={styles.modalNotice}>
              <View style={styles.noticeIcon}>
                <Text style={styles.noticeIconText}>i</Text>
              </View>
              <Text style={styles.modalNoticeText}>
                Kategori adı zorunludur ve en fazla 100 karakter olabilir.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.saveButton,
                pressed && styles.pressedButton,
                saving && styles.disabledButton,
              ]}
              onPress={() => void saveCategory()}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {editingCategory
                    ? 'Değişiklikleri kaydet'
                    : 'Kategoriyi oluştur'}
                </Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              style={styles.cancelButton}
              onPress={closeForm}
            >
              <Text style={styles.cancelButtonText}>Vazgeç</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTextContainer: {
    flex: 1,
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
    fontWeight: '800',
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
  overviewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewTextContainer: {
    flex: 1,
  },
  overviewLabel: {
    color: colors.textSecondary,
    fontSize: typography.label,
    fontWeight: '600',
  },
  overviewValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  overviewDescription: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  overviewIcon: {
    width: 54,
    height: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewIconText: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '800',
  },
  overviewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  statSeparator: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  noticeIcon: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeIconText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  noticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTextContainer: {
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
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.label,
    fontWeight: '800',
    textAlign: 'center',
  },
  categoryCard: {
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
    gap: spacing.md,
  },
  categoryIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconInactive: {
    backgroundColor: colors.surfaceElevated,
  },
  categoryIconText: {
    color: colors.primary,
    fontSize: 21,
    fontWeight: '800',
  },
  categoryIconTextInactive: {
    color: colors.textSecondary,
  },
  cardTitleContainer: {
    flex: 1,
  },
  categoryName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  categoryDescription: {
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
    gap: spacing.xs,
  },
  activeBadge: {
    backgroundColor: colors.primarySoft,
  },
  inactiveBadge: {
    backgroundColor: colors.surfaceElevated,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
  },
  activeDot: {
    backgroundColor: colors.primary,
  },
  inactiveDot: {
    backgroundColor: colors.textSecondary,
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  activeText: {
    color: colors.primary,
  },
  inactiveText: {
    color: colors.textSecondary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '700',
  },
  statusActionButton: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivateButton: {
    borderColor: colors.error,
    backgroundColor: colors.errorBackground,
  },
  deactivateButtonText: {
    color: colors.error,
    fontSize: typography.label,
    fontWeight: '700',
  },
  activateButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  activateButtonText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  pressedButton: {
    opacity: 0.75,
  },
  disabledButton: {
    opacity: 0.55,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateIcon: {
    width: 54,
    height: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stateIconText: {
    color: colors.error,
    fontSize: 28,
    fontWeight: '800',
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    textAlign: 'center',
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 62,
    height: 62,
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
    fontSize: typography.label,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyAction: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  emptyActionText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '800',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeadingContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.label,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '700',
  },
  formContent: {
    padding: spacing.xl,
  },
  label: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    minHeight: 50,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  characterCount: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  modalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  modalNoticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 19,
  },
  saveButton: {
    minHeight: 50,
    marginTop: spacing.xl,
  },
  cancelButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: typography.label,
    fontWeight: '700',
  },
});