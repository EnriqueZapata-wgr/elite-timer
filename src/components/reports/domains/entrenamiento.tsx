/**
 * Dominio entrenamiento (NOCHE-REP) — el reporte que le faltaba al pilar
 * FITNESS. Tres pestañas: Sesiones (qué hiciste y cuánto duró), Volumen (los
 * kilos que moviste, día por día) y Fuerza (cómo se movieron tus marcas).
 *
 * La tarjeta del hub deja de ser una cifra muda y pasa a ser la puerta: es LA
 * misma pantalla que se abre desde el pilar, y el atrás regresa a donde
 * entraste.
 *
 * La adherencia al plan vive AQUÍ y no en el dominio adherencia: aquel mide el
 * protocolo completo del día; este mide una sola cosa, si entrenaste los días
 * que dijiste que ibas a entrenar. Son dos preguntas distintas.
 */
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EliteText } from '@/components/elite-text';
import { SimpleBarChart } from '@/src/components/charts/SimpleCharts';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import {
  volumenPorDia, resumenVolumen, progresionDeFuerza, adherenciaAlPlan,
  formatDuracion, SIN_COMPARACION, SIN_META_COPY,
} from '@/src/services/reports/entrenamiento-report-core';
import {
  loadEntrenamientoReport, type EntrenamientoReportData,
} from '@/src/services/reports/entrenamiento-report-service';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import { ReportTabs, useReportTab } from '../ReportTabs';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.entrenamiento;

const TABS = [
  { key: 'sesiones', label: 'SESIONES' },
  { key: 'volumen', label: 'VOLUMEN' },
  { key: 'fuerza', label: 'FUERZA' },
] as const;

type Tab = typeof TABS[number]['key'];

/** Kilos a una cifra que se lee de un vistazo: toneladas arriba de mil. */
function formatKg(kg: number): string {
  if (kg <= 0) return '0';
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;
}

