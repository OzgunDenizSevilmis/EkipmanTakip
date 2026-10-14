
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Tarih bilinmiyor';
  }

  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function translateNotificationMessage(message: string) {
  const translations: Record<string, string> = {
    'Your reservation has been approved.':
      'Rezervasyonun onaylandı.',

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
    'İşlem Başarısız',
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

  if (
    notification.entity_type.toLowerCase() === 'reservation'
  ) {
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.helperText}>
          Bildirimler yükleniyor...
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          Bildirimler yüklenemedi
        </Text>

        <Text style={styles.helperText}>
          {error instanceof Error
            ? error.message
            : 'Beklenmeyen bir hata oluştu.'}
        </Text>

        <Pressable
          accessibilityRole="button"
          style={styles.retryButton}
          onPress={() => void refetch()}
        >
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bildirimler</Text>

        <Text style={styles.subtitle}>
          Rezervasyon ve zimmet işlemlerindeki güncellemeler.
        </Text>

        <View style={styles.summary}>
          <View style={styles.summaryIndicator} />
          <Text style={styles.summaryText}>
            {unreadCount > 0
              ? `${unreadCount} okunmamış bildirim`
              : 'Okunmamış bildirimin yok'}
          </Text>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isUnread = !item.read_at;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.message}. ${
                isUnread ? 'Okunmadı' : 'Okundu'
              }`}
              onPress={() => void handleNotificationPress(item)}
              style={({ pressed }) => [
                styles.card,
                isUnread && styles.unreadCard,
                pressed && styles.pressedCard,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.typeContainer}>
                  <Text style={styles.typeLabel}>
                    {getNotificationType(item.entity_type)}
                  </Text>

                  {isUnread ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        YENİ
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.statusDot,
                    !isUnread && styles.readDot,
                  ]}
                />
              </View>

              <Text style={styles.message}>
  {translateNotificationMessage(item.message)}
</Text>

              <View style={styles.cardFooter}>
                <Text style={styles.date}>
                  {formatDate(item.created_at)}
                </Text>

                <Text style={styles.actionText}>
                  {item.entity_type.toLowerCase() === 'reservation' ||
                  item.entity_type.toLowerCase() === 'loan'
                    ? 'İşlemlerime git →'
                    : isUnread
                      ? 'Okundu olarak işaretle →'
                      : 'Görüntülendi'}
                </Text>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={
          notifications.length > 0
            ? styles.listContent
            : styles.emptyContent
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              Henüz bildirimin yok
            </Text>
            <Text style={styles.emptyDescription}>
              Rezervasyon ve zimmet işlemlerinle ilgili güncellemeler
              burada görünecek.
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
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  summaryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
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
  },
  pressedCard: {
    opacity: 0.75,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeLabel: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  unreadBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  readDot: {
    backgroundColor: colors.border,
  },
  message: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  cardFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  date: {
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  actionText: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
  },
  errorTitle: {
    color: colors.error,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
  },
  retryText: {
    color: colors.white,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
