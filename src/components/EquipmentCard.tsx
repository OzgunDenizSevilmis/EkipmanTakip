import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Equipment } from '../types/equipment';
import { colors, radii, spacing, typography } from '../theme';

type EquipmentCardProps = {
  equipment: Equipment;
  onPress: () => void;
};

function getLifecycleStatusLabel(
  status: Equipment['lifecycle_status'],
) {
  switch (status) {
    case 'ACTIVE':
      return 'Aktif';

    case 'MAINTENANCE':
      return 'Bakımda';

    case 'INACTIVE':
      return 'Kullanım Dışı';
  }
}

function getLifecycleStatusStyle(
  status: Equipment['lifecycle_status'],
) {
  switch (status) {
    case 'ACTIVE':
      return {
        backgroundColor: colors.primarySoft,
        textColor: colors.primary,
      };

    case 'MAINTENANCE':
      return {
        backgroundColor: colors.errorBackground,
        textColor: colors.error,
      };

    case 'INACTIVE':
      return {
        backgroundColor: colors.surfaceElevated,
        textColor: colors.textSecondary,
      };
  }
}

export function EquipmentCard({
  equipment,
  onPress,
}: EquipmentCardProps) {
  const statusStyle = getLifecycleStatusStyle(
    equipment.lifecycle_status,
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {equipment.name}
          </Text>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusStyle.backgroundColor,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: statusStyle.textColor,
                },
              ]}
            >
              {getLifecycleStatusLabel(equipment.lifecycle_status)}
            </Text>
          </View>
        </View>

        <Text style={styles.code}>{equipment.code}</Text>

      {equipment.categories?.[0]?.name ? (
  <Text style={styles.category} numberOfLines={1}>
    {equipment.categories[0].name}
  </Text>
) : null}


        {equipment.location ? (
          <Text style={styles.location} numberOfLines={1}>
            {equipment.location}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },

  pressed: {
    opacity: 0.75,
  },

  content: {
    padding: spacing.lg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  name: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },

  code: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },

  category: {
    color: colors.textSecondary,
    fontSize: typography.label,
    marginTop: spacing.xs,
  },

  location: {
    color: colors.textSecondary,
    fontSize: typography.label,
    marginTop: spacing.md,
  },

  statusBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  statusText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
});