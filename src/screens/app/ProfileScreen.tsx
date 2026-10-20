
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MainTabParamList } from '../../navigation/MainTabs';
import type { AppStackParamList } from '../../navigation/AppStack';
import { authService } from '../../services/authService';
import { notificationService } from '../../services/notificationService';
import { colors, radii, spacing, typography } from '../../theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<AppStackParamList, 'Main'>
>;

export function ProfileScreen({ navigation }: Props) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const { data, error } = await authService.getCurrentProfile();

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: async () => {
      const { data, error } =
        await notificationService.getMyNotifications();

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const hasUnreadNotifications = notifications.some(
    (notification) => !notification.read_at,
  );

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const { error } = await authService.signOut();

      if (error) {
        Alert.alert(
          'Çıkış Başarısız',
          error.message || 'Oturum kapatılamadı.',
        );
      }
    } catch {
      Alert.alert('Çıkış Başarısız', 'Beklenmeyen bir hata oluştu.');
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isAdmin = profile?.role === 'ADMIN';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Profil</Text>
          <Text style={styles.subtitle}>
            Hesap bilgilerini ve hesap işlemlerini buradan yönet.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={
            hasUnreadNotifications
              ? 'Okunmamış bildirimler var'
              : 'Bildirimleri aç'
          }
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={colors.primary}
          />

          {hasUnreadNotifications ? (
            <View style={styles.notificationDot} />
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Ad Soyad</Text>
        <Text style={styles.value}>
          {profile?.full_name || 'Kullanıcı'}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Rol</Text>
        <Text style={styles.value}>
          {isAdmin ? 'Yönetici' : 'Kullanıcı'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleSignOut}
        disabled={isSigningOut}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {isSigningOut ? (
          <ActivityIndicator color={colors.error} />
        ) : (
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.xs,
  },
  notificationButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  value: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