function diaCorto(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00`);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export function EntrenamientoContent({ data }: { data: EntrenamientoReportData }) {
  const [tab, setTab] = useReportTab<Tab>(TABS, 'sesiones');
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);

  const dias = useMemo(() => volumenPorDia(data.sets), [data.sets]);
  const resumen = useMemo(() => resumenVolumen(dias), [dias]);
  const progresion = useMemo(() => progresionDeFuerza(data.prs), [data.prs]);

  return (
    <View>
      <ReportTabs tabs={TABS} active={tab} onSelect={setTab} accent={META.accent} />

      {tab === 'sesiones' && <SesionesTab data={data} s={s} t={t} />}

      {tab === 'volumen' && (
        <>
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
            <EliteText style={[s.kicker, { color: t.textoSecundario }]}>KILOS MOVIDOS POR DÍA</EliteText>
            {dias.length > 0 ? (
              <View style={{ marginTop: Spacing.sm }}>
                <SimpleBarChart
                  data={dias.map((d) => ({ label: diaCorto(d.date), value: d.kg }))}
                  color={META.accent}
                  unit="kg"
                />
              </View>
            ) : (
              <EliteText style={[s.body, { color: t.textoSecundario }]}>
                No hay sets con peso anotado en este rango. El peso corporal cuenta como set pero no suma kilos.
              </EliteText>
            )}
          </View>

          <StatsRow>
            <Stat value={formatKg(resumen.totalKg)} label="volumen total" />
            <Stat value={`${resumen.totalSets}`} label="sets" />
            <Stat value={`${resumen.diasEntrenados}`} label="días" />
          </StatsRow>

          {resumen.mejorDia && (
            <EliteText style={[s.footnote, { color: t.textoTenue }]}>
              Tu día más pesado del rango fue el {diaCorto(resumen.mejorDia.date)} con {formatKg(resumen.mejorDia.kg)} en {resumen.mejorDia.sets} sets.
            </EliteText>
          )}
        </>
      )}

      {tab === 'fuerza' && (
        <>
          {progresion.length === 0 ? (
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
              <EliteText style={[s.cardTitle, { color: t.texto }]}>Sin marcas en este rango</EliteText>
              <EliteText style={[s.body, { color: t.textoSecundario }]}>
                Aquí aparece cada ejercicio con su mejor marca y cuánto se movió contra la anterior. Se llena solo cuando registras una serie que supera lo que ya tenías.
              </EliteText>
            </View>
          ) : (
            progresion.map((p) => (
              <View key={p.ejercicio} style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
                <View style={s.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <EliteText style={[s.cardTitle, { color: t.texto }]}>{p.ejercicio}</EliteText>
                    <EliteText style={[s.sub, { color: t.textoTenue }]}>
                      {diaCorto(p.actualFecha)} · {p.marcas} {p.marcas === 1 ? 'marca' : 'marcas'}
                    </EliteText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <EliteText style={[s.bigNum, { color: t.texto }]}>{p.actual}</EliteText>
                    <EliteText style={[s.sub, { color: t.textoTenue }]}>kg estimados</EliteText>
                  </View>
                </View>
                {p.delta == null ? (
                  <EliteText style={[s.sub, { color: t.textoTenue, marginTop: 6 }]}>{SIN_COMPARACION}</EliteText>
                ) : (
                  <View style={[s.deltaRow, { marginTop: 6 }]}>
                    <Ionicons
                      name={p.delta > 0 ? 'trending-up' : p.delta < 0 ? 'trending-down' : 'remove'}
                      size={14}
                      color={p.delta > 0 ? META.accent : p.delta < 0 ? t.error : t.textoTenue}
                    />
                    <EliteText style={[s.sub, { color: t.textoSecundario }]}>
                      {p.delta > 0 ? `Subió ${p.delta} kg` : p.delta < 0 ? `Bajó ${Math.abs(p.delta)} kg` : 'Igual'} contra tu marca anterior de {p.anterior} kg
                    </EliteText>
                  </View>
                )}
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}

// ── Pestaña SESIONES ───────────────────────────────────────────────────────

function SesionesTab({ data, s, t }: {
  data: EntrenamientoReportData; s: Styles; t: AppThemeTokens;
}) {
  const diasConEntreno = useMemo(() => [
    ...data.sessions.map((x) => x.date),
    ...data.cardio.map((x) => x.date),
    ...data.sets.map((x) => x.date ?? ''),
  ].filter(Boolean), [data]);

  const plan = useMemo(
    () => adherenciaAlPlan(diasConEntreno, data.metaSemanal, null),
    [diasConEntreno, data.metaSemanal],
  );

  return (
    <View>
      <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
        <EliteText style={[s.kicker, { color: t.textoSecundario }]}>APEGO A TU PLAN</EliteText>
        {plan.tieneMeta ? (
          <>
            <EliteText style={[s.bigNum, { color: t.texto }]}>{plan.pct}%</EliteText>
            <EliteText style={[s.body, { color: t.textoSecundario }]}>
              Entrenaste {plan.hechas} de los {plan.esperadas} días que tocaban con tu meta de {plan.metaSemanal} por semana.
            </EliteText>
          </>
        ) : (
          <EliteText style={[s.body, { color: t.textoSecundario }]}>{SIN_META_COPY}</EliteText>
        )}
      </View>

      <StatsRow>
        <Stat value={`${data.sessions.length}`} label="sesiones fuerza" />
        <Stat value={`${data.cardio.length}`} label="cardio" />
        <Stat value={`${data.prs.length}`} label="marcas" />
      </StatsRow>

      {data.sessions.length === 0 && data.cardio.length === 0 && (
        <EliteText style={[s.footnote, { color: t.textoTenue }]}>
          Hay sets sueltos en este rango pero ninguna sesión cerrada. Los sets cuentan igual para tu volumen.
        </EliteText>
      )}

      {data.sessions.map((x) => {
        const dur = formatDuracion(x.duration_seconds);
        return (
          <View key={x.id} style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
            <View style={s.rowBetween}>
              <View style={{ flex: 1 }}>
                <EliteText style={[s.cardTitle, { color: t.texto }]}>
                  {x.routine_name?.trim() || 'Entrenamiento'}
                </EliteText>
                <EliteText style={[s.sub, { color: t.textoTenue }]}>
                  {diaCorto(x.date)}{dur ? ` · ${dur}` : ''}
                </EliteText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <EliteText style={[s.bigNum, { color: t.texto }]}>{formatKg(x.volume_kg ?? 0)}</EliteText>
                <EliteText style={[s.sub, { color: t.textoTenue }]}>
                  {x.sets_count ?? 0} sets · {x.exercises_count ?? 0} ejercicios
                </EliteText>
              </View>
            </View>
            {(x.prs_count ?? 0) > 0 && (
              <View style={[s.deltaRow, { marginTop: 6 }]}>
                <Ionicons name="trophy-outline" size={14} color={META.accent} />
                <EliteText style={[s.sub, { color: t.textoSecundario }]}>
                  {x.prs_count} {x.prs_count === 1 ? 'marca nueva' : 'marcas nuevas'} ese día
                </EliteText>
              </View>
            )}
          </View>
        );
      })}

      {data.cardio.map((x, i) => (
        <View key={`c-${i}`} style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
          <View style={s.rowBetween}>
            <View style={{ flex: 1 }}>
              <EliteText style={[s.cardTitle, { color: t.texto }]}>{x.discipline?.trim() || 'Cardio'}</EliteText>
              <EliteText style={[s.sub, { color: t.textoTenue }]}>{diaCorto(x.date)}</EliteText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <EliteText style={[s.bigNum, { color: t.texto }]}>
                {formatDuracion(x.duration_seconds) ?? '—'}
              </EliteText>
              {x.distance_meters != null && x.distance_meters > 0 && (
                <EliteText style={[s.sub, { color: t.textoTenue }]}>
                  {(x.distance_meters / 1000).toFixed(1)} km
                </EliteText>
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── La tarjeta del hub ─────────────────────────────────────────────────────

export function EntrenamientoResumen({ sessionsPerWeek, totalVolumeKg, prs, cardio }: {
  sessionsPerWeek: number; totalVolumeKg: number; prs: number; cardio: number;
}) {
  return (
    <>
      <SectionHeader icon={META.icon} color={META.accent} title="ENTRENAMIENTO" />
      <StatsRow>
        <Stat value={`${sessionsPerWeek}`} label="sesiones/sem" />
        <Stat value={totalVolumeKg > 0 ? formatKg(totalVolumeKg) : '—'} label="volumen" />
        <Stat value={`${prs}`} label="marcas" />
        <Stat value={`${cardio}`} label="cardio" />
      </StatsRow>
    </>
  );
}

export const entrenamientoDomain: ReportDomainDefinition<EntrenamientoReportData> = {
  key: 'entrenamiento',
  load: (_period, range) => loadEntrenamientoReport(range),
  isEmpty: (d) => d.sessions.length === 0 && d.sets.length === 0 && d.cardio.length === 0,
  toRows: (d): ExportRow[] => {
    const rows: ExportRow[] = [];
    for (const x of d.sessions) {
      rows.push({
        tipo: 'sesion fuerza', fecha: x.date, nombre: x.routine_name,
        duracion_segundos: x.duration_seconds, ejercicios: x.exercises_count,
        sets: x.sets_count, volumen_kg: x.volume_kg, marcas: x.prs_count, origen: x.source,
      });
    }
    for (const x of d.cardio) {
      rows.push({
        tipo: 'cardio', fecha: x.date, nombre: x.discipline,
        duracion_segundos: x.duration_seconds, distancia_metros: x.distance_meters,
      });
    }
    for (const x of volumenPorDia(d.sets)) {
      rows.push({ tipo: 'volumen diario', fecha: x.date, volumen_kg: x.kg, sets: x.sets });
    }
    for (const x of d.prs) {
      rows.push({
        tipo: 'marca', fecha: x.achieved_at, nombre: x.exercise_name,
        peso_kg: x.weight_kg, repeticiones: x.rep_range, rm_estimado: x.estimated_1rm,
      });
    }
    return rows;
  },
  render: (d) => <EntrenamientoContent data={d} />,
};

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  card: { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  kicker: { fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  cardTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold },
  bigNum: { fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, marginTop: 2 },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular },
  body: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 19, marginTop: 6 },
  footnote: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, lineHeight: 16, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
