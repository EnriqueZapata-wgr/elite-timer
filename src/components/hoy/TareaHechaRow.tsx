/**
 * TareaHechaRow (MB-20.1 · 1.3) — el renglón compacto de una tarea hecha.
 *
 * Decisión explícita de Enrique: la fila colapsada CONSERVA SU COLOR de
 * sección, no se va a gris. La paloma se pinta del color de la sección, el
 * nombre va tachado y el dato de cierre queda a la derecha. Así el bloque
 * HECHAS se lee como una cinta de colores del día.
 *
 * Los gestos son los del contrato único (useTareaGesto, ajuste MB-20.4):
 * un toque destacha si la tarea es palomeable — deshacer cuesta lo mismo
 * que hacer (Pieza 4.1) — y en las demás (su check nace de actividad real)
 * el toque abre la función.
 */
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Fonts, FontSizes, Radius } from '@/constants/theme';
import { TEXT_COLORS } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { useTareaGesto, LONG_PRESS_MS } from '@/src/components/hoy/useTareaGesto';
import type { Tarea } from '@/src/services/hoy/tareas-core';

interface Props {
  tarea: Tarea;
  /** Color de su sección (APP_SECTION_COLORS via seccionForTarea). */
  sectionColor: string;
  /** Dato de cierre ("12 min", "5.2 km · 32 min", "3 de 5"). Sin él, solo
   * el nombre tachado — nunca el electrón (+2 e-), que es economía. */
  dato?: string;
  /** Abrir la función (tap en las no palomeables; tap largo en palomeables). */
  onNavigate: (t: Tarea) => void;
  /** Tap simple: destachar (si es palomeable). */
  onPalomear: (t: Tarea) => void;
}

export function TareaHechaRow({
  tarea, sectionColor, dato, onNavigate, onPalomear,
}: Props) {
  const { handlePress, handlePressIn, handleLongPress } =
    useTareaGesto(tarea, { onNavigate, onPalomear });
  // MB-31B: texto del scope; el color de sección de la paloma es identidad
  // (la cinta del día) y el negro encima es doctrina de relleno de sección.
  const t = useSurfaceTokens();

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onLongPress={handleLongPress}
      delayLongPress={LONG_PRESS_MS}
      accessibilityRole="button"
      accessibilityLabel={`${tarea.name}, hecha`}
      style={({ pressed }) => [s.row, pressed && { backgroundColor: t.kind === 'dark' ? 'rgba(255,255,255,0.06)' : t.hundido }]}
    >
      {/* La paloma en el color de su sección: la cinta del día. */}
      <View style={[s.check, { backgroundColor: sectionColor }]}>
        <Ionicons name="checkmark" size={12} color={TEXT_COLORS.onAccent} />
      </View>
      <EliteText style={[s.name, { color: t.textoSecundario }]} numberOfLines={1}>{tarea.name}</EliteText>
      {dato ? <EliteText style={[s.dato, { color: t.textoSecundario }]}>{dato}</EliteText> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    marginBottom: 2,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    textDecorationLine: 'line-through',
  },
  dato: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    fontVariant: ['tabular-nums'],
  },
});
