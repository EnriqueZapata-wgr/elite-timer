/**
 * TareaRow — una fila del checklist del día (MB-20 Pieza 1).
 *
 * Los dos gestos, que son el corazón de la pieza, viven en useTareaGesto
 * (MB-20.1 los extrajo SIN cambiarlos para compartirlos con la card
 * editorial y el renglón de hechas):
 *   · Tap simple NAVEGA a la función.
 *   · Tap largo PALOMEA (o pregunta, si es experiencia) con retroalimentación
 *     en tres capas: el círculo se llena progresivamente (~350 ms), vibración
 *     al completarse, y la fila se atenúa. Soltar antes revierte el llenado.
 *
 * Con reduce motion el llenado se omite; el tap largo sigue funcionando.
 *
 * MB-20.1 (Pieza 2): la fila sigue compacta (AGENDA es la lente que se
 * opera); el mosaico del icono lleva el degradado de su sección
 * (accentColor desde APP_SECTION_COLORS). El gesto es el mismo de siempre.
 */
import { Pressable, View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import type { AppIconName } from '@/src/components/ui/app-icon-names';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius } from '@/constants/theme';
import { ATP_BRAND, TEXT, withOpacity } from '@/src/constants/brand';
import { useTareaGesto, LONG_PRESS_MS } from '@/src/components/hoy/useTareaGesto';
import type { Tarea } from '@/src/services/hoy/tareas-core';

export { LONG_PRESS_MS };

interface Props {
  tarea: Tarea;
  lens: 'tareas' | 'agenda';
  reducedMotion?: boolean;
  /** MB-20.1: color de sección (APP_SECTION_COLORS). Sin él, el de la tarea. */
  accentColor?: string;
  /** Tap simple: navegar a la función. */
  onNavigate: (t: Tarea) => void;
  /** Tap largo en fila palomeable (toggle on/off). */
  onPalomear: (t: Tarea) => void;
  /** Tap largo en experiencia: abre la paloma inteligente. */
  onExperiencia: (t: Tarea) => void;
  /** Acción inline (hidratación +250 ml). */
  onInline?: (t: Tarea) => void;
}

export function TareaRow({
  tarea, lens, reducedMotion, accentColor, onNavigate, onPalomear, onExperiencia, onInline,
}: Props) {
  const { fillStyle, handlePress, handlePressIn, handlePressOut, handleLongPress } =
    useTareaGesto(tarea, reducedMotion, { onNavigate, onPalomear, onExperiencia });

  const accent = accentColor || tarea.color || ATP_BRAND.lime;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      delayLongPress={LONG_PRESS_MS}
      accessibilityRole="button"
      accessibilityLabel={`${tarea.name}${tarea.completed ? ', hecha' : ''}`}
      style={({ pressed }) => [s.row, tarea.completed && s.rowDone, pressed && s.rowPressed]}
    >
      {lens === 'agenda' && (
        <EliteText style={s.time}>{tarea.time}</EliteText>
      )}

      {/* Círculo palomeable con llenado progresivo */}
      <View style={[s.check, { borderColor: tarea.completed ? ATP_BRAND.lime : withOpacity('#FFFFFF', 0.25) }]}>
        {tarea.completed ? (
          <View style={s.checkDone}>
            <Ionicons name="checkmark" size={13} color="#000" />
          </View>
        ) : (
          <Animated.View style={[s.checkFill, fillStyle]} />
        )}
      </View>

      {/* Mosaico del icono con el degradado de su sección (MB-20.1 · 2.3) */}
      <LinearGradient
        colors={[withOpacity(accent, 0.32), withOpacity(accent, 0.08)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.iconChip}
      >
        <AppIcon name={tarea.icon as AppIconName} size={16} color={accent} />
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <EliteText style={[s.name, tarea.completed && s.nameDone]}>{tarea.name}</EliteText>
        {tarea.meta ? <EliteText style={s.meta}>{tarea.meta}</EliteText> : null}
        {tarea.kind === 'quant' && tarea.progress != null && (
          <View style={s.track}>
            <View style={[s.trackFill, { width: `${Math.round(tarea.progress * 100)}%`, backgroundColor: accent }]} />
          </View>
        )}
      </View>

      {tarea.gesto === 'inline' && onInline && !tarea.completed ? (
        <Pressable
          onPress={() => { haptic.success(); onInline(tarea); }}
          hitSlop={8}
          style={({ pressed }) => [s.inlineBtn, pressed && { opacity: 0.6 }]}
          accessibilityLabel="Agregar 250 mililitros"
        >
          <EliteText style={s.inlineBtnText}>+250 ml</EliteText>
        </Pressable>
      ) : tarea.gesto === 'navegar' || tarea.gesto === 'experiencia' ? (
        <Ionicons name="chevron-forward" size={14} color={TEXT.muted} />
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 6,
  },
  rowDone: { opacity: 0.55 },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  time: {
    width: 42,
    color: TEXT.secondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkFill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ATP_BRAND.lime,
  },
  checkDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ATP_BRAND.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
  },
  nameDone: { textDecorationLine: 'line-through', color: TEXT.secondary },
  meta: {
    color: TEXT.muted,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    marginTop: 1,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 6,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: 2 },
  inlineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: withOpacity(ATP_BRAND.teal, 0.15),
    borderWidth: 0.5,
    borderColor: withOpacity(ATP_BRAND.teal, 0.4),
  },
  inlineBtnText: {
    color: ATP_BRAND.teal,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
  },
});
