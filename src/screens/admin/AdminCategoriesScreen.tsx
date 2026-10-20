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

import type { Category } from '../../types/category';

import { categoryService } from '../../services/categoryService';
import { colors, radii, spacing, typography } from '../../theme';

export default function AdminCategoriesScreen() {
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(
    null,
  );

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
    if (saving) {
      return;
    }

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
        ? await categoryService.updateCategory(editingCategory.id, { name })
        : await categoryService.createCategory({ name });

      if (result.error) {
        throw result.error;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({
          queryKey: ['active-equipment-categories'],
        }),
      ]);

      setModalVisible(false);
      setEditingCategory(null);
      setCategoryName('');

      Alert.alert(
        'Başarılı',
        editingCategory
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
    if (changingStatusId) {
      return;
    }

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
          text: nextIsActive ? 'Aktifleştir' : 'Pasife Al',
          style: nextIsActive ? 'default' : 'destructive',
          onPress: () => void confirmCategoryStatus(category, nextIsActive),
        },
      ],
    );
  };

  const confirmCategoryStatus = async (
    category: Category,
    isActive: boolean,
  ) => {
    if (changingStatusId) {
      return;
    }

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
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({
          queryKey: ['active-equipment-categories'],
        }),
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
      ]);

      Alert.alert(
        'Başarılı',
        isActive ? 'Kategori aktifleştirildi.' : 'Kategori pasife alındı.',
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
          <View style={styles.cardTitleContainer}>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categoryId}>Kategori kaydı</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              item.isActive ? styles.activeBadge : styles.inactiveBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {item.isActive ? 'Aktif' : 'Pasif'}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isChanging || changingStatusId !== null}
            style={styles.editButton}
            onPress={() => openEditForm(item)}
          >
            <Text style={styles.editButtonText}>Düzenle</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isChanging || changingStatusId !== null}
            style={[
              item.isActive ? styles.deactivateButton : styles.activateButton,
              changingStatusId !== null && styles.disabledButton,
            ]}
            onPress={() => changeCategoryStatus(item)}
          >
            {isChanging ? (
              <ActivityIndicator
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
                {item.isActive ? 'Pasife Al' : 'Aktifleştir'}
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
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.helperText}>Kategoriler yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Kategoriler yüklenemedi.</Text>

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
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Kategori Yönetimi</Text>
          <Text style={styles.subtitle}>
            Kategorileri oluştur, düzenle ve durumlarını yönet.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={openCreateForm}
        >
          <Text style={styles.primaryButtonText}>+ Ekle</Text>
        </Pressable>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Pasife alınan kategoriler yeni ekipman oluştururken seçilemez.
          Kategoriye bağlı mevcut ekipman kayıtları korunur.
        </Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          categories.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Henüz kategori yok</Text>
            <Text style={styles.helperText}>
              İlk kategorini ekleyerek başlayabilirsin.
            </Text>
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
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={closeForm}
            >
              <Text style={styles.closeText}>Kapat</Text>
            </Pressable>
          </View>

          <View style={styles.formContent}>
            <Text style={styles.label}>Kategori adı *</Text>

            <TextInput
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Örn. Bilgisayar"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="sentences"
              autoCorrect={false}
              maxLength={100}
              editable={!saving}
              returnKeyType="done"
              onSubmitEditing={() => void saveCategory()}
              style={styles.input}
            />

            <Text style={styles.helperText}>
              Kategori adı en fazla 100 karakter olabilir.
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              style={[
                styles.primaryButton,
                styles.saveButton,
                saving && styles.disabledButton,
              ]}
              onPress={() => void saveCategory()}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {editingCategory
                    ? 'Değişiklikleri Kaydet'
                    : 'Kategoriyi Oluştur'}
                </Text>
              )}
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
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.label,
    marginTop: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.label,
    fontWeight: '700',
  },
  notice: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: typography.label,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitleContainer: {
    flex: 1,
  },
  categoryName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  categoryId: {
    color: colors.textSecondary,
    fontSize: typography.label,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
  },
  activeBadge: {
    backgroundColor: colors.primarySoft,
  },
  inactiveBadge: {
    backgroundColor: colors.border,
  },
  statusText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  editButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  editButtonText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  deactivateButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivateButtonText: {
    color: colors.error,
    fontSize: typography.label,
    fontWeight: '700',
  },
  activateButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateButtonText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.label,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: typography.body,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  closeText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  formContent: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '700',
    marginTop: spacing.sm,
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
  },
  saveButton: {
    marginTop: spacing.xl,
    minHeight: 48,
  },
});