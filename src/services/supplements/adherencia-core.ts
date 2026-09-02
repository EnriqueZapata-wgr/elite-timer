/**
 * Suplementos: plan vs eventual, dosis por unidad, registro variable,
 * historial y adherencia. Lógica PURA (cero React, cero supabase): se
 * verifica ejecutando con node (ver __tests__/adherencia-core.test.ts).
 *
 * Doctrina (Sprint SUPS+BHA, intacta): suplementos son REGISTRO, no
 * recomendación. Nada aquí sugiere cantidades; solo lee lo que la persona
 * tecleó o lo que decía la etiqueta, y cuenta días.
 *
 * Migración 312 (noche del 30 al 31 de agosto de 2026):
 *  · is_plan: true = protocolo establecido (cuenta en adherencia);
 *    false = eventual o rotativo (se registra, no penaliza).
 *    Una fila vieja sin la columna (OTA antes del db push) se trata como
 *    plan: exactamente lo que hacía la app hasta hoy.
 *  · amount_per_unit + amount_unit: reactivo por cápsula / gota / porción.
 *  · units_per_dose: unidades por toma programada.
 *  · supplement_logs.units_taken: unidades reales de esa toma (null = la
 *    programada).
 *
 * Lo que la ficha no sabe se pinta como raya ('—'), nunca como 0.
 */

export const SIN_DATO = '—';

/** Unidades aceptadas en la ficha (registro; sin rangos ni recomendaciones). */
export const AMOUNT_UNITS = ['mg', 'mcg', 'g', 'UI', 'ml'] as const;
export type AmountUnit = typeof AMOUNT_UNITS[number];

export interface FichaDosis {
  form?: string | null;
  amount_per_unit?: number | string | null;
  amount_unit?: string | null;
  units_per_dose?: number | string | null;
}

export interface SuppRow extends FichaDosis {
  id: string;
  name: string;
  is_plan?: boolean | null;
  is_active?: boolean | null;
  dose_pattern?: string | null;
  dose_times?: string[] | null;
  created_at?: string | null;
}

export interface LogRow {
  supplement_id: string;
  date: string;
  dose_index?: number | null;
  taken: boolean;
  units_taken?: number | string | null;
}

// ═══ Plan vs eventual ═══════════════════════════════════════════════════════

/**
 * ¿La ficha es del plan? Solo `false` explícito la vuelve eventual: null o
 * undefined (fila anterior a 312, o cliente viejo) siguen siendo plan.
 */
export function esPlan(row: { is_plan?: boolean | null } | null | undefined): boolean {
  return row?.is_plan !== false;
}

// ═══ Números y unidades ═════════════════════════════════════════════════════

/** Número finito o null. Acepta string numérico (NUMERIC de Postgres llega como string). */
export function numeroONull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  // Misma regla que parseCantidad: coma seguida de exactamente 3 digitos
  // (sin punto) es separador de miles ("1,000" = 1000); otra coma es decimal.
  let str = String(v).trim();
  if (/,\d{3}$/.test(str) && !str.includes('.')) str = str.replace(/,/g, '');
  else str = str.replace(',', '.');
  if (!/^-?\d*\.?\d+$/.test(str)) return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

/** Texto de un número sin ceros de más ("800", "2.5"); null → raya. Nunca toFixed sobre null. */
export function formatNumero(n: number | string | null | undefined): string {
  const v = numeroONull(n);
  if (v === null) return SIN_DATO;
  return String(Math.round(v * 100) / 100);
}

/** Normaliza la unidad tecleada o leída de etiqueta. Desconocida → null. */
export function normalizeUnit(raw: string | null | undefined): AmountUnit | null {
  if (typeof raw !== 'string') return null;
  const u = raw.trim().toLowerCase().replace(/\.$/, '');
  switch (u) {
    case 'mg': return 'mg';
    case 'mcg': case 'µg': case 'ug': case 'μg': return 'mcg';
    case 'g': case 'gr': case 'grs': return 'g';
    case 'ui': case 'iu': return 'UI';
    case 'ml': return 'ml';
    default: return null;
  }
}

/**
 * Lee "2000 IU", "400 mg", "1,000 mcg", "2.5 g" → { amount, unit }.
 * Coma seguida de exactamente 3 dígitos es separador de miles (México);
 * cualquier otra coma es decimal. Sin número o sin unidad conocida → null.
 */
