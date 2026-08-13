/**
 * TareaRow — una fila del checklist del día (MB-20 Pieza 1).
 *
 * Los gestos viven en useTareaGesto (un solo lugar para la fila, la card
 * editorial y el renglón de hechas). MB-20.5: el TAP hace LA ACCIÓN
 * PRINCIPAL de la fila — palomear o navegar — y el tap largo solo es atajo
 * a la función en palomear, con vibración al cruzar el umbral.
 *
 * MB-20.1 (Pieza 2): la fila sigue compacta (AGENDA es la lente que se
 * opera); el mosaico del icono lleva el degradado de su sección
 * (accentColor desde APP_SECTION_COLORS).
 */
import { Pressable, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import type { AppIconName } from '@/src/components/ui/app-icon-names';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius } from '@/constants/theme';
import { ATP_BRAND, TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { useTareaGesto, LONG_PRESS_MS } from '@/src/components/hoy/useTareaGesto';
import type { Tarea } from '@/src/services/hoy/tareas-core';

export { LONG_PRESS_MS };

interface Props {
  tarea: Tarea;
  lens: 'tareas' | 'agenda';
  /** MB-20.1: color de sección (APP_SECTION_COLORS). Sin él, el de la tarea. */
  accentColor?: string;
  /** Navegar a la función (tap en navegar/inline; tap largo como atajo en
   * palomear). */
  onNavigate: (t: Tarea) => void;
  /** Tap simple en fila palomeable (toggle on/off). */
  onPalomear: (t: Tarea) => void;
  /** Captura inline de hidratación (deltaMl con signo). */
  onInline?: (t: Tarea, deltaMl: number) => void;
}

export function TareaRow({
  tarea, lens, accentColor, onNavigate, onPalomear, onInline,
}: Props) {
  const { handlePress, handlePressIn, handleLongPress } =
    useTareaGesto(tarea, { onNavigate, onPalomear });

  const accent = accentColor || tarea.color || ATP_BRAND.lime;
  // MB-31B: fila normal (no editorial) — superficies y texto del scope; el
  // color de sección del mosaico es identidad y queda igual en los dos temas.
  const t = useSurfaceTokens();
  const dark = t.kind === 'dark';

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onLongPress={handleLongPress}
      delayLongPress={LONG_PRESS_MS}
      accessibilityRole="button"
      accessibilityLabel={`${tarea.name}${tarea.completed ? ', hecha' : ''}`}
      style={({ pressed }) => [
        s.row,
        !dark && { backgroundColor: t.card, borderColor: t.borde },
        tarea.completed && s.rowDone,
        pressed && (dark ? s.rowPressed : { backgroundColor: t.hundido }),
      ]}
    >
      {lens === 'agenda' && (
        <EliteText style={[s.time, { color: t.textoSecundario }]}>{tarea.time}</EliteText>
      )}

      {/* Hecha: paloma pintada (estado, para todos los gestos). Pendiente,
          la pista es la forma (MB-20.5 P3): círculo donde un toque lo llena
          (palomear), CHEVRON donde el toque te lleva a otro lado (navegar /
          inline). Mismo slot, mismo tamaño, mismo peso visual — solo cambia
          la forma, y la columna conserva su alineación. */}
      {tarea.completed ? (
        <View style={s.checkDone}>
          <Ionicons name="checkmark" size={13} color={TEXT_COLORS.onAccent} />
        </View>
      ) : tarea.gesto === 'palomear' ? (
        <View style={[s.check, { borderColor: dark ? withOpacity('#FFFFFF', 0.25) : t.bordeMarcado }]} />
      ) : (
        <View style={s.checkSlot}>
          <Ionicons name="chevron-forward" size={15} color={dark ? withOpacity('#FFFFFF', 0.3) : t.textoTenue} />
        </View>
      )}

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
        <EliteText style={[s.name, { color: t.texto }, tarea.completed && [s.nameDone, { color: t.textoSecundario }]]}>{tarea.name}</EliteText>
        {tarea.meta ? <EliteText style={[s.meta, { color: t.sinDatos }]}>{tarea.meta}</EliteText> : null}
        {tarea.kind === 'quant' && tarea.progress != null && (
          <View style={[s.track, !dark && { backgroundColor: t.hundido }]}>
            <View style={[s.trackFill, { width: `${Math.round(tarea.progress * 100)}%`, backgroundColor: accent }]} />
          </View>
        )}
      </View>

      {/* La fila compacta de AGENDA conserva solo +250 (no cabe la
          botonera); los TRES botones viven en la card grande. El chevron
          del borde derecho murió: la pista de navegación vive en el slot
          del check (P3), no en dos lugares. */}
      {tarea.gesto === 'inline' && onInline && !tarea.completed ? (
        <Pressable
          onPress={() => { haptic.success(); onInline(tarea, 250); }}
          hitSlop={8}
          style={({ pressed }) => [s.inlineBtn, pressed && { opacity: 0.6 }]}
          accessibilityLabel="Agregar 250 mililitros"
        >
          <EliteText style={[s.inlineBtnText, !dark && { color: t.tealTexto }]}>+250 ml</EliteText>
        </Pressable>
      ) : null}

      {/* OLA0 QW-7: una fila palomeable que SÍ tiene función detrás solo
          navegaba con tap largo — invisible. El chevron al extremo derecho
          da la pista (mismo vocabulario visual que el del checkSlot), sin
          tocar los gestos: tap palomea, tap largo navega. */}
      {tarea.gesto === 'palomear' && tarea.route ? (
        <View style={s.checkSlot}>
          <Ionicons name="chevron-forward" size={15} color={dark ? withOpacity('#FFFFFF', 0.3) : t.textoTenue} />
        </View>
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
  checkSlot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
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
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
  },
  nameDone: { textDecorationLine: 'line-through' },
  meta: {
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
