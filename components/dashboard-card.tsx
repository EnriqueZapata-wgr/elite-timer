import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface DashboardCardProps {
  /** Nombre del ícono de Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Título de la card */
  title: string;
  /** Descripción breve */
  description: string;
  /** Callback al presionar */
  onPress: () => void;
  /** Si la card está deshabilitada (próximamente) */
  disabled?: boolean;
  /** Estilos adicionales del contenedor */
  style?: ViewStyle;
}

/**
 * DashboardCard — Card de navegación para el Home/Dashboard.
 *
 * Muestra un ícono, título y descripción sobre fondo surface (#111).
 * Las cards deshabilitadas tienen opacidad reducida y badge "PRONTO".
 *
 * Ejemplo:
 *   <DashboardCard
 *     icon="timer-outline"
 *     title="Programas Estándar"
 *     description="Tabata, HIIT y más"
 *     onPress={() => router.push('/timer')}
 *   />
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
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {/* Ícono principal — verde si activo, gris si deshabilitado */}
      <Ionicons
        name={icon}
        size={28}
        color={disabled ? Colors.textSecondary : Colors.neonGreen}
        style={styles.icon}
      />

      {/* Título de la card */}
      <EliteText
        variant="subtitle"
        style={[styles.title, disabled && styles.disabledText]}
        numberOfLines={2}
      >
        {title}
      </EliteText>

      {/* Descripción breve */}
      <EliteText variant="caption" numberOfLines={2}>
        {description}
      </EliteText>

      {/* Badge "PRONTO" para features que aún no están disponibles */}
      {disabled && (
        <View style={styles.badge}>
          <EliteText variant="caption" style={styles.badgeText}>
            PRONTO
          </EliteText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Card base — fondo surface oscuro, bordes sutiles, esquinas redondeadas
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    minHeight: 150,
  },
  // Ícono con espacio inferior
  icon: {
    marginBottom: Spacing.sm,
  },
  // Título más pequeño que subtitle default para caber en la card
  title: {
    fontSize: 16,
    marginBottom: Spacing.xs,
  },
  // Estado deshabilitado — opacidad reducida
  disabled: {
    opacity: 0.45,
  },
  // Texto deshabilitado — color gris
  disabledText: {
    color: Colors.textSecondary,
  },
  // Feedback visual al presionar — borde verde
  pressed: {
    opacity: 0.7,
    borderColor: Colors.neonGreen,
  },
  // Badge "PRONTO" — esquina superior derecha
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  // Texto del badge — pequeño y sutil
  badgeText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});