export function parseCantidad(raw: string | null | undefined): { amount: number; unit: AmountUnit } | null {
  if (typeof raw !== 'string') return null;
  const m = raw.trim().match(/^([\d.,]+)\s*([a-zA-Zµμ]+)\b/);
  if (!m) return null;
  let num = m[1];
  if (/,\d{3}$/.test(num) && !num.includes('.')) num = num.replace(/,/g, '');
  else num = num.replace(',', '.');
  const amount = Number(num);
  const unit = normalizeUnit(m[2]);
  if (!Number.isFinite(amount) || amount <= 0 || !unit) return null;
  return { amount, unit };
}

/** "400 mg"; sin cantidad → raya. */
export function formatCantidad(amount: number | string | null | undefined, unit: string | null | undefined): string {
  const v = numeroONull(amount);
  if (v === null) return SIN_DATO;
  const u = normalizeUnit(unit) ?? (unit ?? '').trim();
  return u ? `${formatNumero(v)} ${u}` : formatNumero(v);
}

/**
 * Lleva la presentación a los ids de la ficha (187): el escaneo devuelve
 * "cápsula" / "gotas" / "tabletas" con acento o plural. Desconocida → null
 * (se conserva el texto original en quien llama, si lo quiere).
 */
export function normalizeForm(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const f = raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!f) return null;
  if (f.startsWith('capsul') || f.startsWith('caps') || f === 'softgel' || f.startsWith('perla')) return 'capsula';
  if (f.startsWith('gota')) return 'gotas';
  if (f.startsWith('tablet') || f.startsWith('comprimid') || f.startsWith('pastilla')) return 'tableta';
  if (f.startsWith('gomita') || f.startsWith('gummy') || f.startsWith('gummies')) return 'gomita';
  if (f.startsWith('polvo') || f.startsWith('powder') || f.startsWith('scoop')) return 'polvo';
  return null;
}

/** Nombre de la unidad física según `form` (187): cápsula, gota, tableta, gomita; polvo o sin forma → porción. */
export function unidadLabel(form: string | null | undefined, n = 1): string {
  const plural = numeroONull(n) !== 1;
  switch (normalizeForm(form) ?? form) {
    case 'capsula': return plural ? 'cápsulas' : 'cápsula';
    case 'gotas': return plural ? 'gotas' : 'gota';
    case 'tableta': return plural ? 'tabletas' : 'tableta';
    case 'gomita': return plural ? 'gomitas' : 'gomita';
    default: return plural ? 'porciones' : 'porción';
  }
}

/** "400 mg por cápsula" (10.1). Sin dato → raya. */
export function dosisPorUnidadTexto(f: FichaDosis | null | undefined): string {
  const v = numeroONull(f?.amount_per_unit);
  if (v === null) return SIN_DATO;
  return `${formatCantidad(v, f?.amount_unit)} por ${unidadLabel(f?.form, 1)}`;
}

/** Reactivo total de una toma de `units` unidades, o null si la ficha no lo sabe. */
export function reactivoPorToma(f: FichaDosis | null | undefined, units: number | string | null | undefined): number | null {
  const perUnit = numeroONull(f?.amount_per_unit);
  const u = numeroONull(units);
  if (perUnit === null || u === null) return null;
  return Math.round(perUnit * u * 1000) / 1000;
}

/**
 * Texto de UNA toma: "2 cápsulas · 800 mg". `unitsTaken` (registro variable,
 * 10.3) manda sobre `units_per_dose`. Si no se sabe cuántas unidades → raya.
 */
export function tomaTexto(f: FichaDosis | null | undefined, unitsTaken?: number | string | null): string {
  const units = numeroONull(unitsTaken) ?? numeroONull(f?.units_per_dose);
  if (units === null) return SIN_DATO;
  const base = `${formatNumero(units)} ${unidadLabel(f?.form, units)}`;
  const total = reactivoPorToma(f, units);
  return total === null ? base : `${base} · ${formatCantidad(total, f?.amount_unit)}`;
}

/** Activos por porción leídos del escaneo (10.2): "Vitamina D3 2000 UI · K2 100 mcg". */
export function activosTexto(scanActives: unknown): string | null {
  if (!Array.isArray(scanActives)) return null;
  const partes = scanActives
    .map((a) => {
      const name = typeof a?.name === 'string' ? a.name.trim() : '';
      const amount = typeof a?.amount === 'string' || typeof a?.amount === 'number' ? String(a.amount).trim() : '';
      if (!name) return '';
      return amount ? `${name} ${amount}` : name;
    })
    .filter(Boolean);
  return partes.length ? partes.join(' · ') : null;
}

