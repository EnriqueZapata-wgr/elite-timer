/**
 * Health read core (CIERRE-3) — quién manda cuando hay dos versiones del mismo dato.
 *
 * EL PROBLEMA QUE RESUELVE
 * La migración 264 separó a propósito lo que mide una máquina (health_os_daily)
 * de lo que escribe la persona (health_measurements, sleep_nights). Esa
 * separación es correcta y no se toca: evita que un upsert del reloj le borre a
 * alguien el peso que anotó a mano. Pero deja una consecuencia que nadie cubrió:
 * si las dos versiones conviven, ALGUIEN tiene que elegir cuál se muestra, y ese
 * alguien es el LECTOR. Este módulo es ese lector.
 *
 * LA REGLA, UNA SOLA Y SIN EXCEPCIONES
 * El dato de la persona es sagrado. Un dato importado del sistema operativo
 * jamás desplaza uno que el usuario escribió a mano: solo llena el hueco que
 * el usuario dejó vacío. No hay "el más reciente gana" ni "el más preciso
 * gana", porque las dos reglas terminan pisando a la persona algún día.
 *
 * POR QUÉ ES UNA LISTA ORDENADA Y NO UN if/else
 * El orden de preferencia es distinto por métrica (el sueño tiene tres fuentes,
 * los pasos tienen dos) y va a crecer. Con una lista, añadir una fuente es
 * añadir un renglón en el llamador y no tocar esta lógica; el orden queda
 * declarado a la vista en vez de escondido en un anidado de condicionales.
 *
 * PROCEDENCIA POR CAMPO (wearables, 13-oct-2026)
 * Desde la migración 344 una fila de health_os_daily o de sleep_nights puede
 * juntar campos de varias fuentes (Oura, WHOOP, Garmin, Polar, el teléfono) y
 * su `source` es solo un resumen: una fuente, o 'mixto'. La fuente que vale es
 * la DEL CAMPO (`field_sources`), y se lee con `fuenteDelCampo` de
 * procedencia-core, el único módulo que interpreta esa columna.
 *
 * PURO a propósito: sin red, sin fechas, y el único import es otro módulo puro
 * (procedencia-core). Se prueba en vitest sin teléfono y sin base. La capa con
 * I/O vive en health-read-service.ts.
 */
import { esColumna344Faltante, fuenteDelCampo } from './procedencia-core';

// ── Procedencia ──

/**
 * De dónde salió un dato. Los valores de máquina y 'mixto' son los MISMOS
 * literales del CHECK de `health_os_daily.source` y de `sleep_nights.source`
 * (migraciones 261 y 264, redefinidos en la 344), a propósito: así el contrato
 * de fuente que ya existe (el test sleep-source-contract) sigue siendo el
 * mismo vocabulario de punta a punta y nadie tiene que traducir.
 */
export type FuenteSalud =
  /** Lo escribió la persona en la app (health_measurements). Manda siempre. */
  | 'manual'
  /** Sesión de sueño propia de ATP (sleep_nights.source = 'sleep_cycle'). */
  | 'sesion_propia'
  /** Importado de Health Connect (Android). */
  | 'health_connect'
  /** Importado de Salud de Apple (iOS). */
  | 'healthkit'
  /** Conexión directa con Oura (la escribe el servidor, migración 344). */
  | 'oura'
  /** Conexión directa con WHOOP (servidor). */
  | 'whoop'
  /** Conexión directa con Garmin (servidor; preparada y apagada hasta tener la llave). */
  | 'garmin'
  /** Conexión directa con Polar (servidor). */
  | 'polar'
  /**
   * La base no sabe de qué fuente vino: el teléfono escribió sin decir quién
   * era (el trigger de la 344 lo marca así), o una fila 'mixto' leída sin
   * `field_sources`. Es dato real; lo que no se sabe es su procedencia.
   */
  | 'mixto'
  /** No hay ninguna versión de este dato. */
  | 'sin_dato';

/** Las fuentes que son una máquina con nombre: el teléfono o una marca conectada. */
const FUENTES_MAQUINA_SALUD: readonly FuenteSalud[] = [
  'health_connect', 'healthkit', 'oura', 'whoop', 'garmin', 'polar',
];

/**
 * ¿Este dato lo produjo una máquina? Decide el tier de evidencia del premio.
 *
 * 'mixto' NO cuenta: la procedencia no se sabe, y el premio de evidencia no se
 * paga sobre una suposición. Tras la 344 el trigger marca cada campo con su
 * fuente, así que un 'mixto' a nivel de campo es justo el caso en que nadie
 * dijo quién midió.
 */
export function esDeMaquina(fuente: FuenteSalud): boolean {
  return FUENTES_MAQUINA_SALUD.includes(fuente);
}

/** ¿Este dato lo puso la persona? Lo que responda que sí no se pisa jamás. */
export function esDePersona(fuente: FuenteSalud): boolean {
  return fuente === 'manual' || fuente === 'sesion_propia';
}

// ── Resolución ──

export interface DatoResuelto {
  valor: number | null;
  fuente: FuenteSalud;
}

