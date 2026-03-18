import { View, Text, Pressable, StyleSheet } from 'react-native';
import { INTERVALS, type IntervalOption } from '@/constants/intervals';
import { Colors, FontSizes, Fonts, Spacing, Radius } from '@/constants/theme';

interface IntervalSelectorProps {
  selectedId: string;                          // Id del intervalo actualmente seleccionado
  onSelect: (interval: IntervalOption) => void; // Callback cuando el usuario toca un chip
}

/**
 * IntervalSelector — Fila de chips para elegir el intervalo del timer.
 *
 * Cada chip muestra un intervalo preconfigurado. El seleccionado se pinta
 * con fondo verde neón; los demás quedan con borde (outline).
 * Los deshabilitados aparecen con opacidad reducida y no responden al toque.
 */
export function IntervalSelector({ selectedId, onSelect }: IntervalSelectorProps) {
  return (
    <View style={styles.container}>
      {INTERVALS.map((interval) => {
        // ¿Este chip es el actualmente seleccionado?
        const isSelected = interval.id === selectedId;

        return (
          <Pressable
            key={interval.id}
            // Si está deshabilitado, no ejecuta nada al presionar.
            onPress={() => interval.enabled && onSelect(interval)}
            style={({ pressed }) => [
              styles.chip,
              // Si está seleccionado: fondo verde. Si no: solo borde.
              isSelected ? styles.chipSelected : styles.chipDefault,
              // Opacidad reducida para chips deshabilitados
              !interval.enabled && styles.chipDisabled,
              // Feedback visual al presionar (solo si está habilitado)
              pressed && interval.enabled && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                // Texto negro sobre fondo verde cuando está seleccionado,
                // verde sobre fondo transparente cuando no lo está.
                isSelected ? styles.chipTextSelected : styles.chipTextDefault,
              ]}
            >
              {interval.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fila horizontal que permite wrapping si no caben todos los chips
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  // Estilo base compartido por todos los chips
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radius.lg,          // Pill shape, igual que los botones de Controls
    borderWidth: 1.5,
  },
  // Chip seleccionado: fondo verde sólido
  chipSelected: {
    backgroundColor: Colors.neonGreen,
    borderColor: Colors.neonGreen,
  },
  // Chip no seleccionado: transparente con borde verde
  chipDefault: {
    backgroundColor: 'transparent',
    borderColor: Colors.neonGreen,
  },
  // Chip deshabilitado: baja opacidad para indicar que no es interactivo
  chipDisabled: {
    opacity: 0.3,
  },
  // Estilo base del texto
  chipText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  // Texto cuando el chip está seleccionado: negro sobre verde
  chipTextSelected: {
    color: Colors.textOnGreen,
  },
  // Texto cuando el chip NO está seleccionado: verde sobre transparente
  chipTextDefault: {
    color: Colors.neonGreen,
  },
  // Feedback táctil al presionar
  pressed: {
    opacity: 0.7,
  },
});
