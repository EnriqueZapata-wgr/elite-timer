/**
 * cardio-core — las fórmulas del perfil de cardio. PURO: sin React, sin
 * Supabase, sin fechas del sistema. Todo lo que entra viene como argumento y
 * todo lo que falta sale como null: aquí no se inventa ningún dato.
 *
 * BETA (31-ago-2026). Regla de la casa: cada número fisiológico lleva su fuente
 * publicada junto al número y la marca PENDIENTE FIRMA MARIANA. Si Mariana
 * rechaza una fórmula, se quita la función y la pantalla pinta raya; no se
 * sustituye por otra sin cita.
 *
 * Por qué estas y no otras (31-ago-2026): son de dominio público, tienen
 * autor y año, y cada una pide un dato que la app ya guarda o puede pedir en
 * una sola caja. Ninguna sustituye a una prueba de esfuerzo: por eso todo lo
 * que sale de aquí se pinta con la palabra "estimado" y el método.
 */

// ── Fuentes ─────────────────────────────────────────────────────────────────
// Se exportan para que la pantalla y el informe citen exactamente lo mismo.

export const FUENTES_CARDIO = {
  tanaka2001:
    'Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate revisited. J Am Coll Cardiol. 2001;37(1):153-156.',
  karvonen1957:
    'Karvonen MJ, Kentala E, Mustala O. The effects of training on heart rate: a longitudinal study. Ann Med Exp Biol Fenn. 1957;35(3):307-315.',
  uth2004:
    'Uth N, Sorensen H, Overgaard K, Pedersen PK. Estimation of VO2max from the ratio between HRmax and HRrest: the Heart Rate Ratio Method. Eur J Appl Physiol. 2004;91(1):111-115.',
  kline1987:
    'Kline GM, Porcari JP, Hintermeister R, et al. Estimation of VO2max from a one-mile track walk, gender, age, and body weight. Med Sci Sports Exerc. 1987;19(3):253-259.',
  cooper1968:
    'Cooper KH. A means of assessing maximal oxygen intake: correlation between field and treadmill testing. JAMA. 1968;203(3):201-204.',
} as const;

export type MetodoVo2 = 'registrado' | 'uth2004' | 'rockport1987' | 'cooper1968';

// ── Edad ────────────────────────────────────────────────────────────────────

/**
 * Edad cumplida a partir de dos fechas locales YYYY-MM-DD. Misma aritmética
 * que ageFromDob en edad-atp-v2-service, pero sin Date para que el test corra
 * en node sin zona horaria de por medio. null si algo no es fecha o la edad
 * no es humana.
 */
export function edadDesdeFechas(fechaNacimiento: string | null | undefined, hoy: string): number | null {
  if (!fechaNacimiento) return null;
  const n = partirFecha(fechaNacimiento);
  const h = partirFecha(hoy);
  if (!n || !h) return null;
  let edad = h.y - n.y;
  if (h.m < n.m || (h.m === n.m && h.d < n.d)) edad--;
  return edad >= 0 && edad < 130 ? edad : null;
}

