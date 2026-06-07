import { StyleSheet, Alert, type ViewStyle } from 'react-native';
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
  // F11.8/F20.10: el badge "PRONTO" era ilegible/ambiguo. Ahora la card se ve
  // disabled (opacidad reducida) y al tocar muestra un aviso "Pronto disponible".
  return (
    <AnimatedPressable
      onPress={disabled ? () => Alert.alert('', 'Pronto disponible') : onPress}
      scaleDown={0.95}
      style={[styles.card, disabled && styles.disabledCard, style]}
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
  disabledCard: { opacity: 0.4 },
  icon: { marginBottom: Spacing.sm },
  title: { fontSize: 16, marginBottom: Spacing.xs },
  disabledText: { color: Colors.textSecondary },
});
