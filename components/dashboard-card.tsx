import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { Colors, Spacing } from '@/constants/theme';

interface DashboardCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * DashboardCard — Card con spring animation al presionar.
 */
export function DashboardCard({
  icon,
  title,
  description,
  onPress,
  disabled = false,
  style,
}: DashboardCardProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      scaleDown={0.95}
      style={[styles.card, style]}
    >
      <Ionicons
        name={icon}
        size={28}
        color={disabled ? Colors.textSecondary : Colors.neonGreen}
        style={styles.icon}
      />
      <EliteText
        variant="subtitle"
        style={[styles.title, disabled && styles.disabledText]}
        numberOfLines={2}
      >
        {title}
      </EliteText>
      <EliteText variant="caption" numberOfLines={2}>
        {description}
      </EliteText>
      {disabled && (
        <View style={styles.badge}>
          <EliteText variant="caption" style={styles.badgeText}>PRONTO</EliteText>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: '#2A2A2A',
    minHeight: 150,
  },
  icon: { marginBottom: Spacing.sm },
  title: { fontSize: 16, marginBottom: Spacing.xs },
  disabledText: { color: Colors.textSecondary },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: '#2A2A2A',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { fontSize: 10, color: Colors.textSecondary },
});