function partirFecha(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

// ── FC máxima ───────────────────────────────────────────────────────────────

/**
 * FC máxima estimada por edad. Tanaka 2001: FCmax = 208 - 0.7 * edad.
 * Fuente: FUENTES_CARDIO.tanaka2001 (metaanálisis + 514 sujetos sanos, 18 a 81
 * años). No se usa 220 - edad: no tiene autor trazable y sobreestima en
 * jóvenes y subestima en mayores (es lo que Tanaka corrige).
 * Fuera del rango de edad estudiado (18 a 81) devuelve null: no extrapolamos.
 * PENDIENTE FIRMA MARIANA.
 */
export function fcMaxima(edad: number | null | undefined): number | null {
  if (edad == null || !Number.isFinite(edad)) return null;
  if (edad < 18 || edad > 81) return null;
  return Math.round(208 - 0.7 * edad);
}

// ── Zonas por FC de reserva (Karvonen) ──────────────────────────────────────

export interface ZonaFC {
  /** 1 a 5. */
  zona: 1 | 2 | 3 | 4 | 5;
  nombre: string;
  /** Porcentaje de FC de reserva que abre la zona (inclusive). */
  pctDesde: number;
  /** Porcentaje que la cierra (exclusivo, salvo la zona 5 que cierra en FCmax). */
  pctHasta: number;
  /** bpm inclusive. */
  desde: number;
  /** bpm: exclusivo en 1 a 4, inclusive en la 5 (= FCmax). */
  hasta: number;
}

/**
 * Cortes de las cinco zonas como % de FC de reserva: 50/60/70/80/90.
 * Es el esquema clásico de cinco zonas por Karvonen. OJO para la firma: ACSM
 * (Guidelines, 10a ed., 2018) clasifica intensidad por %FCR como ligera 30-39,
 * moderada 40-59, vigorosa 60-89 y casi máxima >= 90; los cortes de aquí son
 * los que pidió el brief del 31-ago-2026 y NO coinciden uno a uno con esa
 * tabla. Se dejan como beta explicable: cinco zonas, un corte cada 10 puntos.
 * PENDIENTE FIRMA MARIANA.
 */
export const CORTES_ZONAS_PCT = [50, 60, 70, 80, 90, 100] as const;
// 4EP (31-ago-2026): 50-59 %FCR ya es "moderado" para ACSM; "Muy suave" lo contradecia.
const NOMBRES_ZONAS = ['Suave', 'Ligera', 'Moderada', 'Intensa', 'Máxima'] as const;

/**
 * Zonas por el método de Karvonen (1957): FCR = FCmax - FCreposo y
 * FC objetivo = FCreposo + %FCR. Fuente: FUENTES_CARDIO.karvonen1957.
 * null si falta cualquiera de las dos o si no tienen sentido (reposo >= máxima).
 * PENDIENTE FIRMA MARIANA.
 */
export function zonasKarvonen(fcMax: number | null | undefined, fcReposo: number | null | undefined): ZonaFC[] | null {
  if (fcMax == null || fcReposo == null) return null;
  if (!Number.isFinite(fcMax) || !Number.isFinite(fcReposo)) return null;
  if (fcReposo < 25 || fcReposo >= fcMax) return null;
  const fcr = fcMax - fcReposo;
  const zonas: ZonaFC[] = [];
  for (let i = 0; i < 5; i++) {
    const pctDesde = CORTES_ZONAS_PCT[i];
    const pctHasta = CORTES_ZONAS_PCT[i + 1];
    zonas.push({
      zona: (i + 1) as ZonaFC['zona'],
      nombre: NOMBRES_ZONAS[i],
      pctDesde,
      pctHasta,
      desde: Math.round(fcReposo + (pctDesde / 100) * fcr),
      hasta: Math.round(fcReposo + (pctHasta / 100) * fcr),
    });
  }
  return zonas;
}

/**
 * En qué zona cae una FC. 0 = por debajo de la zona 1 (menos del 50 % de FCR).
 * Por arriba de FCmax se cuenta como zona 5 (la FC real puede superar a la
 * estimada; no es error del usuario). null si no hay zonas o FC.
 */
export function zonaDeFC(fc: number | null | undefined, zonas: ZonaFC[] | null): 0 | 1 | 2 | 3 | 4 | 5 | null {
  if (fc == null || !Number.isFinite(fc) || !zonas || zonas.length !== 5) return null;
  if (fc < zonas[0].desde) return 0;
  for (const z of zonas) {
    if (z.zona === 5) return 5;
    if (fc < z.hasta) return z.zona;
  }
  return 5;
}

// ── VO2max estimado ─────────────────────────────────────────────────────────

/**
 * Uth 2004 (Heart Rate Ratio Method): VO2max = 15.3 * FCmax / FCreposo, en
 * ml/kg/min. Fuente: FUENTES_CARDIO.uth2004. Validado por los autores en
 * hombres entrenados de 21 a 51 años; en la pantalla se dice que es estimado
 * y con qué FCmax se calculó (aquí normalmente la de Tanaka, o sea estimación
 * sobre estimación: por eso se muestra el método completo).
 * PENDIENTE FIRMA MARIANA.
 */
export function vo2maxUth(fcMax: number | null | undefined, fcReposo: number | null | undefined): number | null {
  if (fcMax == null || fcReposo == null) return null;
  if (!Number.isFinite(fcMax) || !Number.isFinite(fcReposo)) return null;
  if (fcReposo < 25 || fcReposo >= fcMax) return null;
  return redondear1(15.3 * (fcMax / fcReposo));
}

export interface EntradaRockport {
  pesoKg: number | null | undefined;
  edad: number | null | undefined;
  sexo: 'male' | 'female' | null | undefined;
  /** Tiempo de la caminata de 1 milla (1609 m) en minutos decimales. */
  tiempoMin: number | null | undefined;
  /** FC al terminar la caminata, bpm. */
  fcFinal: number | null | undefined;
}

/**
 * Rockport 1 milla (Kline et al. 1987):
 * VO2max = 132.853 - 0.0769 * peso(lb) - 0.3877 * edad + 6.315 * sexo
 *          - 3.2649 * tiempo(min) - 0.1565 * FC final
 * con sexo = 1 hombre, 0 mujer. Fuente: FUENTES_CARDIO.kline1987.
 * Es una CAMINATA cronometrada con FC al final: hoy la app no distingue
 * caminata de trote ni guarda la FC final, así que esta función existe y
 * está probada pero no se alimenta sola de cardio_sessions (ver informe).
 * PENDIENTE FIRMA MARIANA.
 */
export function vo2maxRockport(e: EntradaRockport): number | null {
  const { pesoKg, edad, sexo, tiempoMin, fcFinal } = e;
  if (pesoKg == null || edad == null || !sexo || tiempoMin == null || fcFinal == null) return null;
  if (![pesoKg, edad, tiempoMin, fcFinal].every(Number.isFinite)) return null;
  if (pesoKg <= 0 || tiempoMin <= 0 || fcFinal <= 0) return null;
  const pesoLb = pesoKg * 2.20462;
  const s = sexo === 'male' ? 1 : 0;
  const v = 132.853 - 0.0769 * pesoLb - 0.3877 * edad + 6.315 * s - 3.2649 * tiempoMin - 0.1565 * fcFinal;
  return v > 0 ? redondear1(v) : null;
}

/**
 * Cooper 12 minutos (1968): VO2max = (metros - 504.9) / 44.73.
 * Fuente: FUENTES_CARDIO.cooper1968. Misma fórmula y mismo rango (505 a
 * 5000 m) que la captura de /tests/run/cooper (constants/assessments/physical.ts),
 * que guarda el resultado en health_measurements.vo2max_estimate.
 * PENDIENTE FIRMA MARIANA.
 */
export function vo2maxCooper(metrosEn12Min: number | null | undefined): number | null {
  if (metrosEn12Min == null || !Number.isFinite(metrosEn12Min)) return null;
  if (metrosEn12Min < 505 || metrosEn12Min > 5000) return null;
  return redondear1((metrosEn12Min - 504.9) / 44.73);
}

// ── Carga: minutos por zona ─────────────────────────────────────────────────

export interface SesionCardioLite {
  date: string;
  discipline: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  avg_heart_rate: number | null;
  source: string | null;
}

export interface MinutosPorZona {
  /** Índice 0 = zona 1 ... índice 4 = zona 5. Minutos enteros. */
  minutos: [number, number, number, number, number];
  /** Minutos con FC media por debajo de la zona 1. */
  bajoZona1: number;
  /** Minutos de sesiones sin FC media: no se pueden ubicar y se dice. */
  sinFC: number;
  totalMin: number;
  sesiones: number;
  sesionesConFC: number;
}

/**
 * Minutos por zona: cada sesión entera se asigna a la zona de su FC MEDIA.
 * Es la carga más explicable posible (Enrique, 31-ago-2026: minutos por zona
 * antes que TRIMP, que trae constantes discutibles). Limitación dicha en
 * pantalla: una sesión con intervalos tiene una media que no vivió en ninguna
 * zona. Sin zonas (falta FCmax o FC reposo) devuelve null.
 */
export function minutosPorZona(sesiones: SesionCardioLite[], zonas: ZonaFC[] | null): MinutosPorZona | null {
  if (!zonas) return null;
  const out: MinutosPorZona = {
    minutos: [0, 0, 0, 0, 0], bajoZona1: 0, sinFC: 0, totalMin: 0, sesiones: 0, sesionesConFC: 0,
  };
  for (const s of sesiones) {
    const min = minutosDe(s);
    if (min <= 0) continue;
    out.sesiones++;
    out.totalMin += min;
    const z = zonaDeFC(s.avg_heart_rate, zonas);
    if (z == null) { out.sinFC += min; continue; }
    out.sesionesConFC++;
    if (z === 0) out.bajoZona1 += min;
    else out.minutos[z - 1] += min;
  }
  return out;
}

// ── Resumen de sesiones ─────────────────────────────────────────────────────

export interface ResumenSesiones {
  sesiones: number;
  totalMin: number;
  /** km con un decimal; 0 si nadie registró distancia. */
  km: number;
  conFC: number;
  desde: string;
  hasta: string;
}

/**
 * Sesiones dentro de una ventana [desde, hasta] de fechas locales (inclusive).
 * Comparación de strings YYYY-MM-DD: sin Date, sin zona horaria.
 */
export function filtrarVentana(sesiones: SesionCardioLite[], desde: string, hasta: string): SesionCardioLite[] {
  return sesiones.filter((s) => s.date >= desde && s.date <= hasta);
}

export function resumirSesiones(sesiones: SesionCardioLite[], desde: string, hasta: string): ResumenSesiones {
  const dentro = filtrarVentana(sesiones, desde, hasta);
  let totalMin = 0, metros = 0, conFC = 0;
  for (const s of dentro) {
    totalMin += minutosDe(s);
    metros += s.distance_meters != null && Number.isFinite(s.distance_meters) ? s.distance_meters : 0;
    if (s.avg_heart_rate != null) conFC++;
  }
  return { sesiones: dentro.length, totalMin, km: Math.round(metros / 100) / 10, conFC, desde, hasta };
}

/** Fecha local YYYY-MM-DD menos n días, sin pasar por la zona horaria del equipo. */
export function restarDias(fecha: string, dias: number): string {
  const p = partirFecha(fecha);
  if (!p) return fecha;
  const t = Date.UTC(p.y, p.m - 1, p.d) - dias * 86_400_000;
  const d = new Date(t);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function minutosDe(s: SesionCardioLite): number {
  const seg = s.duration_seconds;
  if (seg == null || !Number.isFinite(seg) || seg <= 0) return 0;
  return Math.round(seg / 60);
}

function redondear1(v: number): number {
  return Math.round(v * 10) / 10;
}
