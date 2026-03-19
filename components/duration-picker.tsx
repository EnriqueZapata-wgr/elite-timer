import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface DurationPickerProps {
  /** Duración actual en segundos */
  value: number;
  /** Callback cuando cambia el valor */
  onChange: (seconds: number) => void;
  /** Mínimo en segundos (default: 5) */
  min?: number;
  /** Máximo en segundos (default: 600) */
  max?: number;
  /** Paso de incremento en segundos (default: 5) */
  step?: number;
}

/**
 * DurationPicker — Stepper +/- para seleccionar duración en MM:SS.
 * Incrementos de 5 segundos por defecto.
 */
export function DurationPicker({
  value,
  onChange,
  min = 5,
  max = 600,
  step = 5,
}: DurationPickerProps) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <View style={styles.container}>
      {/* Botón decrementar */}
      <Pressable
        onPress={decrement}
        disabled={value <= min}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons
          name="remove"
          size={20}
          color={value <= min ? Colors.textSecondary : Colors.neonGreen}
        />
      </Pressable>

      {/* Display MM:SS */}
      <View style={styles.display}>
        <EliteText variant="subtitle" style={styles.time}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </EliteText>
      </View>

      {/* Botón incrementar */}
      <Pressable
        onPress={increment}
        disabled={value >= max}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons
          name="add"
          size={20}
          color={value >= max ? Colors.textSecondary : Colors.neonGreen}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    borderColor: Colors.neonGreen,
    opacity: 0.7,
  },
  display: {
    minWidth: 70,
    alignItems: 'center',
  },
  time: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
