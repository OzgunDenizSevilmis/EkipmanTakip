import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '../../navigation/AppStack';
import { notificationService } from '../../services/notificationService';
import { colors, radii, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

type NotificationItem = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

type NotificationIcon = React.ComponentProps<typeof Ionicons>['name'];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Tarih bilinmiyor';
  }

  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function translateNotificationMessage(message: string) {
  const translations: Record<string, string> = {
    'Your reservation has been approved.': 'Rezervasyonun onaylandı.',
    'Your reserved equipment has been delivered.':
      'Rezerve ettiğin ekipman sana teslim edildi.',
    'Your reserved equipment has been returned.':
      'Ekipmanın iadesi tamamlandı.',
  };

  const rejectionPrefix = 'Your reservation has been rejected: ';

  if (message.startsWith(rejectionPrefix)) {
    return `Rezervasyonun reddedildi: ${message.slice(rejectionPrefix.length)}`;
  }

  return translations[message] ?? message;
}

function getNotificationType(entityType: string) {
  switch (entityType.toLowerCase()) {
    case 'reservation':
      return 'Rezervasyon';
    case 'loan':
      return 'Zimmet';
    case 'equipment':
      return 'Ekipman';
    case 'maintenance':
      return 'Bakım';
    default:
      return 'Bildirim';
  }
}

function getNotificationIcon(entityType: string): NotificationIcon {
  switch (entityType.toLowerCase()) {
    case 'reservation':
      return 'calendar-outline';
    case 'loan':
      return 'swap-horizontal-outline';
    case 'equipment':
      return 'cube-outline';
    case 'maintenance':
      return 'construct-outline';
    default:
      return 'notifications-outline';
  }
}

function getNotificationColor(entityType: string) {
  switch (entityType.toLowerCase()) {
    case 'maintenance':
      return colors.error;
    case 'loan':
      return '#53D6B0';
    default:
      return colors.primary;
  }
}

