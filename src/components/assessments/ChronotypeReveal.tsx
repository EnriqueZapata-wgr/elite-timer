/**
 * OLA 4 · Resultado del cronotipo (Anexo C, pieza 3b).
 *
 * Movido de app/quiz/chronotype.tsx. Se conservan las dos cosas que no son
 * decoración: la nota de Delfín como estado TEMPORAL con su cronotipo madre
 * (doctrina #12, MB-1 y MB-6) y que activar es un acto explícito, porque hasta
 * que la persona activa no se escribe una sola fila.
 */
import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { motherChronotype } from '@/src/services/interventions/intervention-agenda-core';
import type { Chronotype, ChronotypeInfo } from '@/src/services/quiz-service';
import { ATP_BRAND, CATEGORY_COLORS, SEMANTIC, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const ANIMAL_COLORS: Record<Chronotype, string> = {
  lion: '#F5A623', bear: '#8B6914', wolf: '#7F77DD', dolphin: '#5B9BD5',
};
const ANIMAL_EMOJIS: Record<Chronotype, string> = {
  lion: '🦁', bear: '🐻', wolf: '🐺', dolphin: '🐬',
};
const ANIMAL_NAMES: Record<Chronotype, string> = {
  lion: 'León', bear: 'Oso', wolf: 'Lobo', dolphin: 'Delfín',
};
const ANIMALS: Chronotype[] = ['lion', 'bear', 'wolf', 'dolphin'];

interface Props {
  result: Chronotype;
  scores: Record<string, number>;
  schedule?: ChronotypeInfo;
  totalQuestions: number;
  saving: boolean;
  onActivate: () => void;
  onRetake: () => void;
}

export function ChronotypeReveal({
  result, scores, schedule, totalQuestions, saving, onActivate, onRetake,
}: Props) {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const maxScore = totalQuestions * 3;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <Animated.View entering={ZoomIn.delay(200).springify()} style={s.reveal}>
        <EliteText style={s.revealEmoji}>{ANIMAL_EMOJIS[result]}</EliteText>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <EliteText style={[s.revealName, { color: ANIMAL_COLORS[result] }]}>{ANIMAL_NAMES[result]}</EliteText>
        <EliteText variant="body" style={s.revealDesc}>{schedule?.description ?? ''}</EliteText>
      </Animated.View>

      {/* Doctrina #12 (MB-1) + MB-6: Delfín es estado, no raíz. */}
      {result === 'dolphin' && (() => {
        const mother = motherChronotype(scores);
        return (
          <Animated.View entering={FadeInUp.delay(500).springify()} style={s.dolphinBox}>
            <EliteText variant="caption" style={s.dolphinKicker}>DELFÍN ES UN ESTADO TEMPORAL</EliteText>
            <EliteText variant="body" style={s.dolphinBody}>
              Hoy estás en patrón Delfín: es un estado, no lo que eres. Tu cronotipo
              de base es {ANIMAL_EMOJIS[mother]} {ANIMAL_NAMES[mother]}: tu plan usa esa
              ancla mientras estabilizas horarios. En 2-3 semanas de dormir mejor,
              repite el test para confirmarlo.
            </EliteText>
          </Animated.View>
        );
      })()}

      <Animated.View entering={FadeInUp.delay(600).springify()} style={s.scores}>
        {ANIMALS.map((animal) => {
          const value = scores[animal] ?? 0;
          // Se acota a 100: con la rama de desempate contestada, el animal que
          // ganó puede pasar del máximo del banco base (10 preguntas x 3) y la
          // barra se salía de su carril.
          const pct = maxScore > 0 ? Math.min(100, Math.round((value / maxScore) * 100)) : 0;
          const winner = animal === result;
          return (
            <View key={animal} style={s.scoreRow}>
              <EliteText variant="caption" style={[s.scoreAnimal, winner && { color: ANIMAL_COLORS[animal] }]}>
                {ANIMAL_EMOJIS[animal]} {ANIMAL_NAMES[animal]}
              </EliteText>
              <View style={s.track}>
                <View style={[s.fill, { width: `${pct}%`, backgroundColor: ANIMAL_COLORS[animal] }]} />
              </View>
              <EliteText variant="caption" style={[s.scorePct, winner && { color: ANIMAL_COLORS[animal] }]}>
                {pct}%
              </EliteText>
            </View>
          );
        })}
      </Animated.View>

      {schedule && (
        <Animated.View entering={FadeInUp.delay(800).springify()} style={s.schedule}>
          <EliteText style={s.scheduleTitle}>TU DÍA IDEAL</EliteText>
          <View style={{ gap: Spacing.xs }}>
            <ScheduleRow s={s} icon="sunny-outline" label="Despertar" time={schedule.wake_time} color={ATP_BRAND.lime} />
            <ScheduleRow s={s} icon="barbell-outline" label="Entrenamiento" time={schedule.peak_physical_start} color={CATEGORY_COLORS.fitness} />
            <ScheduleRow s={s} icon="bulb-outline" label="Pico mental" time={`${schedule.peak_focus_start} - ${schedule.peak_focus_end}`} color={CATEGORY_COLORS.mind} />
            <ScheduleRow s={s} icon="restaurant-outline" label="Última comida" time={schedule.wind_down_time > schedule.sleep_time ? '20:00' : mealTime(schedule.wind_down_time)} color={CATEGORY_COLORS.nutrition} />
            <ScheduleRow s={s} icon="moon-outline" label="Wind down" time={schedule.wind_down_time} color={CATEGORY_COLORS.rest} />
            <ScheduleRow s={s} icon="bed-outline" label="Dormir" time={schedule.sleep_time} color={SEMANTIC.info} />
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeInUp.delay(1000).springify()} style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
        <AnimatedPressable onPress={onActivate} disabled={saving} style={[s.activate, saving && { opacity: 0.6 }]}>
          {saving ? (
            <ActivityIndicator size="small" color={t.textoSobreLima} />
          ) : (
            <>
              <Ionicons name="flash" size={18} color={t.textoSobreLima} />
              <EliteText style={s.activateText}>Activar mi cronotipo</EliteText>
            </>
          )}
        </AnimatedPressable>
        <AnimatedPressable onPress={onRetake} style={s.retry}>
          <Ionicons name="refresh-outline" size={16} color={t.textoSecundario} />
          <EliteText variant="caption" style={s.retryText}>Repetir quiz</EliteText>
        </AnimatedPressable>
      </Animated.View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

/** La última comida cae dos horas antes del wind down. */
function mealTime(windDown: string): string {
  const [h, m] = windDown.split(':').map(Number);
  const mealH = h - 2;
  return `${mealH < 10 ? '0' : ''}${mealH}:${m < 10 ? '0' : ''}${m}`;
}

function ScheduleRow({ s, icon, label, time, color }: {
  s: ReturnType<typeof makeStyles>; icon: string; label: string; time: string; color: string;
}) {
  return (
    <View style={s.scheduleRow}>
      <Ionicons name={icon as never} size={18} color={color} />
      <EliteText variant="body" style={s.scheduleLabel}>{label}</EliteText>
      <EliteText style={[s.scheduleTime, { color }]}>{time}</EliteText>
    </View>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  reveal: { alignItems: 'center', marginTop: Spacing.lg },
  revealEmoji: { fontSize: 72, lineHeight: 84 },
  revealName: { fontFamily: Fonts.extraBold, fontSize: 34, textAlign: 'center', marginTop: Spacing.sm },
  revealDesc: { color: t.textoSecundario, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 21, marginTop: Spacing.xs },
  dolphinBox: {
    backgroundColor: withOpacity('#EF9F27', 0.08), borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: withOpacity('#EF9F27', 0.25), marginTop: Spacing.md,
  },
  dolphinKicker: { color: '#EF9F27', letterSpacing: 2, fontSize: 10, marginBottom: 6 },
  dolphinBody: { fontSize: 13, lineHeight: 19, color: t.textoSecundario },
  scores: { gap: Spacing.xs, marginTop: Spacing.lg },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  scoreAnimal: { width: 92, color: t.textoSecundario, fontSize: FontSizes.xs },
  track: { flex: 1, height: 8, backgroundColor: t.flotante, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  scorePct: { width: 40, textAlign: 'right', color: t.textoTenue, fontSize: FontSizes.xs },
  schedule: { marginTop: Spacing.lg, backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde, padding: Spacing.md },
  scheduleTitle: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2, color: t.textoTenue, marginBottom: Spacing.sm },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
  scheduleLabel: { flex: 1, color: t.texto, fontSize: FontSizes.sm },
  scheduleTime: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  activate: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 14,
  },
  activateText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: t.textoSobreLima },
  retry: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: t.borde, borderRadius: Radius.md, paddingVertical: 12,
  },
  retryText: { color: t.textoSecundario, fontSize: FontSizes.sm },
});
