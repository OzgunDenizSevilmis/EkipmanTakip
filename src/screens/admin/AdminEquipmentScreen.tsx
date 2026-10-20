

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

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  View,

} from 'react-native';

import { equipmentService } from '../../services/equipmentService';

import type {
  Equipment,
  EquipmentCategory,
} from '../../types/equipment';
import type { EquipmentInput } from '../../services/equipmentService';



import { colors, radii, spacing, typography } from '../../theme';

type EquipmentForm = {

  code: string;

  name: string;

  categoryId: string;

  location: string;

  description: string;

};

const emptyForm: EquipmentForm = {

  code: '',

  name: '',

  categoryId: '',

  location: '',

  description: '',

};

export function AdminEquipmentScreen() {

  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);

  const [editingEquipment, setEditingEquipment] =

    useState<Equipment | null>(null);

  const [form, setForm] = useState<EquipmentForm>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [deactivatingEquipmentId, setDeactivatingEquipmentId] =
    useState<string | null>(null);

  const {

    data: equipment = [],

    isLoading,

    isRefetching,

    error,

    refetch,

  } = useQuery({

    queryKey: ['equipment'],

    queryFn: async () => {

      const { data, error: requestError } =

        await equipmentService.getEquipment();

      if (requestError) {

        throw requestError;

      }

      return data ?? [];

    },

  });

  const {

    data: categories = [],

    isLoading: categoriesLoading,

  } = useQuery({

    queryKey: ['active-equipment-categories'],

    queryFn: async () => {

      const { data, error: requestError } =

        await equipmentService.getActiveCategories();

      if (requestError) {

        throw requestError;

      }

      return data ?? [];

    },

  });

  const openCreateForm = () => {

    setEditingEquipment(null);

    setForm({

      ...emptyForm,

      categoryId: categories[0]?.id ?? '',

    });

    setModalVisible(true);

  };

  const openEditForm = (item: Equipment) => {

    setEditingEquipment(item);

    setForm({

      code: item.code,

      name: item.name,

      categoryId: item.category_id,

      location: item.location,

      description: item.description ?? '',

    });

    setModalVisible(true);

  };

  const closeForm = () => {

    if (saving) {

      return;

    }

    setModalVisible(false);

    setEditingEquipment(null);

    setForm(emptyForm);

  };

  const updateField = (

    field: keyof EquipmentForm,

    value: string,

  ) => {

    setForm((current) => ({

      ...current,

      [field]: value,

    }));

  };

  const saveEquipment = async () => {

    if (

      !form.code.trim() ||

      !form.name.trim() ||

      !form.categoryId ||

      !form.location.trim()

    ) {

      Alert.alert(

        'Eksik bilgi',

        'Kod, ad, kategori ve konum alanları zorunludur.',

      );

      return;

    }

    const input: EquipmentInput = {

      code: form.code,

      name: form.name,

      categoryId: form.categoryId,

      location: form.location,

      description: form.description,

    };

    setSaving(true);

    try {
      const result = editingEquipment

        ? await equipmentService.updateEquipment(

            editingEquipment.id,

            input,

          )

        : await equipmentService.createEquipment(input);

      if (result.error) {

  if (

    'code' in result.error &&

    result.error.code === '23505'

  ) {

    throw new Error(

      'Bu ekipman kodu zaten kullanılıyor. Farklı bir kod gir.',

    );

  }

  throw result.error;

}

      await queryClient.invalidateQueries({

        queryKey: ['equipment'],

      });

      await queryClient.invalidateQueries({

        queryKey: ['home'],

      });

      setModalVisible(false);

      setEditingEquipment(null);

      setForm(emptyForm);

      Alert.alert(

        'Başarılı',

        editingEquipment

          ? 'Ekipman bilgileri güncellendi.'

          : 'Yeni ekipman eklendi.',

      );

    } catch (saveError) {

      Alert.alert(

        'İşlem başarısız',

        saveError instanceof Error

          ? saveError.message

          : 'Ekipman kaydedilirken bir hata oluştu.',

      );

    } finally {

      setSaving(false);

    }

  };

  const deactivateEquipment = (item: Equipment) => {
    if (item.lifecycle_status !== 'ACTIVE' || deactivatingEquipmentId) {
      return;
    }

    Alert.alert(
      'Ekipmanı pasife al',
      `“${item.name}” (${item.code}) pasife alınacak. Devam etmek istiyor musun?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Pasife Al',
          style: 'destructive',
          onPress: () => void confirmDeactivateEquipment(item),
        },
      ],
    );
  };

  const confirmDeactivateEquipment = async (item: Equipment) => {
    if (deactivatingEquipmentId) return;

    setDeactivatingEquipmentId(item.id);

    try {
      const result = await equipmentService.deactivateEquipment(item.id);
      if (result.error) throw result.error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
      ]);

      Alert.alert('Başarılı', 'Ekipman pasife alındı.');
    } catch (deactivateError) {
      Alert.alert(
        'Pasife alma başarısız',
        deactivateError instanceof Error
          ? deactivateError.message
          : 'Ekipman pasife alınırken beklenmeyen bir hata oluştu.',
      );
    } finally {
      setDeactivatingEquipmentId(null);
    }
  };

  const renderEquipment = ({ item }: { item: Equipment }) => {

    const categoryName =

      item.categories?.[0]?.name ?? 'Kategori bulunamadı';

    return (

      <View style={styles.equipmentCard}>

        <View style={styles.cardHeader}>

          <View style={styles.cardTitleContainer}>

            <Text style={styles.equipmentName}>{item.name}</Text>

            <Text style={styles.equipmentCode}>{item.code}</Text>

          </View>

          <View

            style={[

              styles.statusBadge,

              item.lifecycle_status === 'ACTIVE'

                ? styles.activeBadge

                : item.lifecycle_status === 'MAINTENANCE'

                  ? styles.maintenanceBadge

                  : styles.inactiveBadge,

            ]}

          >

            <Text style={styles.statusText}>

              {item.lifecycle_status === 'ACTIVE'

                ? 'Aktif'

                : item.lifecycle_status === 'MAINTENANCE'

                  ? 'Bakımda'

                  : 'Pasif'}

            </Text>

          </View>

        </View>

        <Text style={styles.cardDetail}>

          Kategori: {categoryName}

        </Text>

        <Text style={styles.cardDetail}>

          Konum: {item.location}

        </Text>

        {item.description ? (

          <Text style={styles.description}>

            {item.description}

          </Text>

        ) : null}

        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            style={styles.editButton}
            onPress={() => openEditForm(item)}
          >
            <Text style={styles.editButtonText}>Düzenle</Text>
          </Pressable>

          {item.lifecycle_status === 'ACTIVE' ? (
            <Pressable
              accessibilityRole="button"
              disabled={deactivatingEquipmentId !== null}
              style={[
                styles.deactivateButton,
                deactivatingEquipmentId !== null && styles.disabledButton,
              ]}
              onPress={() => deactivateEquipment(item)}
            >
              {deactivatingEquipmentId === item.id ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <Text style={styles.deactivateButtonText}>Pasife Al</Text>
              )}
            </Pressable>
          ) : null}
        </View>

      </View>

    );

  };

  if (isLoading || categoriesLoading) {

    return (

      <View style={styles.center}>

        <ActivityIndicator color={colors.primary} />

        <Text style={styles.helperText}>

          Ekipmanlar yükleniyor...

        </Text>

      </View>

    );

  }

  if (error) {

    return (

      <View style={styles.center}>

        <Text style={styles.errorText}>

          Ekipmanlar yüklenemedi.

        </Text>

        <Pressable style={styles.primaryButton} onPress={() => refetch()}>

          <Text style={styles.primaryButtonText}>Tekrar dene</Text>

        </Pressable>

      </View>

    );

  }

  return (

    <View style={styles.container}>

      <View style={styles.header}>

        <View style={styles.headerTextContainer}>

          <Text style={styles.title}>Ekipman Yönetimi</Text>

          <Text style={styles.subtitle}>

            Ekipmanları ekle ve mevcut bilgileri düzenle.

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

      {categories.length === 0 ? (

        <View style={styles.notice}>

          <Text style={styles.noticeText}>

            Ekipman eklemek için önce en az bir aktif kategori

            oluşturulmalıdır.

          </Text>

        </View>

      ) : null}

      <FlatList

        data={equipment}

        keyExtractor={(item) => item.id}

        renderItem={renderEquipment}

        refreshControl={

          <RefreshControl

            refreshing={isRefetching}

            onRefresh={refetch}

            tintColor={colors.primary}

          />

        }

        contentContainerStyle={[

          styles.listContent,

          equipment.length === 0 && styles.emptyList,

        ]}

        showsVerticalScrollIndicator={false}

        ListEmptyComponent={

          <View style={styles.emptyContainer}>

            <Text style={styles.emptyTitle}>

              Henüz ekipman yok

            </Text>

            <Text style={styles.helperText}>

              İlk ekipmanını ekleyerek başlayabilirsin.

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

              {editingEquipment ? 'Ekipmanı Düzenle' : 'Yeni Ekipman'}

            </Text>

            <Pressable

              accessibilityRole="button"

              disabled={saving}

              onPress={closeForm}

            >

              <Text style={styles.closeText}>Kapat</Text>

            </Pressable>

          </View>

          <ScrollView

            contentContainerStyle={styles.formContent}

            keyboardShouldPersistTaps="handled"

          >

            <Text style={styles.label}>Ekipman kodu \*</Text>

            <TextInput

              value={form.code}

              onChangeText={(value) => updateField('code', value)}

              placeholder="Örn. LAP001"

              placeholderTextColor={colors.textSecondary}

              autoCapitalize="characters"

              style={styles.input}

              maxLength={50}

            />

            <Text style={styles.label}>Ekipman adı \*</Text>

            <TextInput

              value={form.name}

              onChangeText={(value) => updateField('name', value)}

              placeholder="Örn. Dizüstü bilgisayar"

              placeholderTextColor={colors.textSecondary}

              style={styles.input}

              maxLength={120}

            />

            <Text style={styles.label}>Kategori \*</Text>

            <View style={styles.categoryList}>

              {categories.map((category: EquipmentCategory) => (

                <Pressable

                  key={category.id}

                  accessibilityRole="button"

                  accessibilityState={{

                    selected: form.categoryId === category.id,

                  }}

                  onPress={() =>

                    updateField('categoryId', category.id)

                  }

                  style={[

                    styles.categoryOption,

                    form.categoryId === category.id &&

                      styles.selectedCategory,

                  ]}

                >

                  <Text

                    style={[

                      styles.categoryText,

                      form.categoryId === category.id &&

                        styles.selectedCategoryText,

                    ]}

                  >

                    {category.name}

                  </Text>

                </Pressable>

              ))}

            </View>

            <Text style={styles.label}>Konum \*</Text>

            <TextInput

              value={form.location}

              onChangeText={(value) => updateField('location', value)}

              placeholder="Örn. B Blok, 2. kat"

              placeholderTextColor={colors.textSecondary}

              style={styles.input}

              maxLength={200}

            />

            <Text style={styles.label}>Açıklama</Text>

            <TextInput

              value={form.description}

              onChangeText={(value) =>

                updateField('description', value)

              }

              placeholder="İsteğe bağlı açıklama"

              placeholderTextColor={colors.textSecondary}

              style={[styles.input, styles.multilineInput]}

              multiline

              textAlignVertical="top"

              maxLength={1000}

            />

            <Pressable

              accessibilityRole="button"

              disabled={saving || categories.length === 0}

              style={[

                styles.primaryButton,

                styles.saveButton,

                (saving || categories.length === 0) &&

                  styles.disabledButton,

              ]}

              onPress={saveEquipment}

            >

              {saving ? (

                <ActivityIndicator color={colors.white} />

              ) : (

                <Text style={styles.primaryButtonText}>

                  {editingEquipment

                    ? 'Değişiklikleri Kaydet'

                    : 'Ekipmanı Oluştur'}

                </Text>

              )}

            </Pressable>

          </ScrollView>

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

  listContent: {

    paddingBottom: spacing.xl,

    gap: spacing.md,

  },

  emptyList: {

    flexGrow: 1,

  },

  equipmentCard: {

    backgroundColor: colors.surface,

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radii.lg,

    padding: spacing.lg,

    gap: spacing.sm,

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

  equipmentName: {

    color: colors.text,

    fontSize: typography.body,

    fontWeight: '700',

  },

  equipmentCode: {

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

  maintenanceBadge: {

    backgroundColor: colors.border,

  },

  inactiveBadge: {

    backgroundColor: colors.border,

  },

  statusText: {

    color: colors.text,

    fontSize: typography.label,

    fontWeight: '600',

  },

  cardDetail: {

    color: colors.textSecondary,

    fontSize: typography.label,

  },

  description: {

    color: colors.text,

    fontSize: typography.label,

    lineHeight: 20,

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

  editButtonText: {

    color: colors.primary,

    fontSize: typography.label,

    fontWeight: '700',

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

    paddingBottom: spacing.xxl ?? spacing.xl,

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

  multilineInput: {

    minHeight: 100,

  },

  categoryList: {

    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: spacing.sm,

  },

  categoryOption: {

    borderWidth: 1,

    borderColor: colors.border,

    borderRadius: radii.md,

    paddingHorizontal: spacing.md,

    paddingVertical: spacing.sm,

    backgroundColor: colors.surface,

  },

  selectedCategory: {

    backgroundColor: colors.primary,

    borderColor: colors.primary,

  },

  categoryText: {

    color: colors.text,

    fontSize: typography.label,

  },

  selectedCategoryText: {

    color: colors.white,

    fontWeight: '700',

  },

  saveButton: {

    marginTop: spacing.xl,

    minHeight: 48,

  },

  disabledButton: {

    opacity: 0.6,

  },

});
