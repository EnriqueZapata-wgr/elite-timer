/**
 * Reporte para tu consulta — núcleo PURO (MB-29 Pieza 1 · H3).
 *
 * El perfil "cuidar mi glucosa" nos contrata UNA cosa: "voy con el doctor y
 * no sé qué contarle". Este módulo arma el documento con lo que la persona
 * YA registró: mediciones, laboratorios, síntomas, padecimientos e
 * intervenciones, en un rango de fechas elegido.
 *
 * Reglas duras:
 *  · CERO interpretación. Números, fechas y promedios. Nada de "sugiere",
 *    "riesgo" ni semáforos: la lectura la hace el médico. Hay test que
 *    barre el HTML generado y truena si aparece vocabulario de juicio.
 *  · Criterio editorial, no volcado: un médico con siete minutos ve
 *    resúmenes por contexto y tendencia entre mitades del rango, no 400
 *    filas.
 *  · Ciclo solo llega si el servicio lo pasó (getCycleInfo ya gatea por
 *    sexo Y modo propio). Aquí, si input.cycle es null, ni una palabra de
 *    ciclo aparece — también con test de mutación.
 *
 * Puro: sin supabase ni react-native. Testeable node-only.
 */
import { parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import { escapeHtml } from '@/src/services/labs-guide-html';
import {
  BLOOD_TYPE_LABEL, SEVERITY_LABEL, edadDe, type EmergencyCard,
} from '@/src/services/salud/emergency-card-core';
import { CANONICAL_PCT_KEYS, decimalToPct } from '@/src/constants/lab-canonical-map';
import { LAB_ABSOLUTE_RANGES } from '@/src/constants/lab-clinical-ranges';

const LIME = '#7fa81f'; // lima oscurecido para papel, mismo que dx-html
const INK = '#111111';
const MUTED = '#555555';

// ─── Entrada ────────────────────────────────────────────────────────────────

export interface ConsultaGlucoseRow {
  date: string; // YYYY-MM-DD
  value_mg_dl: number;
  context: string | null;
}

export interface ConsultaKetoneRow {
  date: string;
  source: 'blood' | 'breath' | 'urine' | string;
  value_mmol: number | null;
  value_ppm: number | null;
  urine_level: string | null;
}

export interface ConsultaMeasurementRow {
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  body_fat_pct: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  resting_hr: number | null;
}

export interface ConsultaLabPoint {
  parameter_key: string;
  value: number;
  measured_at: string; // ISO
}

export interface ConsultaSymptom {
  name: string;
  severity: number; // 1-5
  started_at: string; // ISO
  resolved_at: string | null;
  is_active: boolean;
}

export interface ConsultaPadecimiento {
  name: string;
  is_chronic: boolean;
  /** true si algún episodio sigue en curso. */
  isActive: boolean;
  /** started_on del episodio más reciente, o null. */
  lastStartedOn: string | null;
}

export interface ConsultaIntervencion {
  name: string;
  /** Días con registro de compleción dentro del rango. */
  completedDays: number;
  activatedAt: string | null;
}

export interface ConsultaCiclo {
  phaseLabel: string;
  currentDay: number;
  cycleLen: number;
  /** Periodos que tocan el rango, más reciente primero. */
  periods: { start: string; end: string | null }[];
}

export interface ConsultaInput {
  firstName: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  rangeDays: number;
  glucose: ConsultaGlucoseRow[];
  ketones: ConsultaKetoneRow[];
  measurements: ConsultaMeasurementRow[];
  labs: ConsultaLabPoint[];
  symptoms: ConsultaSymptom[];
  padecimientos: ConsultaPadecimiento[];
  intervenciones: ConsultaIntervencion[];
  /** null = sin Ciclo propio: NADA de ciclo aparece en el documento. */
  cycle: ConsultaCiclo | null;
}

// ─── Vocabulario del documento ──────────────────────────────────────────────

export const CONSULTA_DISCLAIMER =
  'Este documento reúne, ordenado por fecha, lo que la persona registró en la app ATP. ' +
  'No interpreta resultados ni emite juicios clínicos: la lectura corresponde al profesional de la salud. ' +
  'ATP no ajusta medicación ni sustituye la consulta.';

/** Contextos de glucosa en lenguaje del documento (espejo de glucose-log). */
export const GLUCOSE_CONTEXT_LABELS: Record<string, string> = {
  fasting: 'En ayunas',
  pre_meal: 'Antes de comer',
  post_meal_1h: '1 h después de comer',
  post_meal_2h: '2 h después de comer',
  random: 'Otro momento',
  bedtime: 'Antes de dormir',
};

const URINE_LEVEL_LABELS: Record<string, string> = {
  negative: 'Negativo',
  trace: 'Trazas',
  small: 'Pequeño',
  moderate: 'Moderado',
  large: 'Grande',
};

/**
 * Nombres de laboratorio para las claves canónicas más comunes de lab_values.
 * Clave sin nombre aquí se imprime prettificada (dato crudo honesto), nunca
 * se omite: el documento muestra TODO lo que la persona subió.
 */
export const LAB_LABELS: Record<string, string> = {
  glucose: 'Glucosa',
  hba1c: 'HbA1c',
  insulin: 'Insulina en ayuno',
  homa_ir: 'HOMA-IR',
  ldl: 'Colesterol LDL',
  hdl: 'Colesterol HDL',
  cholesterol_total: 'Colesterol total',
  total_cholesterol: 'Colesterol total',
  triglycerides: 'Triglicéridos',
  apob: 'ApoB',
  apo_b: 'ApoB',
  vldl: 'VLDL',
  pcr: 'PCR',
  crp: 'PCR',
  homocysteine: 'Homocisteína',
  tsh: 'TSH',
  t3_free: 'T3 libre',
  t4_free: 'T4 libre',
  vitamin_d: 'Vitamina D',
  ferritin: 'Ferritina',
  albumin: 'Albúmina',
  creatinine: 'Creatinina',
  alp: 'Fosfatasa alcalina',
  wbc: 'Leucocitos',
  mcv: 'VCM',
  rdw_cv: 'RDW-CV',
  lymphocyte_pct: '% Linfocitos',
  estradiol: 'Estradiol',
  progesterone: 'Progesterona',
  lh: 'LH',
  fsh: 'FSH',
  testosterone: 'Testosterona',
  cortisol: 'Cortisol',
};

export function labLabel(key: string): string {
  const known = LAB_LABELS[key];
  if (known) return known;
  const pretty = key.replace(/_/g, ' ').trim();
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

/** Valor de lab en la unidad que se imprime (hba1c y compañía viven en decimal). */
export function labDisplayValue(key: string, value: number): number {
  return CANONICAL_PCT_KEYS.has(key) ? Math.round(decimalToPct(value) * 10) / 10 : value;
}

export function labUnit(key: string): string {
  return LAB_ABSOLUTE_RANGES[key]?.unit ?? '';
}

// ─── Agregación (números, nunca juicios) ────────────────────────────────────

export interface ResumenNumerico {
  n: number;
  avg: number;
  min: number;
  max: number;
}

export function resumenNumerico(valores: number[]): ResumenNumerico | null {
  const v = valores.filter((x) => Number.isFinite(x));
  if (v.length === 0) return null;
  const sum = v.reduce((a, b) => a + b, 0);
  const round1 = (x: number) => Math.round(x * 10) / 10;
  return { n: v.length, avg: round1(sum / v.length), min: round1(Math.min(...v)), max: round1(Math.max(...v)) };
}

/** Glucosa agrupada por contexto, en el orden del catálogo. */
export function glucosaPorContexto(rows: ConsultaGlucoseRow[]): { label: string; resumen: ResumenNumerico }[] {
  const out: { label: string; resumen: ResumenNumerico }[] = [];
  for (const [ctx, label] of Object.entries(GLUCOSE_CONTEXT_LABELS)) {
    const r = resumenNumerico(rows.filter((x) => x.context === ctx).map((x) => x.value_mg_dl));
    if (r) out.push({ label, resumen: r });
  }
  const sinContexto = resumenNumerico(
    rows.filter((x) => !x.context || !(x.context in GLUCOSE_CONTEXT_LABELS)).map((x) => x.value_mg_dl),
  );
  if (sinContexto) out.push({ label: 'Sin contexto', resumen: sinContexto });
  return out;
}

/**
 * Promedio de la primera y la segunda mitad del rango: la tendencia dicha
 * con dos números y sus fechas, sin adjetivos. null si alguna mitad tiene
 * menos de 3 lecturas (dos puntos no son tendencia).
 */
export function mitadesDelRango(
  rows: { date: string; value: number }[],
  fromDate: string,
  toDate: string,
): { primeraAvg: number; segundaAvg: number; midDate: string } | null {
  const from = parseLocalDate(fromDate).getTime();
  const to = parseLocalDate(toDate).getTime();
  if (!(from < to)) return null;
  const mid = from + (to - from) / 2;
  const midDate = toLocalDateString(new Date(mid));
  const primera: number[] = [];
  const segunda: number[] = [];
  for (const r of rows) {
    const t = parseLocalDate(r.date).getTime();
    if (!Number.isFinite(t)) continue;
    (t <= mid ? primera : segunda).push(r.value);
  }
  if (primera.length < 3 || segunda.length < 3) return null;
  const avg = (v: number[]) => Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
  return { primeraAvg: avg(primera), segundaAvg: avg(segunda), midDate };
}

/** Último y penúltimo valor por parámetro, más reciente primero. */
export function labsUltimoYAnterior(
  labs: ConsultaLabPoint[],
): { key: string; ultimo: ConsultaLabPoint; anterior: ConsultaLabPoint | null }[] {
  const byKey = new Map<string, ConsultaLabPoint[]>();
  for (const p of labs) {
    const list = byKey.get(p.parameter_key) ?? [];
    list.push(p);
    byKey.set(p.parameter_key, list);
  }
  const out: { key: string; ultimo: ConsultaLabPoint; anterior: ConsultaLabPoint | null }[] = [];
  for (const [key, points] of byKey.entries()) {
    const sorted = [...points].sort((a, b) => b.measured_at.localeCompare(a.measured_at));
    out.push({ key, ultimo: sorted[0], anterior: sorted[1] ?? null });
  }
  out.sort((a, b) => b.ultimo.measured_at.localeCompare(a.ultimo.measured_at));
  return out;
}

/** Síntomas que tocan el rango: activos, o resueltos dentro del rango. */
export function sintomasEnRango(
  symptoms: ConsultaSymptom[],
  fromDate: string,
  toDate: string,
): ConsultaSymptom[] {
  const from = parseLocalDate(fromDate).getTime();
  const toEnd = parseLocalDate(toDate).getTime() + 86399999;
  return symptoms.filter((s) => {
    const started = new Date(s.started_at).getTime();
    if (Number.isFinite(started) && started > toEnd) return false;
    if (s.is_active || !s.resolved_at) return true;
    const resolved = new Date(s.resolved_at).getTime();
    return Number.isFinite(resolved) && resolved >= from;
  });
}

// ─── Formato ────────────────────────────────────────────────────────────────

/** '2026-06-05' o ISO → '5 jun 2026'. Fecha-solo se parsea LOCAL (regla 3). */
export function fmtFecha(dateStr: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? parseLocalDate(dateStr) : new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// ─── Secciones HTML ─────────────────────────────────────────────────────────

function filaResumen(label: string, r: ResumenNumerico, unidad: string): string {
  return `<tr><td>${escapeHtml(label)}</td><td class="num">${r.n}</td><td class="num">${fmtNum(r.avg)}</td><td class="num">${fmtNum(r.min)} a ${fmtNum(r.max)}</td><td class="unit">${escapeHtml(unidad)}</td></tr>`;
}

function tablaResumen(filas: string): string {
  return `<table><thead><tr><th></th><th class="num">Registros</th><th class="num">Promedio</th><th class="num">Mín a máx</th><th></th></tr></thead><tbody>${filas}</tbody></table>`;
}

function seccionGlucosa(input: ConsultaInput): string {
  const grupos = glucosaPorContexto(input.glucose);
  if (grupos.length === 0) return '';
  const filas = grupos.map((g) => filaResumen(g.label, g.resumen, 'mg/dL')).join('');
  const mitades = mitadesDelRango(
    input.glucose.map((g) => ({ date: g.date, value: g.value_mg_dl })),
    input.fromDate,
    input.toDate,
  );
  const tendencia = mitades
    ? `<p class="nota">Promedio hasta el ${fmtFecha(mitades.midDate)}: ${fmtNum(mitades.primeraAvg)} mg/dL · después: ${fmtNum(mitades.segundaAvg)} mg/dL.</p>`
    : '';
  return `<h2>Glucosa</h2>${tablaResumen(filas)}${tendencia}`;
}

function seccionCetonas(input: ConsultaInput): string {
  const sangre = resumenNumerico(
    input.ketones.filter((k) => k.source === 'blood' && k.value_mmol != null).map((k) => k.value_mmol as number),
  );
  const aliento = resumenNumerico(
    input.ketones.filter((k) => k.source === 'breath' && k.value_ppm != null).map((k) => k.value_ppm as number),
  );
  const orina = input.ketones.filter((k) => k.source === 'urine' && k.urine_level);
  if (!sangre && !aliento && orina.length === 0) return '';

  let filas = '';
  if (sangre) filas += filaResumen('Sangre', sangre, 'mmol/L');
  if (aliento) filas += filaResumen('Aliento', aliento, 'PPM');
  let orinaHtml = '';
  if (orina.length > 0) {
    const porNivel = new Map<string, number>();
    for (const k of orina) {
      const label = URINE_LEVEL_LABELS[k.urine_level ?? ''] ?? (k.urine_level as string);
      porNivel.set(label, (porNivel.get(label) ?? 0) + 1);
    }
    const partes = [...porNivel.entries()].map(([nivel, n]) => `${escapeHtml(nivel)}: ${n}`);
    orinaHtml = `<p class="nota">Tiras de orina (${orina.length} registros): ${partes.join(' · ')}.</p>`;
  }
  return `<h2>Cetonas</h2>${filas ? tablaResumen(filas) : ''}${orinaHtml}`;
}

function seccionCuerpo(input: ConsultaInput): string {
  const m = input.measurements;
  if (m.length === 0) return '';
  const partes: string[] = [];

  const pesos = m.filter((x) => x.weight_kg != null);
  if (pesos.length > 0) {
    const primero = pesos[0];
    const ultimo = pesos[pesos.length - 1];
    partes.push(
      pesos.length > 1
        ? `<p>Peso: ${fmtNum(primero.weight_kg as number)} kg (${fmtFecha(primero.date)}) y ${fmtNum(ultimo.weight_kg as number)} kg (${fmtFecha(ultimo.date)}) · ${pesos.length} registros.</p>`
        : `<p>Peso: ${fmtNum(ultimo.weight_kg as number)} kg (${fmtFecha(ultimo.date)}).</p>`,
    );
  }
  const cinturas = m.filter((x) => x.waist_cm != null);
  if (cinturas.length > 0) {
    const u = cinturas[cinturas.length - 1];
    partes.push(`<p>Cintura: ${fmtNum(u.waist_cm as number)} cm (${fmtFecha(u.date)}).</p>`);
  }
  const grasa = m.filter((x) => x.body_fat_pct != null);
  if (grasa.length > 0) {
    const u = grasa[grasa.length - 1];
    partes.push(`<p>Grasa corporal: ${fmtNum(u.body_fat_pct as number)}% (${fmtFecha(u.date)}).</p>`);
  }
  const presiones = m.filter((x) => x.systolic_bp != null && x.diastolic_bp != null);
  if (presiones.length > 0) {
    const ultimas = presiones.slice(-10);
    const filas = ultimas
      .map(
        (p) =>
          `<tr><td>${fmtFecha(p.date)}</td><td class="num">${p.systolic_bp}/${p.diastolic_bp}</td><td class="unit">mmHg</td></tr>`,
      )
      .join('');
    partes.push(
      `<p class="sub">Presión arterial${presiones.length > 10 ? ` (últimas 10 de ${presiones.length})` : ''}:</p><table><tbody>${filas}</tbody></table>`,
    );
  }
  const fc = resumenNumerico(m.filter((x) => x.resting_hr != null).map((x) => x.resting_hr as number));
  if (fc) partes.push(`<p>Frecuencia cardiaca en reposo: promedio ${fmtNum(fc.avg)} lpm (${fc.n} registros).</p>`);

  if (partes.length === 0) return '';
  return `<h2>Peso y medidas</h2>${partes.join('')}`;
}

function seccionLabs(input: ConsultaInput): string {
  const pares = labsUltimoYAnterior(input.labs);
  if (pares.length === 0) return '';
  const filas = pares
    .map(({ key, ultimo, anterior }) => {
      const unidad = labUnit(key);
      const ant = anterior
        ? `${fmtNum(labDisplayValue(key, anterior.value))} (${fmtFecha(anterior.measured_at)})`
        : '';
      return `<tr><td>${escapeHtml(labLabel(key))}</td><td class="num">${fmtNum(labDisplayValue(key, ultimo.value))}</td><td>${fmtFecha(ultimo.measured_at)}</td><td class="num">${ant}</td><td class="unit">${escapeHtml(unidad)}</td></tr>`;
    })
    .join('');
  return `<h2>Laboratorios</h2>
<p class="nota">Últimos valores registrados por la persona, con su valor previo cuando existe.</p>
<table><thead><tr><th></th><th class="num">Último</th><th>Fecha</th><th class="num">Previo (fecha)</th><th></th></tr></thead><tbody>${filas}</tbody></table>`;
}

function seccionSintomas(input: ConsultaInput): string {
  const enRango = sintomasEnRango(input.symptoms, input.fromDate, input.toDate);
  if (enRango.length === 0) return '';
  const MAX = 20;
  const filas = enRango
    .slice(0, MAX)
    .map((s) => {
      const estado = s.is_active || !s.resolved_at ? 'Activo' : `Terminó el ${fmtFecha(s.resolved_at)}`;
      return `<tr><td>${escapeHtml(s.name)}</td><td class="num">${s.severity}/5</td><td>Desde ${fmtFecha(s.started_at)}</td><td>${escapeHtml(estado)}</td></tr>`;
    })
    .join('');
  const extra = enRango.length > MAX ? `<p class="nota">Y ${enRango.length - MAX} más en la app.</p>` : '';
  return `<h2>Síntomas registrados</h2><table><thead><tr><th></th><th class="num">Intensidad</th><th></th><th></th></tr></thead><tbody>${filas}</tbody></table>${extra}`;
}

function seccionPadecimientos(input: ConsultaInput): string {
  if (input.padecimientos.length === 0) return '';
  const filas = input.padecimientos
    .map((p) => {
      const detalles: string[] = [];
      if (p.is_chronic) detalles.push('declarado como de largo plazo');
      detalles.push(p.isActive ? 'con episodio en curso' : 'sin episodio en curso');
      if (p.lastStartedOn) detalles.push(`último episodio desde ${fmtFecha(p.lastStartedOn)}`);
      return `<li><strong>${escapeHtml(p.name)}</strong> · ${detalles.join(' · ')}</li>`;
    })
    .join('');
  return `<h2>Padecimientos declarados</h2><p class="nota">Lo que la persona declaró en la app; no proviene de ningún análisis.</p><ul>${filas}</ul>`;
}

function seccionIntervenciones(input: ConsultaInput): string {
  if (input.intervenciones.length === 0) return '';
  const filas = input.intervenciones
    .map((i) => {
      const desde = i.activatedAt ? ` · desde ${fmtFecha(i.activatedAt)}` : '';
      return `<li><strong>${escapeHtml(i.name)}</strong> · ${i.completedDays} de ${input.rangeDays} días con registro${desde}</li>`;
    })
    .join('');
  return `<h2>Intervenciones activas</h2><p class="nota">Prácticas que la persona corre en la app, con sus días registrados en este rango.</p><ul>${filas}</ul>`;
}

function seccionCiclo(input: ConsultaInput): string {
  const c = input.cycle;
  if (!c) return '';
  const periodos = c.periods
    .map((p) => `<li>${fmtFecha(p.start)}${p.end ? ` a ${fmtFecha(p.end)}` : ' (en curso)'}</li>`)
    .join('');
  return `<h2>Ciclo menstrual</h2>
<p>Fase actual: ${escapeHtml(c.phaseLabel)} · día ${c.currentDay} de un ciclo de ${c.cycleLen} días.</p>
${periodos ? `<p class="sub">Periodos en el rango:</p><ul>${periodos}</ul>` : ''}
<p class="nota">La fase del ciclo cambia cómo se leen varios laboratorios hormonales; por eso acompaña estos datos.</p>`;
}

// ─── El documento ───────────────────────────────────────────────────────────

/** HTML completo del reporte. Degrada con gracia: sección sin datos no aparece. */
export function buildConsultaHtml(input: ConsultaInput): string {
  const name = (input.firstName ?? '').trim();
  const chips: string[] = [];
  if (input.glucose.length) chips.push(`${input.glucose.length} lecturas de glucosa`);
  if (input.ketones.length) chips.push(`${input.ketones.length} de cetonas`);
  if (input.measurements.length) chips.push(`${input.measurements.length} mediciones corporales`);
  const labKeys = new Set(input.labs.map((l) => l.parameter_key)).size;
  if (labKeys) chips.push(`${labKeys} laboratorios`);
  const activos = input.symptoms.filter((s) => s.is_active).length;
  if (activos) chips.push(`${activos} síntomas activos`);
  if (input.intervenciones.length) chips.push(`${input.intervenciones.length} intervenciones activas`);

  const secciones = [
    seccionGlucosa(input),
    seccionCetonas(input),
    seccionCuerpo(input),
    seccionLabs(input),
    seccionSintomas(input),
    seccionPadecimientos(input),
    seccionIntervenciones(input),
    seccionCiclo(input),
  ].join('');

  const cuerpo =
    secciones.trim().length > 0
      ? secciones
      : '<p class="empty">Sin registros en el rango elegido. Al registrar mediciones, laboratorios o síntomas en la app, aparecen aquí.</p>';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: ${INK}; padding: 36px 42px; font-size: 12px; line-height: 1.55; }
  .kicker { font-size: 10px; letter-spacing: 3px; color: ${LIME}; font-weight: 700; text-transform: uppercase; }
  h1 { font-size: 26px; font-weight: 800; margin: 6px 0 2px; letter-spacing: -0.5px; }
  .subtitle { color: ${MUTED}; font-size: 13px; margin-bottom: 4px; }
  .greeting { margin: 14px 0 4px; font-size: 14px; font-weight: 700; }
  .frame { background: #f4f4f4; border-left: 3px solid ${LIME}; padding: 8px 12px; margin: 10px 0 4px; color: ${MUTED}; }
  h2 { font-size: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin: 22px 0 8px; border-bottom: 2px solid ${INK}; padding-bottom: 4px; }
  p { margin-bottom: 6px; }
  .sub { font-weight: 700; margin-top: 8px; }
  .nota { color: ${MUTED}; font-size: 10.5px; }
  .empty { color: ${MUTED}; }
  ul { margin: 4px 0 8px 18px; }
  li { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; page-break-inside: avoid; }
  th { text-align: left; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: ${MUTED}; padding: 4px 8px 4px 0; border-bottom: 1px solid #ddd; }
  td { padding: 5px 8px 5px 0; border-bottom: 1px solid #eee; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  th.num { text-align: right; }
  .unit { color: ${MUTED}; font-size: 10.5px; }
  .chips span { display: inline-block; background: #f4f4f4; border-radius: 10px; padding: 3px 10px; margin: 0 4px 4px 0; font-size: 10.5px; font-weight: 600; }
  .disclaimer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #ddd; color: #888; font-size: 9.5px; }
  .footer { margin-top: 14px; color: #aaa; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="kicker">ATP · Para tu consulta</div>
  <h1>Mis registros de salud</h1>
  <div class="subtitle">Del ${fmtFecha(input.fromDate)} al ${fmtFecha(input.toDate)}</div>

  ${name ? `<p class="greeting">Registros de ${escapeHtml(name)}.</p>` : ''}
  <p class="frame">${CONSULTA_DISCLAIMER}</p>

  ${chips.length ? `<div class="chips">${chips.map((c) => `<span>${escapeHtml(c)}</span>`).join('')}</div>` : ''}

  ${cuerpo}

  <p class="disclaimer">${CONSULTA_DISCLAIMER}</p>
  <div class="footer">Generado desde la app ATP · Solo datos registrados por la persona</div>
</body>
</html>`;
}

// ─── Ficha de emergencia (OLA6 PIEZA D) ─────────────────────────────────────

/**
 * Aviso de la ficha. Dice DOS cosas, y la segunda no es negociable: que los
 * datos los escribió la persona, y que la medicación de un protocolo ATP no
 * es una prescripción médica.
 */
export const FICHA_DISCLAIMER =
  'Datos capturados por la persona, sin validación clínica. Las intervenciones de un protocolo ATP no son prescripción médica.';

function fichaFila(label: string, valor: string): string {
  return valor
    ? `<tr><th>${escapeHtml(label)}</th><td>${valor}</td></tr>`
    : '';
}

/**
 * Ficha de emergencia en UNA página A4, cuerpo de 14pt y sin un solo color de
 * semáforo. Se cuelga del mismo módulo puro que el reporte de consulta porque
 * obedece la misma regla: cero interpretación, y el test anti-juicio barre las
 * dos salidas.
 *
 * Por qué 14pt y a una página: quien la lee está de pie, con guantes y con
 * prisa. Un PDF de tres páginas en 10pt es un PDF que nadie lee.
 */
export function emergencyCardHtml(card: EmergencyCard, hoyISO: string): string {
  const edad = edadDe(card.birthDate, hoyISO);
  const nombre = card.fullName.trim();

  const alergias = card.allergies.length
    ? `<ul>${card.allergies
      .map((a) => `<li><b>${escapeHtml(a.substance)}</b> · ${escapeHtml(SEVERITY_LABEL[a.severity])}${a.reaction ? ` · ${escapeHtml(a.reaction)}` : ''}</li>`)
      .join('')}</ul>`
    : '<p class="vacio">Sin alergias registradas.</p>';

  const medicacion = card.criticalMeds.length
    ? `<ul>${card.criticalMeds.map((m) => `<li><b>${escapeHtml(m)}</b></li>`).join('')}</ul>`
    : '<p class="vacio">Sin medicación crítica registrada.</p>';

  const condiciones = card.conditions.length
    ? `<ul>${card.conditions.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`
    : '';

  const contactos = card.contacts.length
    ? `<ul>${card.contacts
      .map((c) => `<li><b>${escapeHtml(c.phone)}</b> · ${escapeHtml(c.name)}${c.relationship ? ` (${escapeHtml(c.relationship)})` : ''}</li>`)
      .join('')}</ul>`
    : '<p class="vacio">Sin contactos registrados.</p>';

  const otros = [
    fichaFila('Donante de órganos', card.organDonor == null ? '' : card.organDonor ? 'Sí' : 'No'),
    fichaFila('Idioma', escapeHtml(card.language.trim())),
  ].join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 14mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: ${INK}; font-size: 14pt; line-height: 1.4; }
  .kicker { font-size: 10pt; letter-spacing: 3px; font-weight: 700; text-transform: uppercase; color: ${MUTED}; }
  h1 { font-size: 26pt; font-weight: 800; margin: 2px 0 0; letter-spacing: -0.5px; }
  .quien { font-size: 16pt; margin-top: 4px; }
  h2 { font-size: 12pt; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin: 14px 0 4px; border-bottom: 2px solid ${INK}; padding-bottom: 3px; }
  ul { margin: 2px 0 0 20px; }
  li { margin-bottom: 3px; }
  .sangre { font-size: 30pt; font-weight: 800; letter-spacing: -1px; }
  .vacio { color: ${MUTED}; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; width: 38%; font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; color: ${MUTED}; padding: 4px 8px 4px 0; vertical-align: top; }
  td { padding: 4px 0; }
  .nota { margin-top: 6px; }
  .disclaimer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #ddd; color: ${MUTED}; font-size: 9.5pt; }
</style>
</head>
<body>
  <div class="kicker">Ficha de emergencia</div>
  <h1>${nombre ? escapeHtml(nombre) : 'Ficha de emergencia'}</h1>
  <div class="quien">${edad != null ? `${edad} años` : ''}${edad != null && card.birthDate ? ' · ' : ''}${card.birthDate ? escapeHtml(fmtFecha(card.birthDate)) : ''}</div>

  <h2>Tipo de sangre</h2>
  <div class="sangre">${card.bloodType ? escapeHtml(BLOOD_TYPE_LABEL[card.bloodType]) : 'Sin registrar'}</div>

  <h2>Alergias</h2>
  ${alergias}

  <h2>Medicación crítica</h2>
  ${medicacion}

  ${condiciones ? `<h2>Condiciones</h2>${condiciones}` : ''}

  <h2>A quién llamar</h2>
  ${contactos}

  ${otros ? `<h2>Otros datos</h2><table>${otros}</table>` : ''}

  ${card.note.trim() ? `<h2>Nota</h2><p class="nota">${escapeHtml(card.note.trim())}</p>` : ''}

  <p class="disclaimer">${FICHA_DISCLAIMER}</p>
</body>
</html>`;
}
