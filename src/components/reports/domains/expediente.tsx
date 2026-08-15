/**
 * Dominio expediente (NOCHE-REP) — la vista consolidada: qué hay guardado de
 * ti, de dónde viene, y cuándo fue lo último de cada fuente.
 *
 * NO DUPLICA /salud/mi-lectura. Aquella INTERPRETA: cruza fuentes, enciende
 * patrones y saca reglas. Esta MUESTRA: cuántos registros hay y de cuándo. Una
 * dice qué significa, la otra dice cuánto hay. El enlace a la lectura se pinta
 * arriba de la línea de tiempo, con una frase que explica la diferencia para
 * que nadie se pregunte por qué hay dos pantallas.
 *
 * Tampoco reescribe el timeline: usa buildTimeline de mi-expediente-core.
 */
import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';

import { EliteText } from '@/components/elite-text';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import {
  buildTimeline, groupByMonth, iconFor, shortDate,
} from '@/src/services/salud/mi-expediente-core';
import {
  construirInventario, estadoDe, fraseEstado, fuentesVacias,
  type FuenteInventario,
} from '@/src/services/reports/expediente-report-core';
import {
  loadExpedienteReport, type ExpedienteReportData,
} from '@/src/services/reports/expediente-report-service';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import { ReportTabs, useReportTab } from '../ReportTabs';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.expediente;
/** Eventos que se pintan antes de ofrecer el resto. Más se vuelve ilegible. */
const EVENTOS_VISIBLES = 60;

const TABS = [
  { key: 'inventario', label: 'INVENTARIO' },
  { key: 'linea', label: 'LÍNEA DE TIEMPO' },
] as const;

type Tab = typeof TABS[number]['key'];

