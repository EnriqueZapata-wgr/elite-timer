/**
 * Dominio adherencia (OLA1 R-5) — el calendario y el compliance que vivían en
 * el hub, más las rachas y medallas de app/mente/progreso.tsx.
 *
 * Las rachas son adherencia, no contenido de Mente: por eso la pantalla de
 * progreso se muda aquí entera y no al dominio mente.
 *
 * Dos pestañas: Calendario (mes navegable + compliance del rango) y Rachas
 * (las cuatro del pilar Mente con su próxima medalla, la vitrina 7/30/90/365
 * y la racha del protocolo con su récord).
 */
import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SimpleBarChart } from '@/src/components/charts/SimpleCharts';
import { AdherenceCalendar } from '../AdherenceCalendar';
import { getMonthAdherence } from '@/src/services/reports/adherence-calendar-service';
import { shiftMonth, type FlagsByDate } from '@/src/services/reports/adherence-calendar-core';
import { ADHERENCE_THRESHOLD } from '@/src/services/adherence-service';
import {
  CATEGORY_COPY, MEDAL_TIERS, MENTE_CATEGORIES, nextMedalTarget, streakCopy,
  type MenteCategory,
} from '@/src/services/mente-streaks-core';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import {
  loadAdherenciaReport, type AdherenciaReportData,
} from '@/src/services/reports/adherencia-report-service';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import { ReportTabs, useReportTab } from '../ReportTabs';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.adherencia;
const LIME = ATP_BRAND.lime;
const GRADIENT = { start: 'rgba(168,224,42,0.08)', end: 'rgba(168,224,42,0.02)' };

const TABS = [
  { key: 'calendario', label: 'CALENDARIO' },
  { key: 'rachas', label: 'RACHAS' },
] as const;

type Tab = typeof TABS[number]['key'];

export function AdherenciaContent({ data }: { data: AdherenciaReportData }) {
  const [tab, setTab] = useReportTab<Tab>(TABS, 'calendario');
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);

  return (
    <View>
      <ReportTabs tabs={TABS} active={tab} onSelect={setTab} accent={META.accent} />
      {tab === 'calendario'
        ? <CalendarioTab data={data} s={s} t={t} />
        : <RachasTab data={data} s={s} t={t} />}
    </View>
  );
}

// ── Pestaña CALENDARIO ─────────────────────────────────────────────────────

/**
 * El calendario navega por MES y no por el rango del reporte: son dos ejes
 * distintos y mezclarlos haría que cambiar el rango moviera el mes que estás
 * mirando. El compliance de abajo sí es del rango.
 */
function CalendarioTab({ data, s, t }: { data: AdherenciaReportData; s: Styles; t: AppThemeTokens }) {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth0, setCalMonth0] = useState(now.getMonth());
  const [flags, setFlags] = useState<FlagsByDate>({});
  const atCurrentMonth = calYear === now.getFullYear() && calMonth0 === now.getMonth();

  useEffect(() => {
    let alive = true;
    getMonthAdherence(data.userId, calYear, calMonth0)
      .then((f) => { if (alive) setFlags(f); })
      .catch(() => { if (alive) setFlags({}); });
    return () => { alive = false; };
  }, [data.userId, calYear, calMonth0]);

  function shiftCalendar(delta: -1 | 1) {
    const [y, m] = shiftMonth(calYear, calMonth0, delta);
    setCalYear(y); setCalMonth0(m);
  }

  const { compliance } = data;

  return (
    <View>
      <GradientCard gradient={{ start: 'rgba(26,188,156,0.08)', end: 'rgba(26,188,156,0.02)' }}>
        <AdherenceCalendar
          year={calYear} month0={calMonth0} flags={flags}
          onShift={shiftCalendar} atCurrentMonth={atCurrentMonth}
        />
      </GradientCard>

      <View style={{ height: Spacing.sm }} />

      <GradientCard gradient={GRADIENT}>
        <SectionHeader icon="checkmark-done-outline" color={LIME} title="COMPLIANCE" />
        <Stat value={compliance.avgPct > 0 ? `${compliance.avgPct}%` : '—'} label="promedio del rango" />
        {/* La meta es ADHERENCE_THRESHOLD, el mismo 75 que decide si un día
            cuenta para la racha del protocolo. Una sola cifra, no dos. */}
        {compliance.daily.length > 0 && (
          <SimpleBarChart data={compliance.daily} color={LIME} target={ADHERENCE_THRESHOLD} colorByTarget />
        )}
        <EliteText style={s.note}>
          Un día cuenta como cumplido a partir de {ADHERENCE_THRESHOLD}%.
        </EliteText>
      </GradientCard>
    </View>
  );
}

