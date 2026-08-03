/**
 * TareaRow — una fila del checklist del día (MB-20 Pieza 1).
 *
 * Los dos gestos, que son el corazón de la pieza:
 *   · Tap simple NAVEGA a la función.
 *   · Tap largo PALOMEA (o pregunta, si es experiencia) con retroalimentación
 *     en tres capas: el círculo se llena progresivamente (~350 ms), vibración
 *     al completarse, y la fila se atenúa. Soltar antes revierte el llenado.
 *
 * Con reduce motion el llenado se omite; el tap largo sigue funcionando.
 */
import { useRef } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import type { AppIconName } from '@/src/components/ui/app-icon-names';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius } from '@/constants/theme';
import { ATP_BRAND, TEXT, withOpacity } from '@/src/constants/brand';
import type { Tarea } from '@/src/services/hoy/tareas-core';

export const LONG_PRESS_MS = 350;

interface Props {
  tarea: Tarea;
  lens: 'tareas' | 'agenda';
  reducedMotion?: boolean;
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
  tarea, lens, reducedMotion, onNavigate, onPalomear, onExperiencia, onInline,
}: Props) {
  const fill = useSharedValue(0);
  // El tap largo consumió este ciclo de press: el onPress del release se ignora.
  const consumedRef = useRef(false);

  const llenable = !tarea.completed && (tarea.gesto === 'palomear' || tarea.gesto === 'experiencia');
  const destachable = tarea.completed && tarea.gesto === 'palomear';

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fill.value }],
    opacity: fill.value,
  }));

  function handlePressIn() {
    consumedRef.current = false;
    if (reducedMotion) return;
    if (llenable || destachable) {
      fill.value = withTiming(1, { duration: LONG_PRESS_MS });
    }
  }

  function handlePressOut() {
    if (!consumedRef.current) {
      cancelAnimation(fill);
      fill.value = withTiming(0, { duration: 150 });
    }
  }

  function handleLongPress() {
    consumedRef.current = true;
    fill.value = 0;
    if (tarea.gesto === 'palomear') {
      haptic.success();
      onPalomear(tarea);
      return;
    }
    if (tarea.gesto === 'experiencia' && !tarea.completed) {
      haptic.medium();
      onExperiencia(tarea);
      return;
    }
    // navegar / inline / experiencia completada: el tap largo nunca regala
    // un check — se comporta como el tap.
    haptic.light();
    onNavigate(tarea);
  }

  function handlePress() {
    if (consumedRef.current) { consumedRef.current = false; return; }
    haptic.light();
    onNavigate(tarea);
  }

  const accent = tarea.color || ATP_BRAND.lime;

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

      <View style={[s.iconChip, { backgroundColor: withOpacity(accent, 0.14) }]}>
        <AppIcon name={tarea.icon as AppIconName} size={16} color={accent} />
      </View>

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