function fechaCorta(iso: string | null): string {
  if (!iso) return 'sin registros';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'sin registros';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function ExpedienteContent({ data }: { data: ExpedienteReportData }) {
  const [tab, setTab] = useReportTab<Tab>(TABS, 'inventario');
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const [verTodo, setVerTodo] = useState(false);

  const inventario = useMemo(() => construirInventario(data.fuentes), [data.fuentes]);
  const estado = useMemo(() => estadoDe(inventario), [inventario]);
  const vacias = useMemo(() => fuentesVacias(inventario), [inventario]);
  const eventos = useMemo(() => buildTimeline(data.fuentes), [data.fuentes]);
  const visibles = verTodo ? eventos : eventos.slice(0, EVENTOS_VISIBLES);
  const grupos = useMemo(() => groupByMonth(visibles), [visibles]);

  return (
    <View>
      <ReportTabs tabs={TABS} active={tab} onSelect={setTab} accent={META.accent} />

      {/* Una fuente caída se dice SIEMPRE, en las dos pestañas: si se callara,
          la persona leería un expediente incompleto creyendo que está entero. */}
      {data.caidas.length > 0 && (
        <View style={[s.aviso, { borderColor: t.error }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={t.error} />
          <EliteText style={[s.sub, { color: t.textoSecundario, flex: 1 }]}>
            {data.caidas.length === 1 ? 'Una fuente no cargó' : `${data.caidas.length} fuentes no cargaron`} y lo que ves está incompleto. Tus registros están, no llegamos a ellos.
          </EliteText>
        </View>
      )}

      {tab === 'inventario' && (
        <>
          <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
            <View style={s.rowBetween}>
              <EliteText style={[s.kicker, { color: t.textoSecundario }]}>{estado.etiqueta.toUpperCase()}</EliteText>
              <View style={[s.chip, { backgroundColor: withOpacity(META.accent, 0.14) }]}>
                <EliteText style={[s.chipText, { color: META.accent }]}>{estado.pct}%</EliteText>
              </View>
            </View>
            <EliteText style={[s.body, { color: t.texto }]}>{fraseEstado(estado)}</EliteText>
          </View>

          {inventario.map((f) => <FilaFuente key={f.key} f={f} s={s} t={t} />)}

          {vacias.length > 0 && (
            <EliteText style={[s.footnote, { color: t.textoTenue }]}>
              {vacias.length === 1
                ? 'Esa fuente vacía no es un error: es lo que todavía no has registrado, y arriba dice cómo se llena.'
                : `Esas ${vacias.length} fuentes vacías no son un error: son lo que todavía no has registrado, y arriba dice cómo se llena cada una.`}
            </EliteText>
          )}
        </>
      )}

      {tab === 'linea' && (
        <>
          <AnimatedPressable onPress={() => { haptic.light(); router.push('/salud/mi-lectura'); }}>
            <View style={[s.enlace, { borderColor: t.bordeMarcado }]}>
              {/* FIX-NOCHE: esta fila ES el destino 'lectura' de salud-puertas
                  (misma ruta, mismo título). Dibujarlo a mano era declarar un
                  glifo donde el registro ya tiene nombre lógico. */}
              <AppIcon name="diagnostico" size={16} color={META.accent} />
              <View style={{ flex: 1 }}>
                <EliteText style={[s.cardTitle, { color: t.texto }]}>Cómo te leo</EliteText>
                <EliteText style={[s.sub, { color: t.textoSecundario }]}>
                  Aquí ves el dato tal cual quedó guardado. Allá se cruzan las fuentes y se dice qué significan juntas.
                </EliteText>
              </View>
              <Ionicons name="chevron-forward" size={14} color={META.accent} />
            </View>
          </AnimatedPressable>

          {eventos.length === 0 ? (
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
              <EliteText style={[s.cardTitle, { color: t.texto }]}>Todavía no hay línea de tiempo</EliteText>
              <EliteText style={[s.body, { color: t.textoSecundario }]}>
                Se dibuja sola en cuanto haya registros. Cambia a la pestaña de inventario para ver qué falta y cómo se llena.
              </EliteText>
            </View>
          ) : (
            grupos.map((g) => (
              <View key={g.month} style={{ marginBottom: Spacing.md }}>
                <EliteText style={[s.mes, { color: t.textoSecundario }]}>{g.month.toUpperCase()}</EliteText>
                {g.events.map((e) => (
                  <View key={e.id} style={[s.evento, { borderColor: t.borde }]}>
                    <EliteText style={s.emoji}>{iconFor(e.kind)}</EliteText>
                    <View style={{ flex: 1 }}>
                      <EliteText style={[s.cardTitle, { color: t.texto }]}>{e.title}</EliteText>
                      {e.detail && <EliteText style={[s.sub, { color: t.textoTenue }]}>{e.detail}</EliteText>}
                    </View>
                    <EliteText style={[s.sub, { color: t.textoTenue }]}>{shortDate(e.at)}</EliteText>
                  </View>
                ))}
              </View>
            ))
          )}

          {!verTodo && eventos.length > EVENTOS_VISIBLES && (
            <AnimatedPressable onPress={() => { haptic.light(); setVerTodo(true); }}>
              <View style={[s.enlace, { borderColor: t.bordeMarcado }]}>
                <EliteText style={[s.cardTitle, { color: t.texto, flex: 1 }]}>
                  Ver los {eventos.length - EVENTOS_VISIBLES} eventos restantes
                </EliteText>
                <Ionicons name="chevron-down" size={14} color={META.accent} />
              </View>
            </AnimatedPressable>
          )}
        </>
      )}
    </View>
  );
}

function FilaFuente({ f, s, t }: { f: FuenteInventario; s: Styles; t: AppThemeTokens }) {
  const hay = f.registros > 0;
  return (
    <AnimatedPressable onPress={() => { haptic.light(); router.push(f.route as Href); }}>
      <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
        <View style={s.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
            <AppIcon name={f.icon} size={18} color={hay ? META.accent : t.textoTenue} />
            <View style={{ flex: 1 }}>
              <EliteText style={[s.cardTitle, { color: t.texto }]}>{f.titulo}</EliteText>
              <EliteText style={[s.sub, { color: t.textoTenue }]}>
                {hay ? `Último: ${fechaCorta(f.ultimo)}` : f.comoSeLlena}
              </EliteText>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <EliteText style={[s.bigNum, { color: hay ? t.texto : t.textoTenue }]}>{f.registros}</EliteText>
            <Ionicons name="chevron-forward" size={13} color={t.textoTenue} />
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

// ── La tarjeta del hub ─────────────────────────────────────────────────────

/**
 * Esta tarjeta NO trae cifras, y es la única del hub que no las trae. Contarlas
 * exige leer las seis fuentes, y hacerlo aquí le sumaría media docena de
 * consultas a un hub que ya dispara una docena. Poner un número aproximado
 * sería peor: una cifra que no cuadra con la de adentro destruye la confianza
 * en las demás. Se dice qué hay del otro lado y se abre.
 */
export function ExpedienteResumen() {
  const t = useAppTheme().tokens;
  return (
    <>
      <SectionHeader icon={META.icon} color={META.accent} title="EXPEDIENTE" />
      <EliteText style={{
        fontSize: FontSizes.sm, fontFamily: Fonts.regular,
        color: t.textoSecundario, lineHeight: 19,
      }}>
        Todo lo que hay guardado de ti, fuente por fuente, con su línea de tiempo y
        qué falta por llenar.
      </EliteText>
    </>
  );
}

export const expedienteDomain: ReportDomainDefinition<ExpedienteReportData> = {
  key: 'expediente',
  load: (_period, range) => loadExpedienteReport(range),
  // Con fuentes caídas NO se declara vacío: se pinta y el aviso dice qué falta.
  isEmpty: (d) => d.caidas.length === 0 && estadoDe(construirInventario(d.fuentes)).vacio,
  toRows: (d): ExportRow[] =>
    buildTimeline(d.fuentes).map((e) => ({
      fecha: e.at,
      tipo: e.kind,
      evento: e.title,
      detalle: e.detail ?? null,
    })),
  render: (d) => <ExpedienteContent data={d} />,
};

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  card: { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  kicker: { fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  cardTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold },
  bigNum: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, lineHeight: 16 },
  body: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 19, marginTop: 6 },
  footnote: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, lineHeight: 16, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  chip: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1 },
  aviso: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  enlace: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  mes: { fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 2, marginBottom: 6 },
  evento: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderBottomWidth: 0.5, paddingVertical: 10,
  },
  emoji: { fontSize: 16 },
});
