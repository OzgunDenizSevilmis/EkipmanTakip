import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Equipment } from '../types/equipment';
import { colors, radii, spacing, typography } from '../theme';

type EquipmentCardProps = {
  equipment: Equipment;
  onPress: () => void;
};

function getLifecycleStatus(status: Equipment['lifecycle_status']) {
  switch (status) {
    case 'ACTIVE':
      return {
        label: 'Aktif',
        backgroundColor: '#153A34',
        textColor: '#53D6B0',
        icon: 'checkmark-circle-outline' as const,
      };
    case 'MAINTENANCE':
      return {
        label: 'Bakımda',
        backgroundColor: colors.errorBackground,
        textColor: colors.error,
        icon: 'construct-outline' as const,
      };
    case 'INACTIVE':
      return {
        label: 'Kullanım dışı',
        backgroundColor: colors.surfaceElevated,
        textColor: colors.textSecondary,
        icon: 'pause-circle-outline' as const,
      };
  }
}

export function EquipmentCard({ equipment, onPress }: EquipmentCardProps) {
  const status = getLifecycleStatus(equipment.lifecycle_status);
  const categoryName = equipment.categories?.[0]?.name;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${equipment.name}, ${status.label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="cube-outline" size={27} color={colors.primary} />
        </View>

        <View style={styles.mainContent}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>
              {equipment.name}
            </Text>

            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>

          <View style={styles.codeRow}>
            <Ionicons name="barcode-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.code} numberOfLines={1}>
              {equipment.code}
            </Text>
          </View>

          {categoryName || equipment.location ? (
            <View style={styles.metadata}>
              {categoryName ? (
                <View style={styles.metadataItem}>
                  <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.metadataText} numberOfLines={1}>
                    {categoryName}
                  </Text>
                </View>
              ) : null}

              {equipment.location ? (
                <View style={styles.metadataItem}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.metadataText} numberOfLines={1}>
                    {equipment.location}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.footer}>
            <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}>
              <Ionicons name={status.icon} size={13} color={status.textColor} />
              <Text style={[styles.statusText, { color: status.textColor }]}>{status.label}</Text>
            </View>

            <Text style={styles.detailHint}>Detayları gör</Text>
          </View>
        </View>
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
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.82,
    borderColor: colors.primary,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
    lineHeight: 22,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  code: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.caption,
  },
  metadata: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metadataText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: typography.label,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  detailHint: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '600',
  },
});
