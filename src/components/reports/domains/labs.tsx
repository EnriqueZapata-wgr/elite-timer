/**
 * Dominio labs (NOCHE-REP) — los biomarcadores EN EL TIEMPO.
 *
 * POR QUÉ NO DUPLICA /edad-atp/labs. Aquella pantalla es el PANEL: dónde estás
 * hoy, parámetro por parámetro, con su banda. Esta es la HISTORIA: cómo se
 * movió cada parámetro entre un estudio y el siguiente, y hacia dónde. Son dos
 * preguntas distintas y por eso son dos vistas, no dos copias. Desde aquí se
 * enlaza al panel, y desde el panel se llega aquí.
 *
 * Tampoco duplica /salud/mi-lectura: aquella INTERPRETA cruzando fuentes, esta
 * MUESTRA el dato. Una dice qué significa, la otra dice cuánto es.
 *
 * CERO RANGOS INVENTADOS: la ventana funcional sale de la matriz de la casa a
 * través del core. Aquí no se escribe un solo número de referencia.
 */
import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Polyline, Rect } from 'react-native-svg';

import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import {
  construirHistorias, resumirLabs, fraseResumenLabs, RUMBO_LABEL,
  type HistoriaLab, type EstadoLab,
} from '@/src/services/reports/labs-report-core';
import {
  loadLabsReport, type LabsReportData,
} from '@/src/services/reports/labs-report-service';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.labs;

/**
 * El acento del dominio, calibrado por tema. El verde de labs (#1d9e75) da
 * 2.90 sobre card clara, o sea que como LETRA no se lee en tema claro. En
 * claro baja a `t.exito` (5.22 card · 4.66 fondo). Medido, no estimado.
 */
function acentoLabs(t: AppThemeTokens): string {
  return t.kind === 'dark' ? META.accent : t.exito;
}

/**
 * El color de cada estado de laboratorio. Dos correcciones sobre lo que
 * había, y las dos importan:
 *
 *  1. `atencion` se pintaba con `t.error`, que es el coral de INTERFAZ, el
 *     de un campo mal llenado. Un biomarcador fuera de su ventana es estado
 *     CLINICO y le toca `t.critico`. Son dos rojos distintos a proposito.
 *  2. `aceptable` y `sin_banda` compartian el mismo gris, y dicen cosas
 *     opuestas: "estas dentro de banda" contra "no hay banda, no se sabe".
 *     Ahora `aceptable` es dato firme y el gris queda solo para el que de
 *     verdad no se sabe.
 */
function colorEstadoLab(estado: EstadoLab, t: AppThemeTokens): string {
  if (estado === 'atencion') return t.critico;
  if (estado === 'optimo') return acentoLabs(t);
  if (estado === 'aceptable') return t.texto;
  return t.textoSecundario;
}
const SPARK_W = 200;
const SPARK_H = 44;

