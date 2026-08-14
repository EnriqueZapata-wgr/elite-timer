/**
 * Dominio nback (OLA1 R-4) — absorbe app/mente/nback/stats.tsx completo, con
 * sus tres pestañas: Resumen (totales y percentiles), Reto (la curva de 20
 * días) y Ranking, que sigue en PRONTO.
 *
 * El Ranking se conserva tal cual, con su promesa y su letra chica: el
 * leaderboard exige opt-in público (Comunidad) y la migración 197 prohíbe leer
 * estas tablas cruzando usuarios. Borrar la pestaña sería esconder el plan;
 * prenderla sería contradecir la doctrina.
 *
 * Este dominio NO usa el rango del shell: los totales son de siempre y el reto
 * dura lo que dura. Ofrecer pills que no cambian nada seria un control de
 * mentira.
 */
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line as SvgLine } from 'react-native-svg';

import { EliteText } from '@/components/elite-text';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { NBACK_CONFIG, badgeForBestN } from '@/src/services/nback-core';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import {
  loadNbackReport, type NbackReportData,
} from '@/src/services/reports/nback-report-service';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import { ReportTabs, useReportTab } from '../ReportTabs';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.nback;
const CHART_W = 320;
const CHART_H = 140;

const TABS = [
  { key: 'resumen', label: 'RESUMEN' },
  { key: 'reto', label: 'RETO' },
  { key: 'ranking', label: 'RANKING' },
] as const;

type Tab = typeof TABS[number]['key'];

export function NbackContent({ data }: { data: NbackReportData }) {
  const [tab, setTab] = useReportTab<Tab>(TABS, 'resumen');
  const tk = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(tk), [tk]);
  const { state, challenge, percentiles: pct } = data;

  const chart = useMemo(() => {
    const points = challenge?.points ?? [];
    if (points.length === 0) return null;
    const maxN = Math.max(2, ...points.map((p) => p.avgN));
    const stepX = points.length > 1 ? CHART_W / (points.length - 1) : 0;
    const coords = points.map((p, i) => {
      const x = points.length > 1 ? i * stepX : CHART_W / 2;
      const y = CHART_H - (p.avgN / maxN) * (CHART_H - 16) - 8;
      return `${x},${y}`;
    });
    return { coords: coords.join(' '), maxN };
  }, [challenge]);

  const badge = badgeForBestN(state.best_n ?? NBACK_CONFIG.N_START);

  return (
    <View>
      <ReportTabs tabs={TABS} active={tab} onSelect={setTab} accent={META.accent} />

      {tab === 'resumen' && (
        <>
          <StatCard
            label="ROUNDS TOTALES"
            value={`${state.sessions_total ?? 0}`}
            percentile={pct ? `Igualas o superas al ${pct.sessionsPct}% de usuarios` : undefined}
          />
          <StatCard
            label="RACHA ACTUAL"
            value={`${state.streak_days ?? 0} ${state.streak_days === 1 ? 'día' : 'días'}`}
            percentile={pct ? `Igualas o superas al ${pct.streakPct}%` : undefined}
          />
          <StatCard
            label="NIVEL MÁXIMO"
            value={`N = ${state.best_n ?? NBACK_CONFIG.N_START}`}
            percentile={pct ? `Igualas o superas al ${pct.bestNPct}%` : undefined}
            extra={`${badge.emoji} ${badge.label}`}
          />
          <StatCard label="TIEMPO ENTRENADO" value={`${state.time_practiced_total_min ?? 0} min`} />
        </>
      )}

      {tab === 'reto' && (
        <>
          <View style={[s.card, { backgroundColor: tk.card, borderColor: tk.borde }]}>
            <EliteText style={[s.cardKicker, { color: tk.textoSecundario }]}>NIVEL A LO LARGO DEL RETO</EliteText>
            {chart ? (
              <>
                <Svg width={CHART_W} height={CHART_H} style={{ alignSelf: 'center', marginTop: Spacing.sm }}>
                  <SvgLine x1={0} y1={CHART_H - 8} x2={CHART_W} y2={CHART_H - 8} stroke={tk.borde} strokeWidth={1} />
                  <Polyline
                    points={chart.coords}
                    fill="none"
                    stroke={ATP_BRAND.lime}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </Svg>
                <EliteText style={[s.chartHint, { color: tk.textoTenue }]}>
                  Máx del periodo: N = {chart.maxN.toFixed(1)}
                </EliteText>
              </>
            ) : (
              <EliteText style={[s.empty, { color: tk.textoSecundario }]}>
                Completa tu primer round para ver tu curva.
              </EliteText>
            )}
          </View>
          <View style={s.miniGrid}>
            <MiniStat label="Días activos" value={`${challenge?.activeDays ?? 0}/${NBACK_CONFIG.CHALLENGE_DAYS}`} />
            <MiniStat label="Nivel promedio" value={(challenge?.avgLevel ?? 0).toFixed(1)} />
            <MiniStat label="Visual" value={`${challenge?.avgVisualPct ?? 0}%`} />
            <MiniStat label="Auditivo" value={`${challenge?.avgAudioPct ?? 0}%`} />
          </View>
        </>
      )}

      {tab === 'ranking' && (
        <View style={[s.card, { backgroundColor: tk.card, borderColor: tk.borde }]}>
          <View style={s.soonBadge}>
            <EliteText style={[s.soonText, { color: tk.textoSecundario }]}>PRONTO</EliteText>
          </View>
          <EliteText style={[s.cardTitle, { color: tk.texto }]}>Leaderboard de la comunidad</EliteText>
          <EliteText style={[s.empty, { color: tk.textoSecundario }]}>
            Compite por N máximo y racha, estilo Strava. Llega con el módulo
            Comunidad. Tus datos cognitivos son privados y solo entran al
            ranking si tú decides compartirlos (opt-in).
          </EliteText>
        </View>
      )}

      <View style={{ height: Spacing.sm }} />
      <EliteText style={[s.footnote, { color: tk.textoTenue }]}>
        Estas cifras son tu acumulado completo, no del rango: por eso esta pantalla no lleva selector.
      </EliteText>
    </View>
  );
}

