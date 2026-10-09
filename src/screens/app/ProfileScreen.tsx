
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MainTabParamList } from '../../navigation/MainTabs';
import type { AppStackParamList } from '../../navigation/AppStack';
import { authService } from '../../services/authService';
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

  async function handleSignOut() {
    setIsSigningOut(true);

    const { error } = await authService.signOut();

    setIsSigningOut(false);

    if (error) {
      Alert.alert(
        'Çıkış Başarısız',
        error.message || 'Oturum kapatılamadı.',
      );
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>

        <Text style={styles.subtitle}>
          Hesap bilgilerini ve hesap işlemlerini buradan yönet.
        </Text>
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

      {isAdmin ? (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => navigation.navigate('AdminReservations')}
        >
          <Text style={styles.adminButtonText}>
            Rezervasyon Yönetimi
          </Text>

          <Text style={styles.adminButtonDescription}>
            Kullanıcı rezervasyonlarını onayla veya reddet.
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleSignOut}
        disabled={isSigningOut}
      >
        {isSigningOut ? (
          <ActivityIndicator color={colors.error} />
        ) : (
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },

  header: {
    marginBottom: spacing.lg,
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

  adminButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },

  adminButtonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '700',
  },

  adminButtonDescription: {
    color: colors.background,
    fontSize: typography.caption,
    marginTop: spacing.xs,
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