function NotificationCard({
  notification,
  onPress,
}: {
  notification: NotificationItem;
  onPress: () => void;
}) {
  const isUnread = !notification.read_at;
  const icon = getNotificationIcon(notification.entity_type);
  const iconColor = getNotificationColor(notification.entity_type);
  const entityType = notification.entity_type.toLowerCase();

  const canOpenRecord =
    entityType === 'reservation' || entityType === 'loan';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${translateNotificationMessage(notification.message)}. ${
        isUnread ? 'Okunmadı' : 'Okundu'
      }`}
      accessibilityState={{ selected: isUnread }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isUnread && styles.unreadCard,
        pressed && styles.pressedCard,
      ]}
    >
      <View style={styles.cardTop}>
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: isUnread ? colors.primarySoft : colors.surfaceElevated },
          ]}
        >
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>

        <View style={styles.cardMain}>
          <View style={styles.cardHeading}>
            <Text style={styles.typeLabel}>
              {getNotificationType(notification.entity_type)}
            </Text>

            {isUnread ? (
              <View style={styles.unreadBadge}>
                <View style={styles.unreadBadgeDot} />
                <Text style={styles.unreadBadgeText}>YENİ</Text>
              </View>
            ) : (
              <View style={styles.readBadge}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={13}
                  color={colors.textSecondary}
                />
                <Text style={styles.readBadgeText}>Okundu</Text>
              </View>
            )}
          </View>

          <Text style={styles.message}>
            {translateNotificationMessage(notification.message)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.dateContainer}>
          <Ionicons
            name="time-outline"
            size={15}
            color={colors.textSecondary}
          />
          <Text style={styles.date}>{formatDate(notification.created_at)}</Text>
        </View>

        <View style={styles.actionContainer}>
          <Text style={styles.actionText}>
            {canOpenRecord
              ? 'İşlemlerime git'
              : isUnread
                ? 'Okundu olarak işaretle'
                : 'Görüntülendi'}
          </Text>
          <Ionicons
            name={
              canOpenRecord
                ? 'arrow-forward'
                : isUnread
                  ? 'checkmark-outline'
                  : 'checkmark-done-outline'
            }
            size={16}
            color={colors.primary}
          />
        </View>
      </View>
    </Pressable>
  );
}

function EmptyNotifications() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="notifications-off-outline"
          size={34}
          color={colors.textSecondary}
        />
      </View>

      <Text style={styles.emptyTitle}>Henüz bildirimin yok</Text>
      <Text style={styles.emptyDescription}>
        Rezervasyon ve zimmet işlemlerinle ilgili güncellemeler burada
        görünecek. Yeni bir gelişme olduğunda buradan takip edebilirsin.
      </Text>
    </View>
  );
}

export default function AppNotificationsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useQuery<NotificationItem[]>({
    queryKey: ['my-notifications'],
    queryFn: async () => {
      const result = await notificationService.getMyNotifications();

      if (result.error) {
        throw result.error;
      }

      return (result.data ?? []) as NotificationItem[];
    },
  });

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at,
  ).length;

  async function handleNotificationPress(notification: NotificationItem) {
    if (!notification.read_at) {
      const result = await notificationService.markAsRead(notification.id);

      if (result.error) {
        console.error(
          'Bildirim okundu güncellenemedi:',
          result.error,
        );

        Alert.alert(
          'İşlem başarısız',
          `Bildirim güncellenemedi: ${result.error.message}`,
        );

        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ['my-notifications'],
      });
    }

    const message = notification.message.toLowerCase();
    const isLoanNotification =
      message.includes('delivered') || message.includes('returned');

    if (notification.entity_type.toLowerCase() === 'reservation') {
      navigation.navigate(
        'Main',
        {
          screen: 'MyActions',
          params: {
            highlightEntityType: isLoanNotification ? 'loan' : 'reservation',
            highlightEntityId: notification.entity_id,
          },
        } as never,
      );

      return;
    }

    Alert.alert(
      'Bildirim',
      'Bu bildirim için henüz doğrudan açılabilen bir ekran bulunmuyor.',
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <View style={styles.stateIcon}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={styles.stateTitle}>Bildirimlerin yükleniyor</Text>
        <Text style={styles.stateDescription}>
          Güncel bildirimlerin getiriliyor.
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={colors.error}
          />
        </View>

        <Text style={styles.stateTitle}>Bildirimler yüklenemedi</Text>
        <Text style={styles.stateDescription}>
          {error instanceof Error
            ? error.message
            : 'Beklenmeyen bir hata oluştu.'}
        </Text>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressedButton,
          ]}
          onPress={() => void refetch()}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.white} />
          <Text style={styles.retryText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            onPress={() => void handleNotificationPress(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerIcon}>
                <Ionicons
                  name="notifications-outline"
                  size={29}
                  color={colors.primary}
                />
              </View>

              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>GÜNCELLEMELER</Text>
                <Text style={styles.title}>Bildirimler</Text>
              </View>
            </View>

            <Text style={styles.subtitle}>
              Rezervasyon, zimmet ve ekipman işlemlerindeki gelişmeleri buradan
              takip edebilirsin.
            </Text>

            <View style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryIcon,
                  unreadCount === 0 && styles.summaryIconRead,
                ]}
              >
                <Ionicons
                  name={
                    unreadCount > 0
                      ? 'mail-unread-outline'
                      : 'checkmark-done-outline'
                  }
                  size={22}
                  color={unreadCount > 0 ? colors.primary : '#53D6B0'}
                />
              </View>

              <View style={styles.summaryContent}>
                <Text style={styles.summaryValue}>
                  {unreadCount > 0
                    ? `${unreadCount} okunmamış bildirim`
                    : 'Tüm bildirimlerin okundu'}
                </Text>
                <Text style={styles.summaryDescription}>
                  {notifications.length} toplam bildirim
                </Text>
              </View>

              {unreadCount > 0 ? (
                <View style={styles.summaryCount}>
                  <Text style={styles.summaryCountText}>{unreadCount}</Text>
                </View>
              ) : (
                <Ionicons
                  name="checkmark-circle"
                  size={23}
                  color="#53D6B0"
                />
              )}
            </View>

            <View style={styles.listHeading}>
              <Text style={styles.listTitle}>Son bildirimler</Text>
              <Text style={styles.listCount}>
                {notifications.length} kayıt
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyNotifications />}
        ListFooterComponent={
          notifications.length > 0 ? (
            <View style={styles.bottomNote}>
              <Ionicons
                name="refresh-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.bottomNoteText}>
                Güncel bildirimler için ekranı aşağı çek.
              </Text>
            </View>
          ) : null
        }
      />
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
    paddingBottom: spacing.xl,
  },
  emptyContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
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
    marginTop: spacing.md,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
  },
  summaryIconRead: {
    backgroundColor: '#153A34',
  },
  summaryContent: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  summaryDescription: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  summaryCount: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCountText: {
    color: colors.white,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  listTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
  },
  listCount: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  unreadCard: {
    borderColor: colors.primary,
    backgroundColor: '#111D33',
  },
  pressedCard: {
    opacity: 0.8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  unreadBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  unreadBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  readBadgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  message: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 23,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  date: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  actionText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  bottomNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  bottomNoteText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  errorIcon: {
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
    textAlign: 'center',
  },
  stateDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
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
  retryText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
  pressedButton: {
    opacity: 0.82,
  },
});