/**
 * AdherenceCalendar (MB-11 C · SPEC Zero→ATP) — calendario mensual con puntos
 * de color por métrica: ayuno · proteína · agua · actividad. Adherencia densa
 * y legible de un vistazo.
 *
 * Semántica de puntos (regla MB-6, sin datos ≠ cero):
 *  · punto a color   = meta cumplida ese día
 *  · punto tenue     = hubo registro pero no llegó a la meta
 *  · sin punto       = sin datos de esa métrica ese día
 * Sueño aún no tiene fuente por día (wearable desactivado) — la leyenda lo
 * dice en vez de fingir un cero.
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, CATEGORY_COLORS, TEXT } from '@/src/constants/brand';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { getLocalToday } from '@/src/utils/date-helpers';
import {
  buildMonthMatrix, dateKey, MONTH_NAMES, WEEKDAY_LABELS,
  type FlagsByDate, type MetricKey,
} from '@/src/services/reports/adherence-calendar-core';

/** Colores por métrica — tokens existentes, sin inventar (doctrina §1). */
const METRIC_COLORS: Record<Exclude<MetricKey, 'sueno'>, string> = {
  ayuno: CATEGORY_COLORS.optimization,   // amber
  proteina: CATEGORY_COLORS.nutrition,   // azul
  agua: ATP_BRAND.teal,                  // teal
  actividad: CATEGORY_COLORS.fitness,    // lima
};

const METRIC_LABELS: Record<Exclude<MetricKey, 'sueno'>, string> = {
  ayuno: 'Ayuno', proteina: 'Proteína', agua: 'Agua', actividad: 'Actividad',
};

const DOT_METRICS = Object.keys(METRIC_COLORS) as (Exclude<MetricKey, 'sueno'>)[];

interface Props {
  year: number;
  month0: number;
  flags: FlagsByDate;
  onShift: (delta: -1 | 1) => void;
  /** Deshabilita "mes siguiente" cuando ya estamos en el mes actual. */
  atCurrentMonth: boolean;
}

export function AdherenceCalendar({ year, month0, flags, onShift, atCurrentMonth }: Props) {
  const weeks = buildMonthMatrix(year, month0);
  const today = getLocalToday();

  return (
    <View>
      {/* Navegación de mes */}
      <View style={s.monthRow}>
        <AnimatedPressable onPress={() => { haptic.light(); onShift(-1); }} style={s.monthBtn}>
          <Ionicons name="chevron-back" size={18} color={TEXT.secondary} />
        </AnimatedPressable>
        <EliteText style={s.monthLabel}>{MONTH_NAMES[month0]} {year}</EliteText>
        <AnimatedPressable
          onPress={() => { if (!atCurrentMonth) { haptic.light(); onShift(1); } }}
          disabled={atCurrentMonth}
          style={[s.monthBtn, atCurrentMonth && { opacity: 0.25 }]}
        >
          <Ionicons name="chevron-forward" size={18} color={TEXT.secondary} />
        </AnimatedPressable>
      </View>

      {/* Encabezado L-D */}
      <View style={s.weekRow}>
        {WEEKDAY_LABELS.map((w, i) => (
          <EliteText key={`${w}${i}`} style={s.weekday}>{w}</EliteText>
        ))}
      </View>

      {/* Grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={s.weekRow}>
          {week.map((day, di) => {
            if (day == null) return <View key={di} style={s.dayCell} />;
            const key = dateKey(year, month0, day);
            const dayFlags = flags[key] ?? {};
            const isToday = key === today;
            const isFuture = key > today;
            return (
              <View key={di} style={[s.dayCell, isFuture && { opacity: 0.3 }]}>
                <View style={[s.dayNumWrap, isToday && s.dayNumToday]}>
                  <EliteText style={[s.dayNum, isToday && s.dayNumTextToday]}>{day}</EliteText>
                </View>
                <View style={s.dotsRow}>
                  {DOT_METRICS.map((m) => {
                    const v = dayFlags[m];
                    if (v === undefined) return null; // sin datos → sin punto
                    return (
                      <View
                        key={m}
                        style={[
                          s.dot,
                          { backgroundColor: METRIC_COLORS[m] },
                          v === false && s.dotMissed,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      ))}

      {/* Leyenda */}
      <View style={s.legendRow}>
        {DOT_METRICS.map((m) => (
          <View key={m} style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: METRIC_COLORS[m] }]} />
            <EliteText style={s.legendText}>{METRIC_LABELS[m]}</EliteText>
          </View>
        ))}
      </View>
      {/* Vacío que informa: sueño no finge ceros. */}
      <EliteText style={s.legendHint}>
        Punto tenue = registrado sin llegar a la meta. Sueño se suma cuando el
        wearable esté activo.
      </EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  monthBtn: { padding: 6 },
  monthLabel: {
    fontSize: FontSizes.md, fontFamily: Fonts.bold, color: TEXT.primary, letterSpacing: 1,
  },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1, textAlign: 'center', color: TEXT.tertiary, fontSize: 10,
    fontFamily: Fonts.semiBold, letterSpacing: 1, marginBottom: 4,
  },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 4, minHeight: 40 },
  dayNumWrap: {
    width: 24, height: 24, borderRadius: Radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  dayNumToday: { backgroundColor: 'rgba(168,224,42,0.15)' },
  dayNum: { fontSize: FontSizes.sm, color: TEXT.secondary, fontFamily: Fonts.regular },
  dayNumTextToday: { color: ATP_BRAND.lime, fontFamily: Fonts.bold },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2, minHeight: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dotMissed: { opacity: 0.25 },
  legendRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    marginTop: Spacing.sm, justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 10, color: TEXT.secondary, fontFamily: Fonts.semiBold },
  legendHint: {
    fontSize: 10, color: TEXT.tertiary, fontFamily: Fonts.regular,
    textAlign: 'center', marginTop: 6, lineHeight: 14,
  },
});