function fechaCorta(f: string): string {
  const d = new Date(`${f}T00:00:00`);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function LabsContent({ data }: { data: LabsReportData }) {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const [soloAtencion, setSoloAtencion] = useState(false);

  const historias = useMemo(
    () => construirHistorias(data.mediciones, data.sexo, data.faseCiclo),
    [data],
  );
  const resumen = useMemo(() => resumirLabs(historias), [historias]);
  const visibles = soloAtencion
    ? historias.filter((h) => h.ultimo.estado === 'atencion')
    : historias;

  return (
    <View>
      <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
        <EliteText style={[s.kicker, { color: t.textoSecundario }]}>TU HISTORIA</EliteText>
        <EliteText style={[s.body, { color: t.texto }]}>{fraseResumenLabs(resumen)}</EliteText>
        {resumen.sinBanda > 0 && (
          <EliteText style={[s.sub, { color: t.textoTenue, marginTop: 6 }]}>
            {resumen.sinBanda} {resumen.sinBanda === 1 ? 'está' : 'están'} pendientes de rango funcional. No cuentan ni a favor ni en contra: la matriz de la casa todavía no los define.
          </EliteText>
        )}
        {resumen.sinFase > 0 && (
          <EliteText style={[s.sub, { color: t.textoTenue, marginTop: 6 }]}>
            {resumen.sinFase} {resumen.sinFase === 1 ? 'marcador hormonal se está leyendo' : 'marcadores hormonales se están leyendo'} sin fase del ciclo anotada. Con la fase, el mismo número dice otra cosa.
          </EliteText>
        )}
      </View>

      {resumen.atencion > 0 && (
        <AnimatedPressable onPress={() => { haptic.light(); setSoloAtencion((v) => !v); }}>
          <View style={[
            s.filtro,
            { borderColor: soloAtencion ? acentoLabs(t) : t.bordeMarcado },
            soloAtencion && { backgroundColor: withOpacity(acentoLabs(t), 0.08) },
          ]}>
            <Ionicons name="funnel-outline" size={14} color={soloAtencion ? acentoLabs(t) : t.textoSecundario} />
            <EliteText style={[s.filtroText, { color: soloAtencion ? acentoLabs(t) : t.textoSecundario }]}>
              {soloAtencion ? 'Viendo solo lo que pide atención' : `Ver solo lo que pide atención (${resumen.atencion})`}
            </EliteText>
          </View>
        </AnimatedPressable>
      )}

      {visibles.map((h) => <FilaLab key={h.key} h={h} s={s} t={t} />)}

      <AnimatedPressable
        onPress={() => { haptic.light(); router.push('/edad-atp/labs'); }}
      >
        <View style={[s.enlace, { borderColor: t.bordeMarcado }]}>
          <Ionicons name="albums-outline" size={16} color={acentoLabs(t)} />
          <View style={{ flex: 1 }}>
            <EliteText style={[s.cardTitle, { color: t.texto }]}>Ver el panel completo</EliteText>
            <EliteText style={[s.sub, { color: t.textoSecundario }]}>
              Aquí ves cómo se movió cada valor. En el panel ves dónde estás hoy, con su banda y su explicación.
            </EliteText>
          </View>
          <Ionicons name="chevron-forward" size={14} color={acentoLabs(t)} />
        </View>
      </AnimatedPressable>
    </View>
  );
}

function FilaLab({ h, s, t }: { h: HistoriaLab; s: Styles; t: AppThemeTokens }) {
  const color = colorEstadoLab(h.ultimo.estado, t);

  return (
    <View style={[s.card, { backgroundColor: t.card, borderColor: t.borde }]}>
      <View style={s.rowBetween}>
        <View style={{ flex: 1 }}>
          <EliteText style={[s.cardTitle, { color: t.texto }]}>{h.nombre}</EliteText>
          <EliteText style={[s.sub, { color: t.textoTenue }]}>
            {fechaCorta(h.ultimo.measured_at)} · {h.puntos.length} {h.puntos.length === 1 ? 'medición' : 'mediciones'}
          </EliteText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <EliteText style={[s.bigNum, { color }]}>{h.ultimo.value}</EliteText>
          {h.unidad && <EliteText style={[s.sub, { color: t.textoTenue }]}>{h.unidad}</EliteText>}
        </View>
      </View>

      <EliteText style={[s.sub, { color, marginTop: 6 }]}>{h.estadoLabel}</EliteText>

      {h.ventana ? (
        <EliteText style={[s.sub, { color: t.textoTenue, marginTop: 2 }]}>
          Tu ventana funcional: {h.ventana.lo} a {h.ventana.hi}{h.unidad ? ` ${h.unidad}` : ''}
        </EliteText>
      ) : (
        <EliteText style={[s.sub, { color: t.textoTenue, marginTop: 2 }]}>
          Sin ventana funcional definida todavía. No se inventa una.
        </EliteText>
      )}

      {h.puntos.length > 1 && <Sparkline h={h} t={t} />}

      <EliteText style={[s.sub, { color: t.textoSecundario, marginTop: 6 }]}>
        {RUMBO_LABEL[h.rumbo]}
        {h.delta != null && h.anterior != null
          ? `: ${h.delta > 0 ? '+' : ''}${h.delta} contra ${h.anterior.value} del ${fechaCorta(h.anterior.measured_at)}.`
          : '.'}
      </EliteText>

      {h.ciclo.show && (
        <View style={[s.nota, { borderColor: t.bordeMarcado }]}>
          <Ionicons
            name={h.ciclo.phaseKnown ? 'moon-outline' : 'alert-circle-outline'}
            size={14}
            color={t.textoSecundario}
          />
          <EliteText style={[s.sub, { color: t.textoSecundario, flex: 1 }]}>{h.ciclo.note}</EliteText>
        </View>
      )}
    </View>
  );
}

/**
 * La línea del parámetro con su ventana de fondo. Es deliberadamente chica: el
 * detalle grande vive en el panel, aquí se necesita la forma del movimiento.
 */
function Sparkline({ h, t }: { h: HistoriaLab; t: AppThemeTokens }) {
  const vals = h.puntos.map((p) => p.value);
  const lo = Math.min(...vals, h.ventana?.lo ?? Infinity);
  const hi = Math.max(...vals, h.ventana?.hi ?? -Infinity);
  const span = hi - lo || 1;
  const y = (v: number) => SPARK_H - 4 - ((v - lo) / span) * (SPARK_H - 8);
  const stepX = h.puntos.length > 1 ? SPARK_W / (h.puntos.length - 1) : 0;
  const puntos = h.puntos.map((p, i) => `${i * stepX},${y(p.value)}`).join(' ');

  return (
    <Svg width={SPARK_W} height={SPARK_H} style={{ marginTop: Spacing.sm }}>
      {h.ventana && (
        <Rect
          x={0}
          y={y(h.ventana.hi)}
          width={SPARK_W}
          height={Math.max(2, y(h.ventana.lo) - y(h.ventana.hi))}
          fill={withOpacity(META.accent, 0.14)}
        />
      )}
      <Polyline
        points={puntos}
        fill="none"
        stroke={t.texto}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── La tarjeta del hub ─────────────────────────────────────────────────────

/**
 * La tarjeta del hub NO evalúa bandas: el conteo de "piden atención" exige
 * cargar el dominio entero, y el hub ya dispara una docena de lecturas. Aquí
 * van las dos cifras que salen de una sola consulta, y el estado se ve
 * adentro.
 */
export function LabsResumen({ parametros, mediciones }: {
  parametros: number; mediciones: number;
}) {
  return (
    <>
      <SectionHeader icon={META.icon} color={META.accent} title="LABS" />
      <StatsRow>
        <Stat value={`${parametros}`} label="biomarcadores" />
        <Stat value={`${mediciones}`} label="mediciones" />
      </StatsRow>
    </>
  );
}

export const labsDomain: ReportDomainDefinition<LabsReportData> = {
  key: 'labs',
  load: (_period, range) => loadLabsReport(range),
  isEmpty: (d) => d.mediciones.length === 0,
  toRows: (d): ExportRow[] => {
    const historias = construirHistorias(d.mediciones, d.sexo, d.faseCiclo);
    const rows: ExportRow[] = [];
    for (const h of historias) {
      for (const p of h.puntos) {
        rows.push({
          biomarcador: h.nombre,
          clave: h.key,
          fecha: p.measured_at,
          valor: p.value,
          unidad: h.unidad,
          ventana_funcional: h.ventana ? `${h.ventana.lo} a ${h.ventana.hi}` : 'sin definir',
          estado: p.estado,
          origen: p.source,
          nota_ciclo: h.ciclo.show ? h.ciclo.note : null,
        });
      }
    }
    return rows;
  },
  render: (d) => <LabsContent data={d} />,
};

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  card: { borderWidth: 0.5, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  kicker: { fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 2 },
  cardTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold },
  bigNum: { fontSize: FontSizes.xl, fontFamily: Fonts.extraBold },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, lineHeight: 16 },
  body: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 19, marginTop: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  filtro: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: Radius.pill,
    paddingVertical: 8, paddingHorizontal: 14, marginBottom: Spacing.sm,
  },
  filtroText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  nota: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    borderWidth: 1, borderRadius: Radius.md, padding: 8, marginTop: Spacing.sm,
  },
  enlace: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.xs,
  },
});
