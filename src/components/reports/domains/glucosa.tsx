/**
 * Dominio glucosa (NOCHE-REP) — la serie en el tiempo que el hub nunca tuvo,
 * más las cetonas y el índice que sale de las dos.
 *
 * Tres pestañas porque son tres preguntas: cómo anda mi glucosa, cómo andan
 * mis cetonas, y qué tan profunda es mi cetosis.
 *
 * LO QUE ESTA PANTALLA NO HACE: no dice que hubo autofagia. El índice se
 * reporta como profundidad de cetosis y nada más. Esa regla vive en
 * fasting-metrics-core con su prueba, y aquí se hereda sin negociar.
 *
 * Las bandas de glucosa y de cetonas tampoco se redefinen aquí: se leen de
 * mis-datos-core y de ketones-source-core, que son donde ya viven. Dos
 * semáforos del mismo valor acaban diciendo cosas distintas.
 */
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EliteText } from '@/components/elite-text';
import { SimpleLineChart } from '@/src/components/charts/SimpleCharts';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import { glucoseStatus, ketosisStatus } from '@/src/services/salud/mis-datos-core';
import { formatKetoneReading, type KetoneSource } from '@/src/services/salud/ketones-source-core';
import {
  porContexto, promedioPorDia, serieGki, huecosGki, copyHuecoGki, resumir,
  contextoLabel,
} from '@/src/services/reports/glucosa-report-core';
import {
  loadGlucosaReport, type GlucosaReportData,
} from '@/src/services/reports/glucosa-report-service';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import { ReportTabs, useReportTab } from '../ReportTabs';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.glucosa;

const TABS = [
  { key: 'glucosa', label: 'GLUCOSA' },
  { key: 'cetonas', label: 'CETONAS' },
  { key: 'indice', label: 'ÍNDICE' },
] as const;

type Tab = typeof TABS[number]['key'];

