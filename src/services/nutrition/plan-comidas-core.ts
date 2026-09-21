/**
 * plan-comidas-core: las comidas del plan del coach, listas para que Comida
 * las pinte. Logica PURA (cero React, cero supabase).
 *
 * 21-sep-2026 (migracion 325). `nutrition_plans.meals` guarda las comidas de
 * la evaluacion Elite con la misma forma del esquema elite_v3:
 * [{ momento, hora, nombre, componentes[], notas }]. Este modulo las lee con
 * tolerancia (una fila rara no tira la tarjeta), las ordena para el dia y
 * arma los textos cortos (etiqueta del momento, resumen de metas). No
 * calcula nada: el plan lo escribio una persona.
 */

export const MOMENTOS_COMIDA = ['desayuno', 'comida', 'cena', 'colacion', 'pre_entreno', 'post_entreno'] as const;
export type MomentoComida = typeof MOMENTOS_COMIDA[number];

export interface ComidaPlan {
  momento: MomentoComida;
  /** HH:MM o null cuando el plan no fija la hora. */
  hora: string | null;
  nombre: string;
  componentes: string[];
  notas: string | null;
}

export const MOMENTO_COMIDA_LABEL: Readonly<Record<MomentoComida, string>> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
  colacion: 'Colación',
  pre_entreno: 'Antes de entrenar',
  post_entreno: 'Después de entrenar',
};

/**
 * Hora con la que se ORDENA una comida sin hora fija. Solo decide el orden en
 * la lista; nunca se pinta como si fuera la hora del plan.
 */
const HORA_ORDEN_DEFAULT: Readonly<Record<MomentoComida, string>> = {
  desayuno: '08:00',
  colacion: '11:00',
  comida: '14:00',
  pre_entreno: '17:00',
  post_entreno: '19:00',
  cena: '20:30',
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function esObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function esTexto(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}
function esMomento(v: unknown): v is MomentoComida {
  return typeof v === 'string' && (MOMENTOS_COMIDA as readonly string[]).includes(v);
}

/**
 * Lee `meals` tal como llega de la base (jsonb ya parseado, o null si la
 * columna no existe todavia en el remoto) y devuelve solo las comidas con
 * forma, ordenadas por hora (las sin hora, por su momento). Una fila sin
 * momento valido, sin nombre o sin componentes se salta: la tarjeta pinta lo
 * que si esta bien y no se cae por una.
 */
export function comidasDePlan(meals: unknown): ComidaPlan[] {
  if (!Array.isArray(meals)) return [];
  const out: ComidaPlan[] = [];
  for (const x of meals) {
    if (!esObj(x) || !esMomento(x.momento) || !esTexto(x.nombre) || !Array.isArray(x.componentes)) continue;
    const componentes = x.componentes.filter(esTexto).map((c) => c.trim());
    const hora = esTexto(x.hora) && HHMM.test(x.hora.trim()) ? x.hora.trim() : null;
    out.push({
      momento: x.momento,
      hora,
      nombre: x.nombre.trim(),
      componentes,
      notas: esTexto(x.notas) ? x.notas.trim() : null,
    });
  }
  // Orden estable: por hora fija, y las sin hora por su momento.
  return out
    .map((c, i) => ({ c, i, k: c.hora ?? HORA_ORDEN_DEFAULT[c.momento] }))
    .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.i - b.i))
    .map((x) => x.c);
}

/** Metas del plan que se pintan en una linea. Solo las que traen numero. */
export interface MetasPlanInput {
  calorie_target?: number | string | null;
  protein_target?: number | string | null;
  carb_target?: number | string | null;
  fat_target?: number | string | null;
  /** En litros (asi la guarda el panel de coach y la 324). */
  water_target?: number | string | null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** ["2200 kcal", "150 g de proteína", ...]; vacio si el plan no fija ninguna. */
export function metasDelPlan(plan: MetasPlanInput): string[] {
  const out: string[] = [];
  const kcal = num(plan.calorie_target);
  const prot = num(plan.protein_target);
  const carb = num(plan.carb_target);
  const grasa = num(plan.fat_target);
  const agua = num(plan.water_target);
  if (kcal !== null && kcal > 0) out.push(`${Math.round(kcal)} kcal`);
  if (prot !== null && prot > 0) out.push(`${Math.round(prot)} g de proteína`);
  if (carb !== null && carb > 0) out.push(`${Math.round(carb)} g de carbohidrato`);
  if (grasa !== null && grasa > 0) out.push(`${Math.round(grasa)} g de grasa`);
  if (agua !== null && agua > 0) out.push(`${agua % 1 === 0 ? agua : agua.toFixed(1)} L de agua`);
  return out;
}

/** "07:30 · Desayuno" o solo "Desayuno" cuando el plan no fija la hora. */
export function encabezadoComida(c: ComidaPlan): string {
  const etiqueta = MOMENTO_COMIDA_LABEL[c.momento];
  return c.hora ? `${c.hora} · ${etiqueta}` : etiqueta;
}
