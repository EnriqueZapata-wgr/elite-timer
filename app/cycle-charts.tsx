/**
 * Cycle Charts — Gráficas multi-parámetro con toggles on/off.
 *
 * Muestra líneas de síntomas (energía, ánimo, líbido, cólicos, etc.)
 * sobre bandas de color de las 4 fases del ciclo.
 */
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Path, Circle as SvgCircle } from 'react-native-svg';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { FilterPills } from '@/src/components/ui/FilterPills';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';

const ROSE = '#fb7185';
const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64;
const CHART_H = 180;

interface ChartParam {
  key: string;
  label: string;
  color: string;
  enabled: boolean;
}

const DEFAULT_PARAMS: ChartParam[] = [
  { key: 'energy',      label: 'Energía',     color: '#fbbf24', enabled: true },
  { key: 'mood',         label: 'Ánimo',       color: '#a8e02a', enabled: true },
  { key: 'libido',       label: 'Líbido',      color: '#f472b6', enabled: false },
  { key: 'cramps',       label: 'Cólicos',     color: '#ef4444', enabled: false },
  { key: 'bloating',     label: 'Hinchazón',   color: '#c084fc', enabled: false },
  { key: 'appetite',     label: 'Apetito',     color: '#38bdf8', enabled: false },
  { key: 'sleep_quality', label: 'Sueño',      color: '#818cf8', enabled: false },
];

type PeriodLabel = 'Último ciclo' | '3 meses' | '6 meses';
const PERIOD_LABELS: readonly PeriodLabel[] = ['Último ciclo', '3 meses', '6 meses'];

export default function CycleChartsScreen() {
  const { user } = useAuth();
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [periodLabel, setPeriodLabel] = useState<PeriodLabel>('Último ciclo');
  const [data, setData] = useState<any[]>([]);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    const days = periodLabel === 'Último ciclo' ? 35 : periodLabel === '3 meses' ? 90 : 180;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;

    supabase.from('cycle_daily_logs')
      .select('date, is_period, energy, mood, appetite, libido, cramps, bloating, sleep_quality, temperature_c, hrv_ms')
      .eq('user_id', user.id)
      .gte('date', sinceStr)
      .order('date', { ascending: true })
      .then(({ data: d }) => setData(d ?? []));
  }, [user?.id, periodLabel]));

  const toggleParam = (key: string) => {
    haptic.light();
    setParams(prev => prev.map(p => p.key === key ? { ...p, enabled: !p.enabled } : p));
  };

  const enabledParams = params.filter(p => p.enabled);

  // Build SVG paths
  function buildPath(paramKey: string, color: string): string {
    const points = data
      .map((d, i) => ({ x: (i / Math.max(data.length - 1, 1)) * CHART_W, y: d[paramKey] }))
      .filter(p => p.y != null);
    if (points.length < 2) return '';
    return points.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${(CHART_H - 20 - ((p.y - 1) / 4) * (CHART_H - 40)).toFixed(1)}`
    ).join(' ');
  }

  // Period bands
  const periodBands = data.reduce((bands: { start: number; end: number }[], d, i) => {
    if (d.is_period) {
      const lastBand = bands[bands.length - 1];
      if (lastBand && lastBand.end === i - 1) {
        lastBand.end = i;
      } else {
        bands.push({ start: i, end: i });
      }
    }
    return bands;
  }, []);

  return (
    <Screen>
      <PillarHeader pillar="cycle" title="Gráficas" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        {/* Period selector */}
        <FilterPills options={PERIOD_LABELS} selected={periodLabel} onSelect={setPeriodLabel} withPadding={false} />

        {/* Chart */}
        <GradientCard gradient={{ start: 'rgba(251,113,133,0.08)', end: 'rgba(251,113,133,0.02)' }} style={s.chartCard}>
          {data.length < 3 ? (
            <View style={s.emptyChart}>
              <Ionicons name="analytics-outline" size={32} color="#666" />
              <EliteText style={s.emptyText}>Registra al menos 3 días para ver gráficas</EliteText>
            </View>
          ) : (
            <Svg width={CHART_W} height={CHART_H}>
              {/* Period bands */}
              {periodBands.map((band, i) => {
                const x = (band.start / Math.max(data.length - 1, 1)) * CHART_W;
                const w = ((band.end - band.start + 1) / Math.max(data.length - 1, 1)) * CHART_W;
                return <Rect key={i} x={x} y={0} width={Math.max(w, 2)} height={CHART_H} fill="rgba(239,68,68,0.12)" />;
              })}

              {/* Data lines */}
              {enabledParams.map(p => {
                const d = buildPath(p.key, p.color);
                return d ? <Path key={p.key} d={d} stroke={p.color} strokeWidth={2} fill="none" strokeLinecap="round" /> : null;
              })}
            </Svg>
          )}
        </GradientCard>

        {/* Toggle pills */}
        <View style={s.toggleRow}>
          {params.map(p => (
            <AnimatedPressable key={p.key} onPress={() => toggleParam(p.key)}>
              <View style={[s.togglePill, p.enabled && { backgroundColor: `${p.color}20`, borderColor: p.color }]}>
                <EliteText style={[s.toggleText, p.enabled && { color: p.color }]}>{p.label}</EliteText>
              </View>
            </AnimatedPressable>
          ))}
        </View>

        {/* Legend */}
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#ef4444' }]} />
            <EliteText style={s.legendText}>Periodo</EliteText>
          </View>
          {enabledParams.map(p => (
            <View key={p.key} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: p.color }]} />
              <EliteText style={s.legendText}>{p.label}</EliteText>
            </View>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  chartCard: { marginTop: Spacing.md },
  emptyChart: {
    height: CHART_H,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    textAlign: 'center',
  },

  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.md,
  },
  togglePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toggleText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: '#666',
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: '#888',
  },
});
