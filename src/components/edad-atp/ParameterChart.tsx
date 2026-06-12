/**
 * <ParameterChart> — gráfica de continuum de un parámetro de lab (#4). Dibuja la serie
 * temporal (todos los lab_values no-voided de ese parameter_key) con la BANDA FUNCIONAL ATP
 * (rango óptimo de la matriz V8) de fondo. Puntos fechados, color por estado, marca los stale.
 * Toda la matemática vive en `parameter-chart-model.ts` (testeada); aquí solo se dibuja.
 */
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Text as SvgText } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { EDAD_STATUS, EDAD_PENDING_COLOR } from './tokens';
import { buildChartModel, type SeriePoint } from './parameter-chart-model';

const STATUS_COLOR: Record<string, string> = {
  optimo: EDAD_STATUS.good,
  aceptable: EDAD_STATUS.neutral,
  atencion: EDAD_STATUS.bad,
};

interface Props {
  series: SeriePoint[];
  bandLimits: (number | null)[] | null;
  todayISO: string;
  unit?: string;
  width: number;
  height?: number;
}

/** DD/MM corto desde YYYY-MM-DD. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return d && m ? `${d}/${m}` : iso;
}

export function ParameterChart({ series, bandLimits, todayISO, unit = '', width, height = 160 }: Props) {
  const model = buildChartModel(series, bandLimits, todayISO);
  if (model.empty) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <EliteText variant="caption" style={styles.emptyText}>Aún no hay historial para graficar.</EliteText>
      </View>
    );
  }

  const pad = { top: 14, bottom: 22, left: 8, right: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const px = (x: number) => pad.left + x * plotW;
  const py = (yNorm: number) => pad.top + (1 - yNorm) * plotH; // 1 arriba

  const linePath = model.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`)
    .join(' ');

  return (
    <View style={{ width }}>
      <Svg width={width} height={height}>
        {/* Banda funcional ATP (rango óptimo de Mariana). */}
        {model.band ? (
          <>
            <Rect
              x={pad.left}
              y={py(model.band.hiNorm)}
              width={plotW}
              height={Math.max(0, py(model.band.loNorm) - py(model.band.hiNorm))}
              fill={EDAD_STATUS.good}
              opacity={0.12}
            />
            <Line x1={pad.left} y1={py(model.band.hiNorm)} x2={pad.left + plotW} y2={py(model.band.hiNorm)} stroke={EDAD_STATUS.good} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.4} />
            <Line x1={pad.left} y1={py(model.band.loNorm)} x2={pad.left + plotW} y2={py(model.band.loNorm)} stroke={EDAD_STATUS.good} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.4} />
            <SvgText x={width - pad.right + 3} y={py(model.band.hiNorm) + 3} fill={EDAD_STATUS.good} fontSize={8} opacity={0.6}>{model.band.hi}</SvgText>
            <SvgText x={width - pad.right + 3} y={py(model.band.loNorm) + 3} fill={EDAD_STATUS.good} fontSize={8} opacity={0.6}>{model.band.lo}</SvgText>
          </>
        ) : null}

        {/* Línea de la serie. */}
        {model.points.length > 1 ? (
          <Path d={linePath} stroke={Colors.textSecondary} strokeWidth={1.5} fill="none" opacity={0.7} />
        ) : null}

        {/* Puntos fechados. Stale = anillo gris hueco. */}
        {model.points.map((p, i) => (
          <Circle
            key={i}
            cx={px(p.x)}
            cy={py(p.y)}
            r={4}
            fill={p.is_stale ? 'transparent' : STATUS_COLOR[p.status]}
            stroke={p.is_stale ? EDAD_PENDING_COLOR : STATUS_COLOR[p.status]}
            strokeWidth={p.is_stale ? 1.5 : 0}
          />
        ))}

        {/* Etiquetas de fecha (primera, última). */}
        {model.points.length > 0 ? (
          <SvgText x={px(model.points[0].x)} y={height - 6} fill={Colors.textMuted} fontSize={8} textAnchor="start">
            {shortDate(model.points[0].measured_at)}
          </SvgText>
        ) : null}
        {model.points.length > 1 ? (
          <SvgText x={px(model.points[model.points.length - 1].x)} y={height - 6} fill={Colors.textMuted} fontSize={8} textAnchor="end">
            {shortDate(model.points[model.points.length - 1].measured_at)}
          </SvgText>
        ) : null}
      </Svg>

      <View style={styles.legendRow}>
        <EliteText variant="caption" style={styles.legendItem}>
          <EliteText style={{ color: EDAD_STATUS.good }}>▬</EliteText> Rango funcional ATP
        </EliteText>
        <EliteText variant="caption" style={styles.legendItem}>
          <EliteText style={{ color: EDAD_PENDING_COLOR }}>○</EliteText> &gt; 1 año {unit ? `· ${unit}` : ''}
        </EliteText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: FontSizes.xs },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs, paddingHorizontal: Spacing.xs },
  legendItem: { color: Colors.textMuted, fontSize: FontSizes.xs },
});