function StatCard({ label, value, percentile, extra }: {
  label: string; value: string; percentile?: string; extra?: string;
}) {
  // MB-31B3: tokens del tema (acento de texto en claro = teal, regla 1).
  const { kind, tokens: tk } = useAppTheme();
  const s = useMemo(() => makeStyles(tk), [tk]);
  const acento = kind === 'dark' ? ATP_BRAND.lime : tk.tealTexto;
  return (
    <View style={[s.card, { backgroundColor: tk.card, borderColor: tk.borde }]}>
      <EliteText style={[s.cardKicker, { color: tk.textoSecundario }]}>{label}</EliteText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <EliteText style={[s.statValue, { color: tk.texto }]}>{value}</EliteText>
        {extra && <EliteText style={s.statExtra}>{extra}</EliteText>}
      </View>
      {percentile && <EliteText style={[s.statPct, { color: acento }]}>{percentile}</EliteText>}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { tokens: tk } = useAppTheme();
  const s = useMemo(() => makeStyles(tk), [tk]);
  return (
    <View style={[s.miniStat, { backgroundColor: tk.card, borderColor: tk.borde }]}>
      <EliteText style={[s.miniValue, { color: tk.texto }]}>{value}</EliteText>
      <EliteText style={[s.miniLabel, { color: tk.textoTenue }]}>{label}</EliteText>
    </View>
  );
}

/** La tarjeta del hub: las dos cifras que resumen el entrenamiento. */
export function NbackResumen({ rounds, bestN }: { rounds: number; bestN: number }) {
  return (
    <>
      <SectionHeader icon={META.icon} color={META.accent} title="N-BACK" />
      <StatsRow>
        <Stat value={`${rounds}`} label="rounds" />
        <Stat value={`N = ${bestN}`} label="nivel máximo" />
      </StatsRow>
    </>
  );
}

export const nbackDomain: ReportDomainDefinition<NbackReportData> = {
  key: 'nback',
  fixedRange: 'all',
  load: () => loadNbackReport(),
  isEmpty: (d) => (d.state.sessions_total ?? 0) === 0,
  toRows: (d): ExportRow[] => {
    const rows: ExportRow[] = [
      { tipo: 'total', metrica: 'rounds totales', valor: d.state.sessions_total },
      { tipo: 'total', metrica: 'nivel maximo', valor: d.state.best_n },
      { tipo: 'total', metrica: 'nivel actual', valor: d.state.current_n },
      { tipo: 'total', metrica: 'racha en dias', valor: d.state.streak_days },
      { tipo: 'total', metrica: 'minutos entrenados', valor: d.state.time_practiced_total_min },
    ];
    for (const p of d.challenge?.points ?? []) {
      rows.push({ tipo: 'dia del reto', fecha: p.date, nivel_promedio: p.avgN, rounds: p.rounds });
    }
    return rows;
  },
  render: (d) => <NbackContent data={d} />,
};

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  card: { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardKicker: { fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  cardTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, marginTop: 6 },
  statValue: { fontSize: 32, fontFamily: Fonts.extraBold, marginTop: 4 },
  statExtra: { color: '#b9b3f0', fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  statPct: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, marginTop: 4 },
  chartHint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 6 },
  empty: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, marginTop: 8, lineHeight: 20 },

  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  miniStat: {
    flexBasis: '47%', flexGrow: 1, borderWidth: 0.5,
    borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center',
  },
  miniValue: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold },
  miniLabel: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 2 },

  soonBadge: {
    alignSelf: 'flex-start', backgroundColor: withOpacity(t.texto, 0.08),
    borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6,
  },
  soonText: { fontSize: 10, fontFamily: Fonts.bold, letterSpacing: 2 },
  footnote: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, lineHeight: 16 },
});