export interface CandidatoDato {
  valor: number | null | undefined;
  fuente: FuenteSalud;
}

export const SIN_DATO: DatoResuelto = { valor: null, fuente: 'sin_dato' };

/**
 * Primer candidato CON valor gana. El llamador declara el orden y ese orden es
 * la doctrina: la persona primero, la máquina después.
 *
 * Un cero explícito SÍ es un dato (dormir 0 minutos es una respuesta, aunque
 * sea mala noticia); lo que no es dato es null, undefined o NaN. Tratar el cero
 * como ausencia haría que un día real de cero pasos se rellenara con el número
 * del reloj, que es exactamente el pisón que este módulo existe para evitar.
 */
export function resolverDato(candidatos: readonly CandidatoDato[]): DatoResuelto {
  for (const c of candidatos) {
    if (c.valor == null || !Number.isFinite(c.valor)) continue;
    return { valor: c.valor, fuente: c.fuente };
  }
  return SIN_DATO;
}

// ── Las cuatro métricas que el día consume ──

export interface LecturaDelDia {
  /** Pasos del día. */
  pasos: DatoResuelto;
  /** Minutos dormidos la noche que terminó esta mañana. */
  suenoMinutos: DatoResuelto;
  /** Pulsaciones por minuto en reposo. */
  fcReposo: DatoResuelto;
  /** Kilogramos. */
  peso: DatoResuelto;
}

export const LECTURA_VACIA: LecturaDelDia = {
  pasos: SIN_DATO,
  suenoMinutos: SIN_DATO,
  fcReposo: SIN_DATO,
  peso: SIN_DATO,
};

/** Filas crudas tal como las devuelve cada tabla (solo lo que se usa). */
export interface FilasDelDia {
  /** health_measurements de la fecha: lo que escribió la persona. */
  manual: {
    steps_daily?: number | null;
    sleep_hours?: number | null;
    resting_hr?: number | null;
    weight_kg?: number | null;
  } | null;
  /** sleep_nights de la noche que terminó en la fecha. */
  noche: {
    duration_minutes?: number | null;
    source?: string | null;
    /** De qué fuente vino cada campo (344). Ausente antes de la 344. */
    field_sources?: unknown;
  } | null;
  /** health_os_daily de la fecha: lo que midió la máquina. */
  maquina: {
    steps?: number | null;
    sleep_minutes?: number | null;
    resting_hr?: number | null;
    weight_kg?: number | null;
    source?: string | null;
    /** De qué fuente vino cada campo (344). Ausente antes de la 344. */
    field_sources?: unknown;
  } | null;
}

/**
 * El `source` crudo (de la fila o de un campo) a nuestro vocabulario, sin
 * adivinar: las seis máquinas se quedan como están, 'mixto' se queda como
 * 'mixto' y cualquier otra cosa es 'sin_dato'.
 */
export function fuenteDeMaquina(source: string | null | undefined): FuenteSalud {
  switch (source) {
    case 'health_connect':
    case 'healthkit':
    case 'oura':
    case 'whoop':
    case 'garmin':
    case 'polar':
    case 'mixto':
      return source;
    default:
      return 'sin_dato';
  }
}

/** El `source` de sleep_nights: la sesión propia es de la persona, el resto no. */
export function fuenteDeNoche(source: string | null | undefined): FuenteSalud {
  return source === 'sleep_cycle' ? 'sesion_propia' : fuenteDeMaquina(source);
}

/**
 * Arma la lectura del día aplicando el orden de preferencia de cada métrica.
 *
 * FUENTE POR CAMPO: la procedencia de cada número sale de `field_sources` de
 * su columna (pasos ← steps, sueño ← duration_minutes o sleep_minutes, FC ←
 * resting_hr, peso ← weight_kg), no del `source` de la fila. Si la columna no
 * vino (filas de antes de la 344), cae al `source` de la fila como siempre.
 *
 * SUEÑO: `sleep_nights` va ANTES que `health_os_daily` aunque las dos puedan
 * traer el mismo número importado. No es redundancia: sleep_nights ya resolvió
 * el conflicto de fuentes en la escritura (la sesión propia pisa, el import
 * hace ON CONFLICT DO NOTHING — ver sleep-source-contract), así que esa tabla
 * YA es la verdad de la noche. health_os_daily queda de red de seguridad para
 * el caso en que el import de noches falló pero la sync diaria sí escribió.
 * `health_measurements.sleep_hours` va primero de todos porque es la persona
 * tecleando, y se convierte a minutos aquí para que arriba solo exista una
 * unidad.
 */
