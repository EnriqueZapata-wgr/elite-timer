/**
 * "Cumplí mi ayuno" y "de qué día es este ayuno": núcleo PURO (31-ago-2026).
 *
 * El backlog lo decía en una línea: "seis definiciones distintas de cumplí mi
 * ayuno". Medidas el 31-ago, eran siete sitios con su propia aritmética:
 *
 *   1. app/fasting.tsx, fila del historial: `hours >= target_hours` (estricto,
 *      y con target nulo la comparación daba NaN → "Parcial").
 *   2. app/fasting.tsx, anillos de la semana: `actual / (target || 16)`.
 *   3. app/fasting.tsx, centro del anillo: "YA LLEGASTE" cuando faltan 0 min.
 *   4. reports/adherence-calendar-core.ts `fastingMet`: completado, y con meta
 *      cuenta al 95 % ("terminar en 15.3 h un 16:8 arrancado tarde sigue
 *      siendo el hábito"); sin meta, cuenta.
 *   5. day-compiler.ts `buildSuggestion`: `elapsed >= (target ?? 16)`.
 *   6. hoy/local-recommendation.ts: `ft > 0 && fh >= ft`.
 *   7. argos-context-core.ts `compararConMeta`: `ratio >= 1`.
 *
 * Hay DOS preguntas distintas escondidas ahí, y por eso este archivo exporta
 * dos predicados y no uno. Ambos comparten la misma aritmética (`cumpleMeta`):
 *
 *   · metaAlcanzada(horas, meta): ayuno EN CURSO. Estricta. El cronómetro no
 *     puede decir "ya llegaste" mientras al lado dice "faltan 48 min".
 *   · ayunoCumplido(fila): ayuno CERRADO, para historial, semana y adherencia.
 *     Con la tolerancia del 95 % que ya era contrato en el calendario de
 *     adherencia (su test lo candadea: 15.3 h de 16 cuenta, 14 no). Sin meta,
 *     un ayuno cerrado cuenta: no había nada que alcanzar.
 *
 * Y la tercera pieza, la del DÍA CANÓNICO (pendiente 15.1 del backlog):
 *
 *   El electrón se archivaba con la fecha de CIERRE (awardBooleanElectron usa
 *   el día local del momento de otorgar) y la adherencia, la semana y la racha
 *   usaban `date`, que es el día local de INICIO. Contra la base real (54
 *   ayunos cerrados), 48 terminan en un día local distinto del que empezaron:
 *   es el patrón 16:8 nocturno. O sea que para casi todos los ayunos HOY y el
 *   calendario se contradecían en un día.
 *
 *   DECISIÓN (31-ago-2026, tomada sin Enrique, revertible en UNA función):
 *   el día canónico es el día en que el ayuno TERMINA. Razones escritas:
 *   (a) es cuando la persona lo cumple y cuando se otorga el electrón, así
 *   que HOY ya lo decía; (b) la entrega del 28-ago documenta que la racha por
 *   día de inicio "se rompe mientras la persona literalmente sigue ayunando"
 *   en un ayuno de 48 h; (c) un ayuno en curso no tiene fin y cae al día de
 *   inicio (es la única fecha que tiene); la tira semanal lo pinta en HOY por
 *   su progreso en vivo, no por esta función, y al cerrarse se muda a su día
 *   de fin.
 *
 *   Medido en zona CDMX contra la base: 42 de 54 ayunos cerrados terminan en
 *   un día distinto del que empezaron.
 *
 *   ELECTRÓN DEL AUTO-CIERRE (decisión, 31-ago-2026): awardBooleanElectron
 *   archiva el electrón en el día en que se OTORGA (día local del momento en
 *   que corre). En el cierre manual coincide con el día de fin. En el
 *   auto-cierre a 120 h puede caer hasta 24 h después del fin real (120 a 144
 *   h) y en el día en que la app se abrió: se acepta. Reescribirlo pediría un
 *   parámetro de fecha en el ledger de electrones y una llave de idempotencia
 *   distinta, y el caso es raro (un ayuno olvidado de 5 días).
 *
 *   La columna `date` NO cambia de significado (sigue siendo inicio local):
 *   reescribirla es una migración sobre filas con dueño y eso no se hace de
 *   noche. Los lectores derivan el día con `diaCanonico`. Si Enrique prefiere
 *   el día de inicio, se cambia `diaCanonico` y nada más.
 *
 *   LECTORES POR RANGO: como `date` es inicio y el día canónico es fin, una
 *   consulta `date >= desde` debe pedir VENTANA_DIA_CANONICO_DIAS más atrás
 *   (120 h de ayuno máximo + margen) y filtrar después por diaCanonico.
 *
 * Cero imports: se prueba en node sin arrastrar react-native ni supabase.
 */

