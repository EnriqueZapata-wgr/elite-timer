/**
 * medidas-core (MB-27 Pieza 1) — peso y medidas del usuario, núcleo puro.
 *
 * La tabla canónica es health_measurements (dictamen 1.1): la que el usuario
 * llena, con UNIQUE(user_id, date), la que alimenta Edad ATP y el score. Aquí
 * viven la serie de la gráfica y el resumen, sin I/O: testeable en node.
 *
 * ⚠️ La gráfica NO promete nada: muestra la tendencia y ya. Ninguna función
 * de aquí clasifica el peso como bueno o malo ni lo nombra resultado de nada.
 */

export interface MedicionRow {
  /** 'YYYY-MM-DD' (columna date de health_measurements). */
  date: string;
  weight_kg?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  neck_cm?: number | null;
  arm_cm?: number | null;
  leg_cm?: number | null;
  chest_cm?: number | null;
}

export interface PuntoPeso {
  /** 'D/M' para el eje (de la propia fecha, sin Date ni zona horaria). */
  label: string;
  value: number;
  date: string;
}

const pesoValido = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

/** 'YYYY-MM-DD' → 'D/M' sin pasar por Date (cero sorpresas de zona horaria). */
function labelDeFecha(date: string): string {
  const [, m, d] = date.split('-');
  return `${parseInt(d ?? '0', 10)}/${parseInt(m ?? '0', 10)}`;
}

/**
 * Serie de peso ascendente por fecha para la gráfica. Dedup por día: la base
 * garantiza UNIQUE(user_id, date) (mig 030), y aunque la lectura viniera
 * sucia aquí una fecha cuenta UNA vez (gana la última vista, que en la
 * lectura DESC del servicio es la fila más reciente).
 */
export function serieDePeso(rows: MedicionRow[], max = 90): PuntoPeso[] {
  const porFecha = new Map<string, number>();
  for (const r of rows) {
    if (!r?.date || !pesoValido(r.weight_kg)) continue;
    if (!porFecha.has(r.date)) porFecha.set(r.date, r.weight_kg);
  }
  return Array.from(porFecha.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-max)
    .map(([date, value]) => ({ date, value, label: labelDeFecha(date) }));
}

export interface UltimoPeso {
  kg: number;
  date: string;
  /** Delta contra la medición anterior (redondeado a 1 decimal), o null. */
  deltaKg: number | null;
}

/** El dato del hero: último peso y cuánto cambió desde la medición previa. */
export function ultimoPeso(rows: MedicionRow[]): UltimoPeso | null {
  const serie = serieDePeso(rows, Number.MAX_SAFE_INTEGER);
  if (serie.length === 0) return null;
  const ultimo = serie[serie.length - 1];
  const previo = serie.length > 1 ? serie[serie.length - 2] : null;
  return {
    kg: ultimo.value,
    date: ultimo.date,
    deltaKg: previo ? Math.round((ultimo.value - previo.value) * 10) / 10 : null,
  };
}

export const MEDIDA_LABELS: { key: keyof MedicionRow; label: string }[] = [
  { key: 'waist_cm', label: 'Cintura' },
  { key: 'hip_cm', label: 'Cadera' },
  { key: 'chest_cm', label: 'Pecho' },
  { key: 'arm_cm', label: 'Brazo' },
  { key: 'leg_cm', label: 'Pierna' },
  { key: 'neck_cm', label: 'Cuello' },
];

export interface MedidaResumen {
  key: string;
  label: string;
  cm: number;
  date: string;
}

/**
 * Última medida no-null por columna (mismo coalesce que capture-service:
 * cada medida conserva su valor más reciente aunque venga de días distintos).
 * `rows` DESC por fecha, como las lee el servicio.
 */
export function resumenMedidas(rows: MedicionRow[]): MedidaResumen[] {
  const out: MedidaResumen[] = [];
  for (const { key, label } of MEDIDA_LABELS) {
    for (const r of rows) {
      const v = r?.[key];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0 && r.date) {
        out.push({ key: key as string, label, cm: v, date: r.date });
        break;
      }
    }
  }
  return out;
}