/**
 * ¿La porción de la etiqueta es exactamente UNA unidad ("1 cápsula",
 * "1 tableta")? Solo entonces "por porción" equivale a "por unidad".
 * "2 cápsulas", "1/2 scoop", "10 gotas" o texto ilegible → false.
 */
export function porcionEsUnaUnidad(scanServing: string | null | undefined): boolean {
  if (typeof scanServing !== 'string') return false;
  return /^1(?:[.,]0+)?\s+\p{L}/u.test(scanServing.trim());
}

/**
 * Del escaneo a la ficha (10.2): `amount` del escaneo es POR PORCIÓN. Solo
 * se convierte en dosis por UNIDAD cuando la porción es exactamente 1 unidad
 * y hay UN solo activo legible. Con porción de 2 cápsulas o varios activos
 * no se elige nada (sería inventar el doble o la mitad del frasco): la ficha
 * guarda la lista "Etiqueta (2 cápsulas): …", que sí es correcta.
 */
export function dosisDesdeScan(
  scanActives: unknown,
  scanServing: string | null | undefined,
): { amount: number; unit: AmountUnit } | null {
  if (!porcionEsUnaUnidad(scanServing)) return null;
  if (!Array.isArray(scanActives) || scanActives.length !== 1) return null;
  const a = scanActives[0];
  return parseCantidad(typeof a?.amount === 'string' ? a.amount : null);
}

// ═══ Fechas (locales, sin Date.toISOString: evita el corrimiento UTC) ═══════

function pad2(n: number): string { return String(n).padStart(2, '0'); }

export function fechaLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 'YYYY-MM-DD' → Date local a medianoche. Inválida → null. */
export function parseFecha(s: string | null | undefined): Date | null {
  if (typeof s !== 'string') return null;
  const m = s.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Día de la semana 0=domingo … 6=sábado de 'YYYY-MM-DD'. Inválida → null. */
export function diaSemana(fecha: string): number | null {
  const d = parseFecha(fecha);
  return d ? d.getDay() : null;
}

/** Las últimas `dias` fechas terminando en `hoy`, de la más vieja a hoy. */
export function ventanaFechas(hoy: string, dias: number): string[] {
  const fin = parseFecha(hoy);
  if (!fin || !Number.isInteger(dias) || dias <= 0) return [];
  const out: string[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() - i);
    out.push(fechaLocal(d));
  }
  return out;
}

// ═══ Patrón de toma (167) ═══════════════════════════════════════════════════

/**
 * ¿Ese día toca según dose_pattern? '1× diario', '2× diario', null y
 * cualquier texto libre (fichas de coach_legacy) → diario. 'lun/mié/vie' →
 * lunes, miércoles, viernes. 'semanal' no tiene día fijo: por-día devuelve
 * false y la ventana lo cuenta como ceil(días/7) (ver diasProgramados).
 */
export function esDiaProgramado(pattern: string | null | undefined, fecha: string): boolean {
  if (pattern === 'semanal') return false;
  if (pattern === 'lun/mié/vie') {
    const dow = diaSemana(fecha);
    return dow === 1 || dow === 3 || dow === 5;
  }
  return true;
}

/** Días en que tocaba tomar dentro de `fechas`. */
export function diasProgramados(pattern: string | null | undefined, fechas: readonly string[]): number {
  if (pattern === 'semanal') return Math.ceil(fechas.length / 7);
  return fechas.filter((f) => esDiaProgramado(pattern, f)).length;
}

/** Nº de tomas/día (188): dose_times vacío o null = 1 (legacy). */
export function tomasPorDia(doseTimes: readonly string[] | null | undefined): number {
  if (!Array.isArray(doseTimes)) return 1;
  return Math.max(1, doseTimes.filter((t) => typeof t === 'string' && t.trim()).length);
}

/** Porcentaje 0-100 con tope 100, o null si no había nada programado. */
export function pct(tomados: number, programados: number): number | null {
  if (!Number.isFinite(programados) || programados <= 0) return null;
  const t = Number.isFinite(tomados) ? Math.max(0, tomados) : 0;
  return Math.round(Math.min(1, t / programados) * 100);
}

/**
 * Candado B2: un log con units_taken 0 o negativo NO es una toma, aunque
 * taken sea true. null = la programada (sí cuenta).
 */
export function logCuenta(l: LogRow): boolean {
  if (!l.taken || !l.supplement_id || !l.date) return false;
  const u = numeroONull(l.units_taken);
  return u === null || u > 0;
}

// ═══ Adherencia (10.6) ══════════════════════════════════════════════════════

