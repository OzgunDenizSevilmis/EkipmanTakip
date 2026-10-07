import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EquipmentCard } from '../../components/EquipmentCard';
import { equipmentService } from '../../services/equipmentService';
import { colors, spacing, typography } from '../../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import type { AppStackParamList } from '../../navigation/AppStack';


export function EquipmentScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {
    data: equipment = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error: equipmentError } =
        await equipmentService.getEquipment();

      if (equipmentError) {
        throw equipmentError;
      }

      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>
          Ekipmanlar yükleniyor...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          Ekipmanlar yüklenemedi. Lütfen tekrar dene.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ekipmanlar</Text>

        <Text style={styles.subtitle}>
          Kullanılabilir ekipmanları görüntüle.
        </Text>
      </View>

      <FlatList
        data={equipment}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
<EquipmentCard
  equipment={item}
  onPress={() => {
    navigation.navigate('EquipmentDetail', {
      equipmentId: item.id,
        });
          }}
          />
        )}
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
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              Ekipman bulunamadı
            </Text>

            <Text style={styles.emptyText}>
              Henüz kayıtlı bir ekipman bulunmuyor.
            </Text>
          </View>
        }
      />
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },

  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.xs,
  },

  listContent: {
    paddingBottom: spacing.xl,
  },

  emptyList: {
    flexGrow: 1,
  },

  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
    marginTop: spacing.sm,
  },
});