import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSizes, Fonts, Spacing, Radius } from '@/constants/theme';

// Los mismos 4 estados que define useTimer
type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

interface ControlsProps {
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

/**
 * Controls — Botones de acción del timer.
 *
 * Muestra un botón principal (Start/Pause/Resume) que cambia según el estado,
 * y un botón secundario de Reset que solo aparece cuando tiene sentido.
 */
export function Controls({ status, onStart, onPause, onReset }: ControlsProps) {

  // Determinamos qué texto y acción tiene el botón principal según el estado.
  // En 'finished' no hay acción principal — solo reset.
  const primaryAction = getPrimaryAction(status, onStart, onPause);

  // Reset solo se muestra cuando el timer está activo o terminó.
  // En 'idle' no tiene sentido resetear algo que no empezó.
  const showReset = status !== 'idle';

  return (
    <View style={styles.container}>
      {/* Botón principal — solo se renderiza si hay acción disponible */}
      {primaryAction && (
        <Pressable
          onPress={primaryAction.onPress}
          // Cambiamos opacidad al presionar para feedback táctil visual.
          // pressed es un booleano que React Native pasa al callback de style.
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryText}>{primaryAction.label}</Text>
        </Pressable>
      )}

      {/* Botón reset — estilo secundario (outline), más discreto */}
      {showReset && (
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [
            styles.resetButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.resetText}>RESET</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Decide el texto y la función del botón principal según el estado del timer.
 * Retorna null cuando no hay acción principal (estado 'finished').
 */
function getPrimaryAction(
  status: TimerStatus,
  onStart: () => void,
  onPause: () => void,
): { label: string; onPress: () => void } | null {
  switch (status) {
    case 'idle':
      return { label: 'START', onPress: onStart };
    case 'running':
      return { label: 'PAUSE', onPress: onPause };
    case 'paused':
      return { label: 'RESUME', onPress: onStart };
    case 'finished':
      // Cuando terminó, solo queda reset. No hay acción principal.
      return null;
  }
}

const styles = StyleSheet.create({
  // Los botones van en columna, centrados, con espacio entre ellos
  container: {
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 40,
  },
  // Botón principal: verde neón, ancho, bordes redondeados
  primaryButton: {
    backgroundColor: Colors.neonGreen,
    paddingVertical: Spacing.md,
    paddingHorizontal: 64,
    borderRadius: Radius.pill,          // Pill shape — bordes completamente redondos
    minWidth: 220,             // Ancho mínimo para que no cambie de tamaño entre estados
    alignItems: 'center',
  },
  // Texto del botón principal: negro sobre verde, bold
  primaryText: {
    color: Colors.textOnGreen,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.extraBold,
    letterSpacing: 3,          // Espaciado amplio = look industrial/premium
  },
  // Botón reset: sin fondo, solo borde verde (outline style)
  resetButton: {
    borderWidth: 2,
    borderColor: Colors.neonGreen,
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: Radius.pill,
    minWidth: 220,
    alignItems: 'center',
  },
  // Texto del reset: verde neón, más pequeño que el principal
  resetText: {
    color: Colors.neonGreen,
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    letterSpacing: 3,
  },
  // Feedback visual al presionar: baja la opacidad
  pressed: {
    opacity: 0.7,
  },
});