export interface AdherenciaSupp {
  id: string;
  name: string;
  diasTomados: number;
  diasProgramados: number;
  /** null = todavía no había nada programado (ficha recién creada). */
  pct: number | null;
}

export interface AdherenciaResumen {
  dias: number;
  global: { diasTomados: number; diasProgramados: number; pct: number | null };
  plan: AdherenciaSupp[];
  /** Eventuales: cuántos días se registraron; sin porcentaje (no penalizan). */
  eventuales: { id: string; name: string; diasTomados: number }[];
}

/**
 * Fecha LOCAL de alta de la ficha. created_at es timestamptz en UTC y
 * México es UTC-6: una ficha creada a las 20:00 local es 02:00Z del día
 * siguiente; con slice(0,10) perdía su primer día. Inválida → null.
 */
export function fechaAltaLocal(createdAt: string | null | undefined): string | null {
  if (typeof createdAt !== 'string' || !createdAt.trim()) return null;
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? null : fechaLocal(d);
}

/** Fechas de la ventana en las que la ficha ya existía (una ficha de 3 días no debe medirse contra 30). */
function fechasDesdeAlta(row: SuppRow, fechas: readonly string[]): string[] {
  const alta = fechaAltaLocal(row.created_at);
  if (!alta) return [...fechas];
  return fechas.filter((f) => f >= alta);
}

/** Conjunto de fechas con al menos una toma registrada por suplemento. */
function fechasTomadasPorSupp(logs: readonly LogRow[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!logCuenta(l)) continue;
    let set = out.get(l.supplement_id);
    if (!set) { set = new Set(); out.set(l.supplement_id, set); }
    set.add(l.date.slice(0, 10));
  }
  return out;
}

/**
 * Adherencia de los últimos `dias` días (7 o 30): por suplemento del plan
 * ACTIVO, días con al menos una toma / días programados; global = suma de
 * ambos. Los eventuales solo cuentan días registrados. Sin fichas de plan →
 * pct null (no aplica), nunca 0.
 */
export function calcularAdherencia(
  supps: readonly SuppRow[],
  logs: readonly LogRow[],
  hoy: string,
  dias: number,
): AdherenciaResumen {
  const fechas = ventanaFechas(hoy, dias);
  const enVentana = new Set(fechas);
  const tomadas = fechasTomadasPorSupp(logs);
  const plan: AdherenciaSupp[] = [];
  const eventuales: AdherenciaResumen['eventuales'] = [];
  let sumT = 0; let sumP = 0;
  for (const s of supps) {
    if (s.is_active === false) continue;
    const propias = fechasDesdeAlta(s, fechas);
    const set = tomadas.get(s.id);
    const diasTomados = set ? [...set].filter((f) => enVentana.has(f) && propias.includes(f)).length : 0;
    if (!esPlan(s)) {
      eventuales.push({ id: s.id, name: s.name, diasTomados });
      continue;
    }
    const programados = diasProgramados(s.dose_pattern, propias);
    const tomadosCap = Math.min(diasTomados, programados);
    sumT += tomadosCap; sumP += programados;
    plan.push({ id: s.id, name: s.name, diasTomados, diasProgramados: programados, pct: pct(diasTomados, programados) });
  }
  return { dias, global: { diasTomados: sumT, diasProgramados: sumP, pct: pct(sumT, sumP) }, plan, eventuales };
}

export const DIAS_SEMANA_CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] as const;

export interface AdherenciaDiaSemana {
  /** 0=domingo … 6=sábado */
  dow: number;
  label: string;
  tomados: number;
  programados: number;
  pct: number | null;
}

/**
 * Adherencia del plan por día de la semana en la ventana (para ver, por
 * ejemplo, que los fines de semana se olvidan). Mismo criterio que
 * calcularAdherencia: suplemento-día tomado / suplemento-día programado.
 */
export function adherenciaPorDiaSemana(
  supps: readonly SuppRow[],
  logs: readonly LogRow[],
  hoy: string,
  dias: number,
): AdherenciaDiaSemana[] {
  const fechas = ventanaFechas(hoy, dias);
  const tomadas = fechasTomadasPorSupp(logs);
  const acc = Array.from({ length: 7 }, (_, dow) => ({ dow, tomados: 0, programados: 0 }));
  for (const s of supps) {
    if (s.is_active === false || !esPlan(s)) continue;
    const set = tomadas.get(s.id);
    for (const f of fechasDesdeAlta(s, fechas)) {
      const dow = diaSemana(f);
      if (dow === null) continue;
      const toca = esDiaProgramado(s.dose_pattern, f);
      if (toca) acc[dow].programados += 1;
      if (toca && set?.has(f)) acc[dow].tomados += 1;
    }
  }
  return acc.map((a) => ({ ...a, label: DIAS_SEMANA_CORTO[a.dow], pct: pct(a.tomados, a.programados) }));
}