export function armarLectura(filas: FilasDelDia): LecturaDelDia {
  const { manual, noche, maquina } = filas;
  const fMaquina = (campo: string): FuenteSalud =>
    fuenteDeMaquina(fuenteDelCampo(maquina?.field_sources, campo, maquina?.source));
  const fNoche = fuenteDeNoche(fuenteDelCampo(noche?.field_sources, 'duration_minutes', noche?.source));
  const horasAMinutos = (h: number | null | undefined): number | null =>
    h == null || !Number.isFinite(h) ? null : Math.round(h * 60);

  return {
    pasos: resolverDato([
      { valor: manual?.steps_daily, fuente: 'manual' },
      { valor: maquina?.steps, fuente: fMaquina('steps') },
    ]),
    suenoMinutos: resolverDato([
      { valor: horasAMinutos(manual?.sleep_hours), fuente: 'manual' },
      { valor: noche?.duration_minutes, fuente: fNoche },
      { valor: maquina?.sleep_minutes, fuente: fMaquina('sleep_minutes') },
    ]),
    fcReposo: resolverDato([
      { valor: manual?.resting_hr, fuente: 'manual' },
      { valor: maquina?.resting_hr, fuente: fMaquina('resting_hr') },
    ]),
    peso: resolverDato([
      { valor: manual?.weight_kg, fuente: 'manual' },
      { valor: maquina?.weight_kg, fuente: fMaquina('weight_kg') },
    ]),
  };
}

// ── Lectura antes y después de la 344 ──

/** Error tal como lo devuelve supabase-js (solo lo que se usa). */
export interface ErrorDeLecturaSalud {
  code?: string | null;
  message?: string | null;
}

/** Respuesta de una consulta: dato o error, nunca los dos a la vez de verdad. */
export interface RespuestaSalud<T> {
  data: T | null;
  error: ErrorDeLecturaSalud | null;
}

/**
 * ¿El error es "la base todavía no tiene la 344"? Se queda por compatibilidad
 * con quien ya lo importa, pero NO decide nada: delega en
 * `esColumna344Faltante` de procedencia-core, el único detector (columna
 * faltante que, si hay mensaje, nombra una columna de la 344; una tabla
 * faltante o un permiso siguen siendo error de lectura).
 *
 * La caída al select viejo con memoria (`leerConCaida`) vive en
 * lectura-344.ts: guarda estado entre lecturas y este módulo es puro.
 */
export function esColumnaFaltante(error: ErrorDeLecturaSalud | null | undefined): boolean {
  return esColumna344Faltante(error);
}

// ── Premios de evidencia wearable ──

/**
 * Los tres hábitos de tier "wearable" viven en award-rules.ts desde el día uno
 * y nunca se dispararon, porque no había de dónde. Estos dos ya tienen fuente.
 * (cardio_hr_wearable sigue sin cablear: exige frecuencia cardiaca POR SESIÓN
 * de ejercicio, y health_os_daily solo guarda la de reposo del día.)
 */
export type HabitoWearable = 'steps_wearable' | 'sleep_wearable';

export interface PremioWearable {
  habitType: HabitoWearable;
  /** Cap de 1 al día por regla: la clave se ancla a usuario + fecha y ya. */
  idempotencyKey: string;
  localDate: string;
}

/** Umbrales para no premiar ruido de sensor (un teléfono en la mesa cuenta pasos). */
export const MINIMO_PASOS_PREMIABLES = 1000;
export const MINIMO_SUENO_PREMIABLE_MIN = 180;

/**
 * Qué premios corresponden a esta lectura. Solo la máquina paga: si la persona
 * tecleó el número, el tier de evidencia es otro y la regla lo rechazaría en el
 * servidor. Devolver una lista (y no disparar aquí) mantiene el módulo puro y
 * deja el fire-and-forget donde vive el I/O.
 */
export function premiosWearable(
  lectura: LecturaDelDia,
  userId: string,
  fecha: string,
): PremioWearable[] {
  const out: PremioWearable[] = [];
  const { pasos, suenoMinutos } = lectura;

  if (esDeMaquina(pasos.fuente) && (pasos.valor ?? 0) >= MINIMO_PASOS_PREMIABLES) {
    out.push({
      habitType: 'steps_wearable',
      idempotencyKey: `steps_wearable_${userId}_${fecha}`,
      localDate: fecha,
    });
  }
  if (esDeMaquina(suenoMinutos.fuente) && (suenoMinutos.valor ?? 0) >= MINIMO_SUENO_PREMIABLE_MIN) {
    out.push({
      habitType: 'sleep_wearable',
      idempotencyKey: `sleep_wearable_${userId}_${fecha}`,
      localDate: fecha,
    });
  }
  return out;
}

// ── Presentación ──

/** Cómo se le dice al usuario de dónde salió el dato. Español de México. */
export function etiquetaFuente(fuente: FuenteSalud): string | null {
  switch (fuente) {
    case 'manual': return 'Lo anotaste tú';
    case 'sesion_propia': return 'Tu sesión de sueño';
    case 'health_connect': return 'Health Connect';
    case 'healthkit': return 'Salud de Apple';
    case 'oura': return 'Oura';
    case 'whoop': return 'WHOOP';
    case 'garmin': return 'Garmin';
    case 'polar': return 'Polar';
    // En un campo, 'mixto' es el teléfono que escribió sin decir su fuente.
    case 'mixto': return 'Fuente sin identificar';
    case 'sin_dato': return null;
  }
}
