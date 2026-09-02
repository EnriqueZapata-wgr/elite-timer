/**
 * Dominio ciclo (OLA1 R-3) — absorbe app/cycle-history.tsx (pestaña Ciclos) y
 * app/cycle-charts.tsx (pestaña Gráficas).
 *
 * El gate de biological_sex sube al shell como guard del dominio: se decide una
 * vez, antes de montar nada, y cierra el deep link a /reports/ciclo igual que
 * cerraba /cycle-history y /cycle-charts.
 *
 * Las dos pantallas tenían su propia bandera de "falló la red" para no decirle
 * a la usuaria "sin ciclos registrados" cuando en realidad no se pudo leer. Esa
 * distinción ahora la hace el shell, para los trece reportes por igual.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Rect, Path } from 'react-native-svg';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useCycleGate } from '@/src/hooks/use-cycle-gate';
import { useAuth } from '@/src/contexts/auth-context';
import { useCycleConsent, CycleConsentBlock } from '@/src/components/cycle/CycleConsentGate';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { TEXT_COLORS, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { REPORT_DOMAINS } from '@/src/services/reports/report-domain-core';
import {
  cycleAverages, cicloRows, type CycleDailyRow,
} from '@/src/services/reports/ciclo-report-core';
import {
  loadCicloReport, type CicloReportData,
} from '@/src/services/reports/ciclo-report-service';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import { ReportTabs, useReportTab } from '../ReportTabs';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.ciclo;
const ROSE = '#fb7185';
const GRADIENT = { start: 'rgba(251,113,133,0.08)', end: 'rgba(251,113,133,0.03)' };

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 64;
const CHART_H = 180;

interface ChartParam {
  key: keyof CycleDailyRow;
  label: string;
  color: string;
  enabled: boolean;
}

const DEFAULT_PARAMS: ChartParam[] = [
  { key: 'energy', label: 'Energía', color: '#fbbf24', enabled: true },
  { key: 'mood', label: 'Ánimo', color: '#a8e02a', enabled: true },
  { key: 'libido', label: 'Libido', color: '#f472b6', enabled: false },
  { key: 'cramps', label: 'Cólicos', color: '#ef4444', enabled: false },
  { key: 'bloating', label: 'Hinchazón', color: '#c084fc', enabled: false },
  { key: 'appetite', label: 'Apetito', color: '#38bdf8', enabled: false },
  { key: 'sleep_quality', label: 'Sueño', color: '#818cf8', enabled: false },
];

const TABS = [
  { key: 'ciclos', label: 'CICLOS' },
  { key: 'graficas', label: 'GRÁFICAS' },
] as const;

type Tab = typeof TABS[number]['key'];

/**
 * La puerta del pilar Ciclo. Mientras decide no se pinta contenido, y si niega
 * ya se disparó la salida: en ningún estado que no sea 'allowed' se monta el
 * reporte.
 *
 * 4EP G-1 (31-ago-2026): la segunda llave es el consentimiento CB-7, el mismo
 * de /cycle y /cycle-settings. Este reporte lee cycle_periods y
 * cycle_daily_logs COMPLETOS (ciclo-report-service): sin CB-7 aceptado, una
 * usuaria que dijo "Ahora no" en /cycle veía aquí su historial entero dos taps
 * después. El shell monta el guard POR FUERA del provider, así que sin
 * consentimiento no se lee ni una fila.
 */
export function CicloGuard({ children }: { children: ReactNode }) {
  const gate = useCycleGate();
  const { user } = useAuth();
  const consent = useCycleConsent(user?.id);
  if (gate.state === 'allowed' && consent.state === 'granted') return <>{children}</>;
  const checking = gate.state === 'checking' || (gate.state === 'allowed' && consent.state === 'checking');
  return (
    <Screen themed>
      <PillarHeader pillar="cycle" title={META.title} />
      {checking && (
        <View style={styles.gateBox}>
          <ActivityIndicator color={ROSE} />
        </View>
      )}
      {gate.state === 'allowed' && !checking && (
        <CycleConsentBlock consent={consent} acompanante={gate.mode === 'acompanante'} />
      )}
    </Screen>
  );
}

export function CicloContent({ data }: { data: CicloReportData }) {
  const [tab, setTab] = useReportTab<Tab>(TABS, 'ciclos');
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View>
      <ReportTabs tabs={TABS} active={tab} onSelect={setTab} accent={META.accent} />
      {tab === 'ciclos' ? <CiclosTab data={data} s={s} t={t} /> : <GraficasTab data={data} s={s} t={t} />}
    </View>
  );
}

// ── Pestaña CICLOS ─────────────────────────────────────────────────────────