// ═══ Historial por día (10.5) ═══════════════════════════════════════════════

export interface TomaHistorial {
  supplementId: string;
  name: string;
  isPlan: boolean;
  doseIndex: number;
  /** Etiqueta de la toma ('mañana', '08:30') o null si la ficha tiene 1 toma. */
  doseLabel: string | null;
  /** Texto "2 cápsulas · 800 mg" o raya. */
  cantidad: string;
  /** true si units_taken difiere de la programada (registro variable). */
  variable: boolean;
}

export interface DiaHistorial {
  fecha: string;
  tomas: TomaHistorial[];
  /** Tomas del plan registradas ese día (cap por suplemento a sus tomas/día). */
  planTomadas: number;
  /** Tomas del plan que tocaban ese día. */
  planProgramadas: number;
}

/**
 * Los últimos `dias` días agrupados, del más reciente al más viejo. Todos los
 * días aparecen (un día vacío es información: se saltó). Los logs de fichas
 * ya desactivadas se listan con su nombre (dato del usuario, no se esconde);
 * las fichas desactivadas no suman programadas.
 */
export function agruparHistorial(
  supps: readonly SuppRow[],
  logs: readonly LogRow[],
  hoy: string,
  dias: number,
): DiaHistorial[] {
  const fechas = ventanaFechas(hoy, dias);
  const porId = new Map(supps.map((s) => [s.id, s]));
  const porFecha = new Map<string, LogRow[]>();
  for (const l of logs) {
    if (!logCuenta(l)) continue;
    const f = l.date.slice(0, 10);
    let arr = porFecha.get(f);
    if (!arr) { arr = []; porFecha.set(f, arr); }
    arr.push(l);
  }
  const out: DiaHistorial[] = [];
  for (const fecha of [...fechas].reverse()) {
    const del = porFecha.get(fecha) ?? [];
    const vistos = new Set<string>();
    const tomas: TomaHistorial[] = [];
    const tomadasPorSupp = new Map<string, number>();
    for (const l of del) {
      const idx = Number.isFinite(Number(l.dose_index)) ? Number(l.dose_index) : 0;
      const key = `${l.supplement_id}#${idx}`;
      if (vistos.has(key)) continue;
      vistos.add(key);
      const s = porId.get(l.supplement_id);
      const n = tomasPorDia(s?.dose_times);
      const label = s && n > 1 ? (s.dose_times?.[idx] ?? `Toma ${idx + 1}`) : null;
      const unitsTaken = numeroONull(l.units_taken);
      const programada = numeroONull(s?.units_per_dose);
      tomas.push({
        supplementId: l.supplement_id,
        name: s?.name ?? 'Suplemento eliminado',
        // Ficha desconocida (borrada de raiz): no es plan, va al final.
        isPlan: s ? esPlan(s) : false,
        doseIndex: idx,
        doseLabel: label,
        cantidad: tomaTexto(s, unitsTaken),
        variable: unitsTaken !== null && unitsTaken !== programada,
      });
      if (s && s.is_active !== false && esPlan(s)) {
        tomadasPorSupp.set(s.id, Math.min(n, (tomadasPorSupp.get(s.id) ?? 0) + 1));
      }
    }
    let planProgramadas = 0;
    for (const s of supps) {
      if (s.is_active === false || !esPlan(s)) continue;
      const alta = fechaAltaLocal(s.created_at);
      if (alta && fecha < alta) continue;
      if (esDiaProgramado(s.dose_pattern, fecha)) planProgramadas += tomasPorDia(s.dose_times);
    }
    let planTomadas = 0;
    for (const v of tomadasPorSupp.values()) planTomadas += v;
    tomas.sort((a, b) => (a.isPlan === b.isPlan ? a.name.localeCompare(b.name) : a.isPlan ? -1 : 1));
    out.push({ fecha, tomas, planTomadas, planProgramadas });
  }
  return out;
}

/** "Hoy", "Ayer" o "lun 24 ago" para el encabezado del día. */
export function etiquetaDia(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Hoy';
  const d = parseFecha(fecha);
  const h = parseFecha(hoy);
  if (!d || !h) return fecha;
  const ayer = new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1);
  if (fechaLocal(ayer) === fecha) return 'Ayer';
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${DIAS_SEMANA_CORTO[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}
