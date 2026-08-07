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
  body_fat_pct?: number | null;
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

/**
 * MB-27 menor 8: el alias 'grasa' de la app Medidas promete y la pantalla
 * cumple — el % de grasa más reciente, del mismo coalesce que las medidas.
 */
export function ultimaGrasa(rows: MedicionRow[]): { pct: number; date: string } | null {
  for (const r of rows) {
    if (typeof r?.body_fat_pct === 'number' && Number.isFinite(r.body_fat_pct) && r.body_fat_pct > 0 && r.date) {
      return { pct: r.body_fat_pct, date: r.date };
    }
  }
  return null;
}

export interface PesoFechado {
  kg: number | null | undefined;
  /** 'YYYY-MM-DD' (normalizada por el caller; measured_at → slice(0,10)). */
  date: string | null | undefined;
}

/**
 * Audit B6 — no se elige TABLA, se elige la MEDICIÓN MÁS RECIENTE. El coach
 * que midió ayer (92 kg en body_measurements) gana al onboarding de hace un
 * año (105 kg en health_measurements), y al revés también. Empate de fecha
 * o fechas ausentes → la canónica (primer argumento). La comparten la meta
 * de proteína (nutrition-score) y el score de salud: un solo peso por
 * persona por día.
 */
export function pesoMasReciente(
  canonico: PesoFechado | null,
  coach: PesoFechado | null,
): number | null {
  const valido = (p: PesoFechado | null): p is PesoFechado & { kg: number } =>
    p != null && typeof p.kg === 'number' && Number.isFinite(p.kg) && p.kg > 0;
  const a = valido(canonico) ? canonico : null;
  const b = valido(coach) ? coach : null;
  if (a && b) {
    const fa = a.date ?? '';
    const fb = b.date ?? '';
    return fb > fa ? b.kg : a.kg; // empate o sin fechas → canónica
  }
  return a?.kg ?? b?.kg ?? null;
}

export interface RegistroComposicion {
  /** 'YYYY-MM-DD' (normalizada por el caller). */
  date: string | null;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  /** % directo (body_measurements del coach). */
  muscle_mass_pct?: number | null;
  /** kg (health_measurements) — se convierte con el peso de SU registro. */
  muscle_mass_kg?: number | null;
  visceral_fat?: number | null;
}

export interface ComposicionCoherente {
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_pct: number | null;
  visceral_fat: number | null;
  /** Campos que NO traía el registro ganador y se completaron del otro —
   *  declarados, para que el caller pueda decirlo o loguearlo. */
  completadosDelOtro: string[];
}

const numValido = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0;

/** El % de músculo de UN registro, con el peso de ESE registro (coherente). */
function musclePctDe(r: RegistroComposicion | null): number | null {
  if (!r) return null;
  if (numValido(r.muscle_mass_pct)) return r.muscle_mass_pct;
  if (numValido(r.muscle_mass_kg) && numValido(r.weight_kg)) {
    return (r.muscle_mass_kg / r.weight_kg) * 100;
  }
  return null;
}

/**
 * Audit V2 B6 — la recencia se aplica al REGISTRO, no a un campo suelto.
 *
 * El registro GANADOR es el más reciente que traiga PESO válido (empate o
 * sin fechas → la canónica, primer argumento) y aporta TODOS sus campos de
 * composición como bloque: peso y grasa de la misma medición, jamás el
 * peso de 2026 con la grasa de 2024 en silencio.
 *
 * La regla de completado, explícita: un campo que el ganador NO trae se
 * completa del otro registro y queda DECLARADO en completadosDelOtro.
 * Defensa: si la usuaria no volvió a medir grasa, el FFMI va a mezclarse
 * con CUALQUIER regla — el default inventado (20 %) también fabrica un
 * FFMI que nunca existió, y el dato viejo al menos fue de su cuerpo. La
 * diferencia con la regresión que señaló el audit es que aquí la mezcla es
 * fallback declarado, no el camino por defecto.
 */
export function composicionCoherente(
  canonico: RegistroComposicion | null,
  coach: RegistroComposicion | null,
): ComposicionCoherente {
  const conPeso = (r: RegistroComposicion | null): r is RegistroComposicion =>
    r != null && numValido(r.weight_kg);
  const a = conPeso(canonico) ? canonico : null;
  const b = conPeso(coach) ? coach : null;

  let ganador: RegistroComposicion | null = null;
  let otro: RegistroComposicion | null = null;
  if (a && b) {
    const gana = (b.date ?? '') > (a.date ?? '') ? b : a; // empate → canónica
    ganador = gana;
    otro = gana === a ? b : a;
  } else {
    ganador = a ?? b;
    otro = a ? coach : canonico; // el que no ancló (puede aportar campos)
    if (otro === ganador) otro = null;
  }

  const completadosDelOtro: string[] = [];
  const campo = (
    nombre: string,
    delGanador: number | null,
    delOtro: number | null,
  ): number | null => {
    if (delGanador != null) return delGanador;
    if (delOtro != null) { completadosDelOtro.push(nombre); return delOtro; }
    return null;
  };

  const g = ganador;
  return {
    weight_kg: g?.weight_kg ?? null,
    body_fat_pct: campo(
      'body_fat_pct',
      numValido(g?.body_fat_pct) ? g!.body_fat_pct! : null,
      numValido(otro?.body_fat_pct) ? otro!.body_fat_pct! : null,
    ),
    muscle_pct: campo('muscle_pct', musclePctDe(g), musclePctDe(otro)),
    visceral_fat: campo(
      'visceral_fat',
      numValido(g?.visceral_fat) ? g!.visceral_fat! : null,
      numValido(otro?.visceral_fat) ? otro!.visceral_fat! : null,
    ),
    completadosDelOtro,
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
