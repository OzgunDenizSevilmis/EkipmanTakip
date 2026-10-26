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

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
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
      const { data, error } = await notificationService.getMyNotifications();

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const hasUnreadNotifications = notifications.some((notification) => !notification.read_at);

  const isAdmin = profile?.role === 'ADMIN';
  const fullName = profile?.full_name || 'Kullanıcı';
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('');

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      const { error } = await authService.signOut();

      if (error) {
        Alert.alert('Çıkış başarısız', error.message || 'Oturum kapatılamadı.');
      }
    } catch {
      Alert.alert('Çıkış başarısız', 'Beklenmeyen bir hata oluştu.');
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
        <Text style={styles.loadingText}>Profil bilgileri yükleniyor...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <View style={styles.stateIcon}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
        </View>
        <Text style={styles.stateTitle}>Profil yüklenemedi</Text>
        <Text style={styles.stateDescription}>Hesap bilgileri alınırken bir sorun oluştu.</Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color={colors.white} />
          <Text style={styles.retryButtonText}>Tekrar dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>HESABIM</Text>
          <Text style={styles.title}>Profil</Text>
          <Text style={styles.subtitle}>Hesap bilgilerini ve tercihlerini buradan yönet.</Text>
        </View>

        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={
            hasUnreadNotifications ? 'Okunmamış bildirimler var' : 'Bildirimleri aç'
          }
        >
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />

          {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
        </TouchableOpacity>
      </View>

      <View style={styles.profileHero}>
        <View style={styles.avatar}>
          {initials ? (
            <Text style={styles.avatarText}>{initials}</Text>
          ) : (
            <Ionicons name="person-outline" size={36} color={colors.primary} />
          )}
        </View>

        <Text style={styles.profileName}>{fullName}</Text>
        <Text style={styles.profileCaption}>EkipmanTakip hesabı</Text>

        <View style={[styles.roleBadge, isAdmin ? styles.adminRoleBadge : styles.userRoleBadge]}>
          <Ionicons
            name={isAdmin ? 'shield-checkmark-outline' : 'person-outline'}
            size={15}
            color={isAdmin ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.roleText, isAdmin ? styles.adminRoleText : styles.userRoleText]}>
            {isAdmin ? 'Yönetici' : 'Kullanıcı'}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionTitle}>Hesap bilgileri</Text>
          <Text style={styles.sectionSubtitle}>Kayıtlı profil bilgilerin</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.label}>Ad soyad</Text>
            <Text style={styles.value}>{fullName}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.label}>Hesap rolü</Text>
            <Text style={styles.value}>{isAdmin ? 'Yönetici' : 'Kullanıcı'}</Text>
          </View>

          <View style={styles.roleIndicator}>
            <Ionicons
              name={isAdmin ? 'checkmark-circle' : 'person-circle'}
              size={19}
              color={colors.primary}
            />
          </View>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Ionicons name="settings-outline" size={21} color={colors.primary} />
        </View>
        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionTitle}>Hesap işlemleri</Text>
          <Text style={styles.sectionSubtitle}>Bildirimlerini ve oturumunu yönet.</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => navigation.navigate('Notifications')}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <View style={styles.actionIcon}>
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          {hasUnreadNotifications ? <View style={styles.actionNotificationDot} /> : null}
        </View>

        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>Bildirimler</Text>
          <Text style={styles.actionDescription}>
            Rezervasyon ve ekipman bildirimlerini görüntüle.
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={19} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logoutButton, isSigningOut && styles.logoutButtonDisabled]}
        onPress={handleSignOut}
        disabled={isSigningOut}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {isSigningOut ? (
          <>
            <ActivityIndicator color={colors.error} />
            <Text style={styles.logoutButtonText}>Çıkış yapılıyor...</Text>
          </>
        ) : (
          <>
            <Ionicons name="log-out-outline" size={21} color={colors.error} />
            <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.footerText}>
          Hesap işlemlerin güvenli oturumun üzerinden yürütülür.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
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
    lineHeight: 22,
    marginTop: spacing.sm,
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
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  profileHero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '700',
  },
  profileName: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileCaption: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
  },
  adminRoleBadge: {
    backgroundColor: colors.primarySoft,
  },
  userRoleBadge: {
    backgroundColor: colors.surfaceElevated,
  },
  roleText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  adminRoleText: {
    color: colors.primary,
  },
  userRoleText: {
    color: colors.textSecondary,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  sectionHeadingText: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    gap: spacing.xs,
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
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  roleIndicator: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  actionIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    position: 'relative',
  },
  actionNotificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  actionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  actionTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  actionDescription: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  logoutButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  logoutButtonDisabled: {
    opacity: 0.65,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  footerText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    marginTop: spacing.md,
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  stateTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  stateDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
