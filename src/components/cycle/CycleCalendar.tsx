/**
 * CycleCalendar — Calendario mensual visual para ciclo menstrual + gráfica de línea.
 *
 * Muestra días coloreados por fase (menstrual, folicular, ovulación, lútea)
 * y una mini-gráfica SVG para patrones de síntomas.
 */

import { useState } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Svg, { Path, Circle, Rect, Text as SvgText, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS } from '@/src/constants/brand';

// ═══ TIPOS ═══

interface Period {
  start_date: string;
  end_date: string | null;
}

interface CalendarProps {
  periods: Period[];
  cycleLength: number;
  periodLength: number;
  onDayPress?: (date: string) => void;
}

interface ChartProps {
  data: { day: number; value: number }[];
  color: string;
  label: string;
  maxDays?: number;
}

// ═══ CONSTANTES ═══

const PHASE_COLORS: Record<string, string> = {
  menstrual: '#E24B4A',
  follicular: '#a8e02a',
  ovulation: '#EF9F27',
  luteal: '#7F77DD',
};

const PHASE_LABELS: Record<string, string> = {
  menstrual: 'Menstrual',
  follicular: 'Folicular',
  ovulation: 'Ovulación',
  luteal: 'Lútea',
};

const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// ═══ UTILIDADES ═══

/** Calcula el primer día de la semana (lunes=0) y días del mes */
function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const adjusted = firstDay === 0 ? 6 : firstDay - 1; // Lun=0
  return { firstDay: adjusted, daysInMonth };
}

/** Determina la fase del ciclo para una fecha dada */
function getDayPhase(
  date: Date,
  periods: Period[],
  cycleLen: number,
  periodLen: number,
): string | null {
  const sorted = periods
    .map((p) => new Date(p.start_date))
    .sort((a, b) => b.getTime() - a.getTime());

  for (const start of sorted) {
    const diff = Math.floor((date.getTime() - start.getTime()) / 86400000);
    if (diff >= 0 && diff < cycleLen + 7) {
      const day = diff + 1;
      if (day <= periodLen) return 'menstrual';
      if (day <= Math.round(cycleLen * 0.46)) return 'follicular';
      if (day <= Math.round(cycleLen * 0.57)) return 'ovulation';
      if (day <= cycleLen) return 'luteal';
    }
  }
  return null;
}

// ═══ COMPONENTE: CycleCalendar ═══