function diaCorto(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00`);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function GlucosaContent({ data }: { data: GlucosaReportData }) {
  const [tab, setTab] = useReportTab<Tab>(TABS, 'glucosa');
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);

  const diasGlucosa = useMemo(
    () => promedioPorDia(data.glucosa.map((r) => ({ date: r.date, valor: r.value_mg_dl }))),
    [data.glucosa],
  );
  const contextos = useMemo(() => porContexto(data.glucosa), [data.glucosa]);
  const gki = useMemo(() => serieGki(data.glucosa, data.cetonas), [data]);
  const huecos = useMemo(() => huecosGki(data.glucosa, data.cetonas), [data]);
  const avisoHueco = copyHuecoGki(huecos);

  const sangre = useMemo(
    () => data.cetonas.filter((c) => (c.source ?? 'blood') === 'blood' && c.value_mmol != null),
    [data.cetonas],
  );
  const resumenCetonas = useMemo(
    () => resumir(sangre.map((c) => c.value_mmol as number)),
    [sangre],
  );

  return (
    <View>
      <ReportTabs tabs={TABS} active={tab} onSelect={setTab} accent={META.accent} />

      {tab === 'glucosa' && (
        <>
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
            <EliteText style={[s.kicker, { color: t.textoSecundario }]}>PROMEDIO POR DÍA</EliteText>
            {diasGlucosa.length >= 2 ? (
              <View style={{ marginTop: Spacing.sm }}>
                <SimpleLineChart
                  data={diasGlucosa.map((d) => ({ label: diaCorto(d.date), value: d.valor }))}
                  color={META.accent}
                />
              </View>
            ) : (
              <EliteText style={[s.body, { color: t.textoSecundario }]}>
                Con un solo día medido no hay línea que trazar. Con dos ya se ve el movimiento.
              </EliteText>
            )}
          </View>

          {contextos.length === 0 ? (
            <EliteText style={[s.body, { color: t.textoSecundario }]}>
              No hay lecturas de glucosa en este rango.
            </EliteText>
          ) : (
            contextos.map((c) => {
              const estado = glucoseStatus(c.resumen.promedio);
              return (
                <View key={c.contexto} style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
                  <View style={s.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <EliteText style={[s.cardTitle, { color: t.texto }]}>{c.label}</EliteText>
                      <EliteText style={[s.sub, { color: t.textoTenue }]}>
                        {c.resumen.n} {c.resumen.n === 1 ? 'lectura' : 'lecturas'} · de {c.resumen.min} a {c.resumen.max}
                      </EliteText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <EliteText style={[s.bigNum, { color: t.texto }]}>{c.resumen.promedio}</EliteText>
                      <EliteText style={[s.sub, { color: t.textoTenue }]}>mg/dL prom</EliteText>
                    </View>
                  </View>
                  {estado && (
                    <EliteText style={[s.sub, { color: t.textoSecundario, marginTop: 6 }]}>
                      {estado.label}
                    </EliteText>
                  )}
                </View>
              );
            })
          )}
        </>
      )}

      {tab === 'cetonas' && (
        <>
          {resumenCetonas ? (
            <>
              <StatsRow>
                <Stat value={`${resumenCetonas.promedio}`} label="mmol/L prom" />
                <Stat value={`${resumenCetonas.max}`} label="máximo" />
                <Stat value={`${resumenCetonas.n}`} label="mediciones" />
              </StatsRow>
              {(() => {
                const estado = ketosisStatus(resumenCetonas.promedio);
                return estado ? (
                  <EliteText style={[s.footnote, { color: t.textoTenue }]}>
                    Tu promedio de sangre en este rango: {estado.label}.
                  </EliteText>
                ) : null;
              })()}
            </>
          ) : (
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
              <EliteText style={[s.cardTitle, { color: t.texto }]}>Sin cetonas de sangre en el rango</EliteText>
              <EliteText style={[s.body, { color: t.textoSecundario }]}>
                Las de aliento y las de tira de orina se listan abajo si las anotaste, pero el promedio y el índice solo salen de las de sangre.
              </EliteText>
            </View>
          )}

          {data.cetonas.length === 0 ? (
            <EliteText style={[s.body, { color: t.textoSecundario }]}>
              No hay mediciones de cetonas en este rango.
            </EliteText>
          ) : (
            data.cetonas.slice().reverse().map((c, i) => (
              <View key={`k-${i}`} style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
                <View style={s.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <EliteText style={[s.cardTitle, { color: t.texto }]}>{diaCorto(c.date)}</EliteText>
                    <EliteText style={[s.sub, { color: t.textoTenue }]}>
                      {c.source === 'breath' ? 'Aliento' : c.source === 'urine' ? 'Tira de orina' : 'Sangre'}
                    </EliteText>
                  </View>
                  <EliteText style={[s.bigNum, { color: t.texto }]}>
                    {formatKetoneReading({
                      source: (c.source ?? 'blood') as KetoneSource,
                      numeric: c.source === 'breath' ? c.value_ppm : c.value_mmol,
                      urineLevel: c.urine_level,
                    })}
                  </EliteText>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {tab === 'indice' && (
        <>
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
            <EliteText style={[s.kicker, { color: t.textoSecundario }]}>ÍNDICE GLUCOSA CETONAS</EliteText>
            <EliteText style={[s.body, { color: t.textoSecundario }]}>
              Se calcula con tu glucosa y tus cetonas del mismo día. Mide qué tan profunda es tu cetosis: entre más bajo, más profunda.
            </EliteText>
            {gki.length >= 2 && (
              <View style={{ marginTop: Spacing.sm }}>
                <SimpleLineChart
                  data={gki.map((p) => ({ label: diaCorto(p.date), value: p.gki }))}
                  color={META.accent}
                />
              </View>
            )}
          </View>

          {avisoHueco && (
            <View style={[s.aviso, { borderColor: t.bordeMarcado }]}>
              <Ionicons name="information-circle-outline" size={16} color={t.textoSecundario} />
              <EliteText style={[s.sub, { color: t.textoSecundario, flex: 1 }]}>{avisoHueco}</EliteText>
            </View>
          )}

          {gki.slice().reverse().map((p) => (
            <View key={p.date} style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
              <View style={s.rowBetween}>
                <View style={{ flex: 1 }}>
                  <EliteText style={[s.cardTitle, { color: t.texto }]}>{diaCorto(p.date)}</EliteText>
                  <EliteText style={[s.sub, { color: t.textoTenue }]}>
                    {p.glucosaMgDl} mg/dL · {p.cetonasMmol} mmol/L
                  </EliteText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <EliteText style={[s.bigNum, { color: t.texto }]}>{p.gki}</EliteText>
                  <EliteText style={[s.sub, { color: t.textoTenue }]}>{p.zona.label}</EliteText>
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// ── La tarjeta del hub ─────────────────────────────────────────────────────

export function GlucosaResumen({ avgFasting, avgPostMeal, readings }: {
  avgFasting: number; avgPostMeal: number; readings: number;
}) {
  return (
    <>
      <SectionHeader icon={META.icon} color={META.accent} title="GLUCOSA" />
      <StatsRow>
        <Stat value={avgFasting > 0 ? `${avgFasting}` : '—'} label="ayuno mg/dL" />
        <Stat value={avgPostMeal > 0 ? `${avgPostMeal}` : '—'} label="post comida" />
        <Stat value={`${readings}`} label="lecturas" />
      </StatsRow>
    </>
  );
}

export const glucosaDomain: ReportDomainDefinition<GlucosaReportData> = {
  key: 'glucosa',
  load: (_period, range) => loadGlucosaReport(range),
  isEmpty: (d) => d.glucosa.length === 0 && d.cetonas.length === 0,
  toRows: (d): ExportRow[] => {
    const rows: ExportRow[] = [];
    for (const r of d.glucosa) {
      rows.push({
        tipo: 'glucosa', fecha: r.date, hora: r.time,
        valor: r.value_mg_dl, unidad: 'mg/dL', contexto: contextoLabel(r.context),
      });
    }
    for (const c of d.cetonas) {
      rows.push({
        tipo: 'cetonas', fecha: c.date, hora: c.time,
        valor: c.value_mmol ?? c.value_ppm ?? c.urine_level,
        unidad: c.source === 'breath' ? 'ppm' : c.source === 'urine' ? 'nivel' : 'mmol/L',
        contexto: c.source === 'breath' ? 'Aliento' : c.source === 'urine' ? 'Tira de orina' : 'Sangre',
      });
    }
    for (const p of serieGki(d.glucosa, d.cetonas)) {
      rows.push({
        tipo: 'indice glucosa cetonas', fecha: p.date, valor: p.gki, unidad: 'indice',
        contexto: p.zona.label,
      });
    }
    return rows;
  },
  render: (d) => <GlucosaContent data={d} />,
};

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  card: { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  kicker: { fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  cardTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold },
  bigNum: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, marginTop: 2 },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular },
  body: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 19, marginTop: 6 },
  footnote: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, lineHeight: 16, marginBottom: Spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  aviso: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.sm,
  },
});