// ── Pestaña RACHAS ─────────────────────────────────────────────────────────

function RachasTab({ data, s, t }: { data: AdherenciaReportData; s: Styles; t: AppThemeTokens }) {
  const { kind } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const { streaks, medals, justAwarded, record } = data;

  const medalFor = (cat: MenteCategory, tier: string) =>
    medals.find((m) => m.category === cat && m.tier === tier);

  return (
    <View>
      {/* La racha del protocolo: la que manda el ATP Score del día. */}
      <GradientCard gradient={GRADIENT}>
        <SectionHeader icon="flame-outline" color={LIME} title="RACHA DEL PROTOCOLO" />
        {record ? (
          <StatsRow>
            <Stat value={`${record.current}`} label="días seguidos" />
            <Stat value={`${record.longest}`} label="tu récord" />
          </StatsRow>
        ) : (
          <EliteText style={s.note}>
            Tu racha del protocolo no se pudo leer. Un cero aquí sería mentira, así que no lo ponemos.
          </EliteText>
        )}
        <EliteText style={s.note}>
          Cuenta días de calendario con al menos {ADHERENCE_THRESHOLD}% de tu protocolo. Un día flojo aislado
          no la rompe; dos seguidos sí.
        </EliteText>
      </GradientCard>

      <View style={{ height: Spacing.md }} />

      {/* D-2 (MB-12): falló ≠ rachas en 0 — se dice la verdad */}
      {streaks === null && (
        <View style={[s.streakCard, { backgroundColor: t.card, borderColor: t.borde }]}>
          <View style={[s.streakLeft, { backgroundColor: t.flotante }]}>
            <Ionicons name="cloud-offline-outline" size={20} color={t.textoTenue} />
          </View>
          <View style={{ flex: 1 }}>
            <EliteText style={[s.streakLabel, { color: t.textoSecundario }]}>Tus rachas no se pudieron leer</EliteText>
            <EliteText style={[s.streakNext, { color: t.textoTenue }]}>
              Revisa tu conexión y vuelve a entrar. Tus datos siguen ahí.
            </EliteText>
          </View>
        </View>
      )}

      {streaks && MENTE_CATEGORIES.map((cat, idx) => {
        const copy = CATEGORY_COPY[cat];
        const streak = streaks[cat];
        const next = nextMedalTarget(streak);
        return (
          <Animated.View key={cat} entering={FadeInUp.delay(50 + idx * 60).springify()}>
            <View style={[s.streakCard, { backgroundColor: t.card, borderColor: t.borde }]}>
              <View style={[s.streakLeft, { backgroundColor: t.flotante }]}>
                {/* P6: nombre lógico del registro, no un Ionicon a mano. */}
                <AppIcon name={copy.icon} size={20} color={streak > 0 ? ATP_BRAND.lime : t.textoTenue} />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.streakLabel, { color: t.textoSecundario }]}>{copy.label}</EliteText>
                <EliteText style={[s.streakValue, { color: streak === 0 ? t.textoTenue : t.texto }]}>
                  {streakCopy(streak)}
                </EliteText>
                <EliteText style={[s.streakNext, { color: t.textoTenue }]}>
                  {next
                    ? `Próxima medalla: ${MEDAL_TIERS.find((m) => m.tier === next.tier)?.label} · faltan ${next.remaining} días`
                    : 'Medalla de 1 año conseguida. Leyenda.'}
                </EliteText>
              </View>
              {streak > 0 && (
                <View style={s.fireBadge}>
                  <EliteText style={[s.fireText, { color: acento }]}>{streak}</EliteText>
                </View>
              )}
            </View>
          </Animated.View>
        );
      })}

      {/* Vitrina de medallas */}
      {streaks && (
        <Animated.View entering={FadeInUp.delay(320).springify()}>
          <EliteText style={[s.sectionLabel, { color: t.textoSecundario }]}>MEDALLAS</EliteText>
          <View style={[s.medalGrid, { backgroundColor: t.card, borderColor: t.borde }]}>
            {MENTE_CATEGORIES.map((cat) => (
              <View key={cat} style={s.medalRow}>
                <EliteText style={[s.medalRowLabel, { color: t.texto }]}>{CATEGORY_COPY[cat].label}</EliteText>
                <View style={s.medalRowTiers}>
                  {MEDAL_TIERS.map((tier) => {
                    const earned = medalFor(cat, tier.tier);
                    const isNew = justAwarded.includes(`${cat}-${tier.tier}`);
                    return (
                      <View
                        key={tier.tier}
                        style={[
                          s.medal,
                          { borderColor: t.borde },
                          earned && s.medalEarned,
                          isNew && s.medalNew,
                        ]}
                      >
                        <EliteText style={[s.medalText, { color: earned ? acento : t.sinDatos }]}>
                          {tier.tier}
                        </EliteText>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
          <EliteText style={[s.legend, { color: t.textoTenue }]}>
            7 días · 30 días · 90 días · 365 días consecutivos
          </EliteText>
        </Animated.View>
      )}

      <View style={s.quoteBox}>
        <EliteText style={[s.quote, { color: t.textoSecundario }]}>
          La constancia no se negocia con motivación. Se construye con sistemas.
        </EliteText>
      </View>
    </View>
  );
}

// ── La tarjeta del hub ─────────────────────────────────────────────────────

export function AdherenciaResumen({ avgPct, streak }: { avgPct: number; streak: number | null }) {
  return (
    <>
      <SectionHeader icon={META.icon} color={META.accent} title="ADHERENCIA" />
      <StatsRow>
        <Stat value={avgPct > 0 ? `${avgPct}%` : '—'} label="compliance" />
        <Stat value={streak != null ? `${streak}` : '—'} label="racha" />
      </StatsRow>
    </>
  );
}

export const adherenciaDomain: ReportDomainDefinition<AdherenciaReportData> = {
  key: 'adherencia',
  load: (period) => loadAdherenciaReport(period),
  // El calendario del mes se lee dentro de la pestaña, así que "vacío" es no
  // tener NI compliance NI rachas: con cualquiera de las dos hay qué contar.
  isEmpty: (d) =>
    d.compliance.daily.length === 0
    && (d.record?.current ?? 0) === 0
    && (d.record?.longest ?? 0) === 0
    && (d.streaks == null || MENTE_CATEGORIES.every((c) => d.streaks![c] === 0)),
  toRows: (d): ExportRow[] => {
    const rows: ExportRow[] = d.compliance.daily.map((p: { date: string; value: number }) => ({
      tipo: 'dia',
      fecha: p.date,
      compliance_pct: p.value,
      cumplido: p.value >= ADHERENCE_THRESHOLD ? 'si' : 'no',
    }));
    if (d.record) {
      rows.push({ tipo: 'racha', metrica: 'protocolo actual', valor: d.record.current });
      rows.push({ tipo: 'racha', metrica: 'protocolo record', valor: d.record.longest });
    }
    if (d.streaks) {
      for (const cat of MENTE_CATEGORIES) {
        rows.push({ tipo: 'racha', metrica: CATEGORY_COPY[cat].label, valor: d.streaks[cat] });
      }
    }
    for (const m of d.medals) {
      rows.push({ tipo: 'medalla', metrica: `${m.category} ${m.tier}`, fecha: m.awarded_at.slice(0, 10) });
    }
    return rows;
  },
  render: (d) => <AdherenciaContent data={d} />,
};

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  note: {
    fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: t.textoTenue,
    lineHeight: 16, marginTop: Spacing.xs,
  },

  streakCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 0.5, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  streakLeft: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  streakLabel: {
    fontFamily: Fonts.semiBold, fontSize: FontSizes.xs,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  streakValue: { fontFamily: Fonts.extraBold, fontSize: FontSizes.xl, marginTop: 2 },
  streakNext: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 2 },
  fireBadge: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
  },
  fireText: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },

  sectionLabel: {
    fontSize: 11, letterSpacing: 2, fontFamily: Fonts.semiBold,
    textTransform: 'uppercase', marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  medalGrid: { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
  medalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  medalRowLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm },
  medalRowTiers: { flexDirection: 'row', gap: 6 },
  medal: {
    minWidth: 44, alignItems: 'center', borderRadius: Radius.pill,
    borderWidth: 1, paddingVertical: 4, paddingHorizontal: 6,
  },
  medalEarned: {
    borderColor: withOpacity(ATP_BRAND.lime, 0.5),
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.10),
  },
  medalNew: { borderColor: ATP_BRAND.lime, backgroundColor: withOpacity(ATP_BRAND.lime, 0.22) },
  medalText: { fontFamily: Fonts.bold, fontSize: FontSizes.xs },
  legend: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.sm },

  quoteBox: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  quote: {
    fontFamily: Fonts.semiBold, fontSize: FontSizes.md,
    textAlign: 'center', fontStyle: 'italic', lineHeight: 22,
  },
});