export function CycleCalendar({
  periods,
  cycleLength,
  periodLength,
  onDayPress,
}: CalendarProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const { firstDay, daysInMonth } = getMonthDays(year, month);
  const today = new Date();
  const monthName = new Date(year, month).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  // Navegación entre meses
  const prevMonth = () => {
    haptic.light();
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    haptic.light();
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  /** Verifica si un día es parte de un período registrado */
  const isPeriodDay = (d: number) => {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return periods.some(
      (p) => date >= p.start_date && (!p.end_date || date <= p.end_date),
    );
  };

  /** Verifica si un día es hoy */
  const isToday = (d: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === d;

  // Construir grid de celdas (null = celda vacía)
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={st.container}>
      {/* Navegación de mes */}
      <View style={st.nav}>
        <Pressable onPress={prevMonth} hitSlop={8}>
          <Ionicons
            name="chevron-back"
            size={20}
            color={TEXT_COLORS.secondary}
          />
        </Pressable>
        <EliteText style={st.monthName}>{monthName}</EliteText>
        <Pressable onPress={nextMonth} hitSlop={8}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={TEXT_COLORS.secondary}
          />
        </Pressable>
      </View>

      {/* Encabezados de días */}
      <View style={st.row}>
        {DAY_HEADERS.map((d, i) => (
          <View key={i} style={st.cell}>
            <EliteText style={st.dayHeader}>{d}</EliteText>
          </View>
        ))}
      </View>

      {/* Grid de días */}
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={st.row}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={st.cell} />;

            const date = new Date(year, month, day);
            const phase = getDayPhase(date, periods, cycleLength, periodLength);
            const phaseColor = phase ? PHASE_COLORS[phase] : null;
            const isPeriod = isPeriodDay(day);
            const isTodayDay = isToday(day);

            return (
              <Pressable
                key={col}
                style={st.cell}
                onPress={() => {
                  haptic.light();
                  onDayPress?.(
                    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                  );
                }}
              >
                <View
                  style={[
                    st.dayCircle,
                    phaseColor && { backgroundColor: phaseColor + '20' },
                    isPeriod && { backgroundColor: '#E24B4A' },
                    isTodayDay && { borderWidth: 2, borderColor: '#fff' },
                  ]}
                >
                  <EliteText
                    style={[
                      st.dayText,
                      isPeriod && { color: '#fff' },
                      isTodayDay && !isPeriod && { color: '#fff' },
                    ]}
                  >
                    {day}
                  </EliteText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Leyenda de fases */}
      <View style={st.legend}>
        {Object.entries(PHASE_COLORS).map(([phase, color]) => (
          <View key={phase} style={st.legendItem}>
            <View style={[st.legendDot, { backgroundColor: color }]} />
            <EliteText style={st.legendText}>{PHASE_LABELS[phase]}</EliteText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ═══ COMPONENTE: CycleLineChart ═══

export function CycleLineChart({
  data,
  color,
  label,
  maxDays = 28,
}: ChartProps) {
  const width = Dimensions.get('window').width - 48;
  const height = 100;
  const pad = { top: 8, bottom: 20, left: 24, right: 8 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  // Mínimo 3 puntos para mostrar la gráfica
  if (data.length < 3) {
    return (
      <View style={[st.chartContainer, { height }]}>
        <EliteText
          style={{
            color: TEXT_COLORS.muted,
            fontSize: FontSizes.xs,
            textAlign: 'center',
          }}
        >
          Registra síntomas durante 1 ciclo para ver patrones
        </EliteText>
      </View>
    );
  }

  // Calcular puntos en coordenadas SVG
  const points = data.map((d) => ({
    x: pad.left + ((d.day - 1) / maxDays) * cw,
    y: pad.top + ch - (d.value / 10) * ch,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Bandas de fondo por fase
  const phases = [
    { start: 0, end: 5, color: '#E24B4A' },
    { start: 5, end: 13, color: '#a8e02a' },
    { start: 13, end: 16, color: '#EF9F27' },
    { start: 16, end: 28, color: '#7F77DD' },
  ];

  return (
    <View style={st.chartContainer}>
      <EliteText style={[st.chartLabel, { color }]}>{label}</EliteText>
      <Svg width={width} height={height}>
        {/* Bandas de fase */}
        {phases.map((p, i) => (
          <Rect
            key={i}
            x={pad.left + (p.start / maxDays) * cw}
            y={pad.top}
            width={((p.end - p.start) / maxDays) * cw}
            height={ch}
            fill={p.color}
            opacity={0.06}
          />
        ))}

        {/* Líneas guía horizontales */}
        {[2, 5, 8].map((v) => (
          <Line
            key={v}
            x1={pad.left}
            y1={pad.top + ch - (v / 10) * ch}
            x2={width - pad.right}
            y2={pad.top + ch - (v / 10) * ch}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={0.5}
          />
        ))}

        {/* Línea de datos */}
        <Path d={pathD} stroke={color} strokeWidth={2} fill="none" />

        {/* Puntos de datos */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
        ))}
      </Svg>
    </View>
  );
}

// ═══ ESTILOS ═══

const st = StyleSheet.create({
  // Calendario
  container: {
    backgroundColor: SURFACES.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  monthName: {
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    textTransform: 'capitalize',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    color: TEXT_COLORS.secondary,
    fontSize: FontSizes.sm,
  },
  dayHeader: {
    color: TEXT_COLORS.muted,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: SURFACES.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: TEXT_COLORS.muted,
    fontSize: FontSizes.xs,
  },

  // Gráfica
  chartContainer: {
    backgroundColor: SURFACES.card,
    borderRadius: Radius.card,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chartLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
});