/**
 * Tolerancia para dar por cumplido un ayuno CERRADO. Viene del calendario de
 * adherencia (28-jul-2026): terminar en 15.3 h un 16:8 arrancado tarde sigue
 * siendo el hábito. Su test la candadea; no se afloja.
 */
export const TOLERANCIA_META = 0.95;

/**
 * Cuántos días atrás pedir cuando se consulta por `date` (inicio) para no
 * perder un ayuno cuyo día canónico (fin) cae dentro del rango: 120 h de
 * ayuno máximo son 5 días; 6 deja margen.
 */
export const VENTANA_DIA_CANONICO_DIAS = 6;

/** Meta por omisión cuando una fila no trae `target_hours` (default del esquema). */
export const META_POR_OMISION_H = 16;

export interface AyunoCerradoLike {
  status?: string | null;
  actual_hours: number | null;
  target_hours: number | null;
}

export interface AyunoFechasLike {
  fast_start?: string | Date | null;
  fast_end?: string | Date | null;
  /** Día local de inicio, como lo escribe el servicio. Respaldo si no hay timestamps. */
  date?: string | null;
}

/** Horas entre dos instantes. null si alguno es inválido o el fin no va después. */
export function horasEntre(inicio: unknown, fin: unknown): number | null {
  const a = aFecha(inicio);
  const b = aFecha(fin);
  if (!a || !b) return null;
  const h = (b.getTime() - a.getTime()) / 3_600_000;
  if (!Number.isFinite(h) || h <= 0) return null;
  return h;
}

/**
 * La aritmética única. `tolerancia` es la fracción de la meta que basta
 * (1 = estricta). Sin horas útiles o sin meta útil, no se cumple: la
 * excepción "sin meta cuenta" vive en ayunoCumplido, que es donde tiene
 * sentido (un ayuno cerrado sin meta ya se hizo; uno en curso sin meta no
 * tiene a dónde llegar).
 */
export function cumpleMeta(horas: number | null | undefined, meta: number | null | undefined, tolerancia = 1): boolean {
  if (horas == null || !Number.isFinite(horas) || horas <= 0) return false;
  if (meta == null || !Number.isFinite(meta) || meta <= 0) return false;
  return horas >= meta * tolerancia;
}

/** Ayuno EN CURSO: ¿ya llegó a su meta? Estricta, minuto a minuto. */
export function metaAlcanzada(horasTranscurridas: number | null | undefined, metaHoras: number | null | undefined): boolean {
  return cumpleMeta(horasTranscurridas, metaHoras, 1);
}

/**
 * Ayuno CERRADO: ¿cumplió? Solo `completed` cuenta (un cancelado o uno en
 * curso no cumplió nada todavía). Con meta, al 95 %. Sin meta, cuenta.
 */
export function ayunoCumplido(a: AyunoCerradoLike): boolean {
  if (a.status !== 'completed') return false;
  const h = a.actual_hours;
  if (h == null || !Number.isFinite(h) || h <= 0) return false;
  const m = a.target_hours;
  if (m == null || !Number.isFinite(m) || m <= 0) return true;
  return cumpleMeta(h, m, TOLERANCIA_META);
}

/**
 * Fracción de la meta para pintar un anillo (0..1, topada). Sin meta usa la
 * de omisión, que es lo que la tira semanal ya hacía con `|| 16`.
 */
export function fraccionDeMeta(horas: number | null | undefined, meta: number | null | undefined): number {
  const h = horas != null && Number.isFinite(horas) && horas > 0 ? horas : 0;
  const m = meta != null && Number.isFinite(meta) && meta > 0 ? meta : META_POR_OMISION_H;
  return Math.max(0, Math.min(1, h / m));
}

/**
 * Día canónico del ayuno: el día local en que TERMINA. Un ayuno sin fin (en
 * curso, o fila vieja sin `fast_end`) cae al día local de inicio, y si tampoco
 * hay inicio válido, a `date`. null solo si no hay nada de dónde sacarlo.
 *
 * Los días se calculan en la zona horaria del dispositivo, igual que
 * toLocalDateString (regla #3 del CLAUDE.md).
 */
export function diaCanonico(a: AyunoFechasLike): string | null {
  const fin = aFecha(a.fast_end);
  if (fin) return fechaLocal(fin);
  const inicio = aFecha(a.fast_start);
  if (inicio) return fechaLocal(inicio);
  return a.date ?? null;
}

/** Resta n días a 'YYYY-MM-DD' sin tocar husos horarios (aritmética en UTC). */
export function diasAntes(fecha: string, n: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - n);
  return t.toISOString().slice(0, 10);
}

function aFecha(v: unknown): Date | null {
  if (v == null || v === '') return null;
  const d = v instanceof Date ? v : new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Copia local de toLocalDateString para no importar nada. Mismo formato. */
function fechaLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
