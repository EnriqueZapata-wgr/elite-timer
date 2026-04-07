/**
 * SimpleCharts — Componentes de grafica minimalistas con react-native-svg.
 * Diseñados para los reportes (estilo Oura): barras y lineas.
 */
import { Dimensions } from 'react-native';
import Svg, { Path, Circle, Rect, Line, G, Text as SvgText } from 'react-native-svg';

const SCREEN_W = Dimensions.get('window').width;

export interface ChartPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartPoint[];
  color: string;
  height?: number;
  unit?: string;
  target?: number;
  width?: number;
}

/** Grafica de barras simple. */
export function SimpleBarChart({
  data, color, height = 110, unit = '', target, width: widthProp,
}: BarChartProps) {
  const width = widthProp ?? SCREEN_W - 80;
  if (data.length === 0) return null;

  const max = Math.max(...data.map(d => d.value), target ?? 0, 1);
  const padding = { top: 12, bottom: 22 };
  const chartH = height - padding.top - padding.bottom;
  const slotW = width / data.length;
  const barW = Math.min(20, slotW - 4);

  return (
    <Svg width={width} height={height}>
      {target != null && target > 0 && (
        <G>
          <Line
            x1={0}
            y1={padding.top + chartH - (target / max) * chartH}
            x2={width}
            y2={padding.top + chartH - (target / max) * chartH}
            stroke={color}
            strokeWidth={0.5}
            strokeDasharray="4 4"
            opacity={0.4}
          />
          <SvgText
            x={width - 4}
            y={padding.top + chartH - (target / max) * chartH - 4}
            fill={color}
            fontSize={9}
            textAnchor="end"
            opacity={0.5}
          >
            {target}{unit}
          </SvgText>
        </G>
      )}

      {data.map((d, i) => {
        const barH = max > 0 ? (d.value / max) * chartH : 0;
        const x = i * slotW + (slotW - barW) / 2;
        const y = padding.top + chartH - barH;

        return (
          <G key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(barH, 1)}
              fill={color}
              rx={barW / 4}
              opacity={0.85}
            />
            <SvgText
              x={x + barW / 2}
              y={height - 6}
              fill="rgba(255,255,255,0.35)"
              fontSize={8}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

interface LineChartProps {
  data: ChartPoint[];
  color: string;
  height?: number;
  target?: number;
  width?: number;
}

/** Grafica de linea simple con puntos. */
export function SimpleLineChart({
  data, color, height = 110, target, width: widthProp,
}: LineChartProps) {
  const width = widthProp ?? SCREEN_W - 80;
  if (data.length < 2) return null;

  const valuesAll = [...data.map(d => d.value), target ?? 0].filter(v => v > 0);
  const max = Math.max(...valuesAll, 1) * 1.1;
  const min = Math.min(...data.map(d => d.value).filter(v => v > 0), max) * 0.9;
  const range = max - min || 1;

  const padding = { top: 12, bottom: 22 };
  const chartH = height - padding.top - padding.bottom;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: padding.top + chartH - ((d.value - min) / range) * chartH,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Mostrar 1 de cada N labels para no saturar
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <Svg width={width} height={height}>
      {target != null && target > 0 && (
        <Line
          x1={0}
          y1={padding.top + chartH - ((target - min) / range) * chartH}
          x2={width}
          y2={padding.top + chartH - ((target - min) / range) * chartH}
          stroke={color}
          strokeWidth={0.5}
          strokeDasharray="4 4"
          opacity={0.35}
        />
      )}

      <Path
        d={pathD}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
      ))}

      {data.map((d, i) => {
        if (i % labelStep !== 0 && i !== data.length - 1) return null;
        return (
          <SvgText
            key={`l${i}`}
            x={points[i].x}
            y={height - 6}
            fill="rgba(255,255,255,0.35)"
            fontSize={8}
            textAnchor="middle"
          >
            {d.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}