function CiclosTab({ data, s, t }: { data: CicloReportData; s: Styles; t: AppThemeTokens }) {
  const cycles = data.cycles;
  const { avgCycle, avgPeriod, variance } = useMemo(() => cycleAverages(cycles), [cycles]);

  const fmtDate = (d: string) => {
    const dt = new Date(`${d}T00:00:00`);
    return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <View>
      {(avgCycle || avgPeriod) && (
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <GradientCard gradient={GRADIENT} padding={20}>
            <EliteText style={s.avgTitle}>PROMEDIOS</EliteText>
            <View style={s.avgRow}>
              <View style={s.avgItem}>
                <EliteText style={s.avgValue}>{avgCycle ?? '—'}</EliteText>
                <EliteText style={s.avgLabel}>DÍAS CICLO</EliteText>
              </View>
              <View style={s.avgDivider} />
              <View style={s.avgItem}>
                <EliteText style={s.avgValue}>{avgPeriod ?? '—'}</EliteText>
                <EliteText style={s.avgLabel}>DÍAS PERIODO</EliteText>
              </View>
              {variance != null && (
                <>
                  <View style={s.avgDivider} />
                  <View style={s.avgItem}>
                    <EliteText style={s.avgValue}>±{variance}</EliteText>
                    <EliteText style={s.avgLabel}>VARIABILIDAD</EliteText>
                  </View>
                </>
              )}
            </View>
          </GradientCard>
        </Animated.View>
      )}

      <View style={{ marginTop: Spacing.lg }}>
        <SectionTitle>CICLOS REGISTRADOS</SectionTitle>

        {/* Sin ciclos EN ESTE RANGO. Que no haya ninguno nunca lo dice el
            estado vacío del shell, no esta línea. */}
        {cycles.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={36} color={t.textoTenue} />
            <EliteText style={s.emptyText}>
              Sin ciclos que empiecen dentro de este rango. Amplíalo para ver los anteriores.
            </EliteText>
          </View>
        )}

        {cycles.map((cycle, idx) => (
          <Animated.View key={cycle.id} entering={FadeInUp.delay(80 + idx * 30).springify()}>
            <GradientCard gradient={GRADIENT} padding={16} style={s.cycleCard}>
              <View style={s.cycleRow}>
                <View style={{ flex: 1 }}>
                  <EliteText style={s.cycleTitle}>Ciclo {cycles.length - idx}</EliteText>
                  <EliteText style={s.cycleDates}>
                    {fmtDate(cycle.start_date)} – {cycle.end_date ? fmtDate(cycle.end_date) : 'en curso'}
                  </EliteText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <EliteText style={s.cycleLengthNum}>{cycle.cycle_length ?? '—'}</EliteText>
                  <EliteText style={s.cycleLengthLabel}>días</EliteText>
                </View>
              </View>
              {cycle.period_length && (
                <EliteText style={s.cyclePeriodSub}>Periodo: {cycle.period_length} días</EliteText>
              )}
            </GradientCard>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// ── Pestaña GRÁFICAS ───────────────────────────────────────────────────────

function GraficasTab({ data, s, t }: { data: CicloReportData; s: Styles; t: AppThemeTokens }) {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const logs = data.logs;

  const toggleParam = (key: string) => {
    haptic.light();
    setParams((prev) => prev.map((p) => (p.key === key ? { ...p, enabled: !p.enabled } : p)));
  };

  const enabledParams = params.filter((p) => p.enabled);

  function buildPath(paramKey: keyof CycleDailyRow): string {
    const points = logs
      .map((d, i) => ({ x: (i / Math.max(logs.length - 1, 1)) * CHART_W, y: d[paramKey] as number | null }))
      .filter((p) => p.y != null) as { x: number; y: number }[];
    if (points.length < 2) return '';
    return points.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${(CHART_H - 20 - ((p.y - 1) / 4) * (CHART_H - 40)).toFixed(1)}`,
    ).join(' ');
  }

  // Bandas de periodo: días consecutivos con is_period se pintan como uno.
  const periodBands = logs.reduce((bands: { start: number; end: number }[], d, i) => {
    if (d.is_period) {
      const lastBand = bands[bands.length - 1];
      if (lastBand && lastBand.end === i - 1) lastBand.end = i;
      else bands.push({ start: i, end: i });
    }
    return bands;
  }, []);

  return (
    <View>
      <GradientCard gradient={{ start: 'rgba(251,113,133,0.08)', end: 'rgba(251,113,133,0.02)' }}>
        {logs.length < 3 ? (
          <View style={s.emptyChart}>
            <Ionicons name="analytics-outline" size={32} color={t.textoTenue} />
            <EliteText style={s.emptyText}>
              Con menos de tres días registrados en el rango no hay línea que trazar. Amplía el rango o registra un día más.
            </EliteText>
          </View>
        ) : (
          <Svg width={CHART_W} height={CHART_H}>
            {periodBands.map((band, i) => {
              const x = (band.start / Math.max(logs.length - 1, 1)) * CHART_W;
              const w = ((band.end - band.start + 1) / Math.max(logs.length - 1, 1)) * CHART_W;
              return <Rect key={i} x={x} y={0} width={Math.max(w, 2)} height={CHART_H} fill="rgba(239,68,68,0.12)" />;
            })}
            {enabledParams.map((p) => {
              const d = buildPath(p.key);
              return d ? <Path key={String(p.key)} d={d} stroke={p.color} strokeWidth={2} fill="none" strokeLinecap="round" /> : null;
            })}
          </Svg>
        )}
      </GradientCard>

      <View style={s.toggleRow}>
        {params.map((p) => (
          <AnimatedPressable key={String(p.key)} onPress={() => toggleParam(String(p.key))}>
            {/* Manual 3.9: en claro el toggle activo es RELLENO con negro
                encima (el color del parámetro como letra no se lee). */}
            <View style={[s.togglePill, p.enabled && (t.kind === 'dark'
              ? { backgroundColor: `${p.color}20`, borderColor: p.color }
              : { backgroundColor: p.color, borderColor: p.color })]}>
              <EliteText style={[s.toggleText, p.enabled && { color: t.kind === 'dark' ? p.color : TEXT_COLORS.onAccent }]}>
                {p.label}
              </EliteText>
            </View>
          </AnimatedPressable>
        ))}
      </View>

      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#ef4444' }]} />
          <EliteText style={s.legendText}>Periodo</EliteText>
        </View>
        {enabledParams.map((p) => (
          <View key={String(p.key)} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: p.color }]} />
            <EliteText style={s.legendText}>{p.label}</EliteText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── La tarjeta del hub ─────────────────────────────────────────────────────

export function CicloResumen({ periodDays, avgEnergy, avgMood, logsCount }: {
  periodDays: number; avgEnergy: number; avgMood: number; logsCount: number;
}) {
  return (
    <>
      <SectionHeader icon={META.icon} color={META.accent} title="CICLO" />
      <StatsRow>
        <Stat value={`${periodDays}`} label="días periodo" />
        {avgEnergy > 0 && <Stat value={`${avgEnergy}`} label="energía prom" />}
        {avgMood > 0 && <Stat value={`${avgMood}`} label="humor prom" />}
        <Stat value={`${logsCount}`} label="registros" />
      </StatsRow>
    </>
  );
}

export const cicloDomain: ReportDomainDefinition<CicloReportData> = {
  key: 'ciclo',
  load: (_period, range) => loadCicloReport(range),
  isEmpty: (d) => d.cycles.length === 0 && d.logs.length === 0,
  toRows: (d) => cicloRows(d.cycles, d.logs),
  render: (d) => <CicloContent data={d} />,
  guard: CicloGuard,
};

const styles = StyleSheet.create({
  gateBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

type Styles = ReturnType<typeof makeStyles>;

// MB-31B2: los estilos leen los tokens del tema. El rosa como LETRA (cifras)
// solo vale en oscuro: sobre acero no alcanza AA y la cifra pasa a texto.
const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  avgTitle: { fontSize: 11, fontFamily: Fonts.bold, color: t.textoSecundario, letterSpacing: 2, marginBottom: Spacing.md },
  avgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  avgItem: { alignItems: 'center' },
  avgValue: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: t.kind === 'dark' ? ROSE : t.texto },
  avgLabel: { fontSize: 9, fontFamily: Fonts.semiBold, color: t.textoTenue, letterSpacing: 1, marginTop: 4 },
  avgDivider: { width: 1, height: 32, backgroundColor: t.borde },

  cycleCard: { marginBottom: Spacing.sm },
  cycleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cycleTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: t.texto },
  cycleDates: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: t.textoSecundario, marginTop: 2 },
  cycleLengthNum: { fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: t.kind === 'dark' ? ROSE : t.texto },
  cycleLengthLabel: { fontSize: 9, fontFamily: Fonts.semiBold, color: t.textoTenue, letterSpacing: 1 },
  cyclePeriodSub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: t.textoTenue, marginTop: 6 },

  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: {
    fontSize: FontSizes.sm, fontFamily: Fonts.regular, color: t.textoTenue,
    textAlign: 'center',
  },

  emptyChart: { height: CHART_H, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md },
  togglePill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    // Vidrio del kit (Card glass): translúcido claro sobre acero.
    backgroundColor: t.kind === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: t.kind === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,21,24,0.08)',
  },
  toggleText: { fontSize: FontSizes.xs, fontFamily: Fonts.bold, color: t.textoTenue },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: t.textoSecundario },
});
