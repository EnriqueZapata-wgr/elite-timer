/**
 * Reloj core (bloque TIMERS) — UN solo reloj para los cinco modos de Fitness.
 *
 * Por qué existe: cada timer (RestTimer, EMOM, Myo-reps, bloques de tiempo,
 * RoutineEngine) medía el tiempo CONTANDO TICKS de setInterval/setTimeout.
 * Con la app en segundo plano el sistema deja de disparar ticks: el descanso
 * de 60 s duraba 3 minutos y el minuto del EMOM se estiraba sin que nadie lo
 * viera. Aquí el tiempo NO se cuenta: se calcula a partir de un `ahoraMs`
 * inyectado (Date.now() en producción) contra el instante de arranque. Un
 * salto del reloj (segundo plano, pantalla bloqueada) se refleja solo al
 * volver a leer.
 *
 * Puro (patrón *-core): cero deps de RN, cero setInterval, cero Date.now().
 * El tick de re-render vive en src/hooks/useReloj.ts; aquí solo matemáticas.
 *
 * Contrato del estado:
 *   inicioMs    instante en que arrancó el tramo que corre (null si detenido)
 *   acumuladoMs tiempo cerrado en tramos anteriores (pausas)
 *   corriendo   true mientras hay un tramo abierto
 */

export type EstadoReloj = {
  inicioMs: number | null;
  acumuladoMs: number;
  corriendo: boolean;
};

/** Reloj detenido en cero. Congelado: nunca se muta, siempre se copia. */
export const RELOJ_DETENIDO: Readonly<EstadoReloj> = Object.freeze({
  inicioMs: null,
  acumuladoMs: 0,
  corriendo: false,
});

/** Arranca DESDE CERO en `ahoraMs` (aunque ya estuviera corriendo). */
export function iniciar(_estado: EstadoReloj, ahoraMs: number): EstadoReloj {
  return { inicioMs: ahoraMs, acumuladoMs: 0, corriendo: true };
}

/**
 * Cierra el tramo abierto y lo guarda en acumulado. Si no corre, no cambia.
 * Si el reloj del sistema retrocedió (ahoraMs < inicioMs) el tramo cuenta 0:
 * lo acumulado se conserva, nunca se resta.
 */
export function pausar(estado: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (!estado.corriendo) return estado;
  return { inicioMs: null, acumuladoMs: transcurridoMs(estado, ahoraMs), corriendo: false };
}

/** Abre un tramo nuevo sin perder lo acumulado. Si ya corre, no cambia. */
export function reanudar(estado: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (estado.corriendo) return estado;
  return { inicioMs: ahoraMs, acumuladoMs: estado.acumuladoMs, corriendo: true };
}

/** Vuelve al reloj detenido en cero. */
export function reiniciar(): EstadoReloj {
  return { ...RELOJ_DETENIDO };
}

/**
 * Cierra el tramo abierto en `ahoraMs` y abre uno nuevo ahí mismo (pausa y
 * reanuda en el mismo instante): el transcurrido no cambia, pero lo ya corrido
 * queda en `acumuladoMs` y el ancla se mueve a `ahoraMs`. Para eso existe: si
 * el reloj del sistema RETROCEDE (ajuste NTP, cambio de zona) el tramo abierto
 * cuenta 0 y lo acumulado se conserva; sin esto el contador saltaba hacia
 * atrás hasta la duración completa. El hook (useReloj) y el motor
 * (RoutineEngine) lo aplican en cada lectura. Si no corre, no cambia.
 */
export function normalizar(estado: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (!estado.corriendo) return estado;
  return { inicioMs: ahoraMs, acumuladoMs: transcurridoMs(estado, ahoraMs), corriendo: true };
}

/**
 * Milisegundos transcurridos leídos en `ahoraMs`. Nunca negativo: si el reloj
 * del sistema retrocede (ajuste NTP) el tramo abierto cuenta 0, no resta, y
 * lo acumulado se conserva (ver normalizar: re-anclar en cada lectura hace
 * que un retroceso solo congele el contador, nunca lo devuelva).
 */
export function transcurridoMs(estado: EstadoReloj, ahoraMs: number): number {
  const tramo = estado.corriendo && estado.inicioMs != null
    ? Math.max(0, ahoraMs - estado.inicioMs)
    : 0;
  return Math.max(0, estado.acumuladoMs + tramo);
}

/** Milisegundos que faltan para cubrir `duracionMs`. Nunca negativo. */
export function restanteMs(estado: EstadoReloj, duracionMs: number, ahoraMs: number): number {
  return Math.max(0, duracionMs - transcurridoMs(estado, ahoraMs));
}

/**
 * Segundos "de pantalla" que faltan: techo, no piso. Un descanso de 5 s marca
 * 5·4·3·2·1 y cae a 0 EXACTAMENTE al cumplirse la duración (nunca antes). Es
 * lo que hacían los contadores viejos (arrancaban en N y bajaban de 1 en 1).
 */
export function segundosRestantes(transcurrido: number, duracionSeg: number): number {
  return Math.max(0, Math.ceil((duracionSeg * 1000 - transcurrido) / 1000));
}

// ── Máquinas de cada modo: funciones puras sobre transcurridoMs ──

export interface FaseDescanso {
  restanteSeg: number;
  terminado: boolean;
}

/** RestTimer y bloques de tiempo: cuenta regresiva simple sobre el reloj. */
export function descansoRestante(transcurrido: number, duracionSeg: number): FaseDescanso {
  const restanteSeg = segundosRestantes(transcurrido, duracionSeg);
  return { restanteSeg, terminado: transcurrido >= duracionSeg * 1000 };
}

export interface CfgEmom {
  rondas: number;
  /** Largo de cada ronda; el EMOM es "every minute" (60) salvo que se diga otra cosa. */
  segPorRonda?: number;
}

export interface FaseEmom {
  /** Ronda en curso, 1-based. Al terminar se queda en la última. */
  ronda: number;
  /** Segundos que faltan de la ronda en curso (techo: arranca en segPorRonda). */
  restanteSeg: number;
  /** Rondas cuyo minuto ya cerró (0..rondas). Lo que el componente debe haber commiteado. */
  rondasCerradas: number;
  terminado: boolean;
}

/**
 * EMOM: el reloj corre FIJO desde INICIAR y nada lo reinicia; la ronda y sus
 * segundos salen de dividir el transcurrido. Si la app estuvo 3 minutos en
 * segundo plano, `rondasCerradas` da un salto de 3 y el componente commitea
 * esas rondas (sin registro = pendiente, nunca se asume 0).
 */
export function faseEmom(transcurrido: number, cfg: CfgEmom): FaseEmom {
  const seg = cfg.segPorRonda ?? 60;
  const rondas = Math.max(1, Math.floor(cfg.rondas));
  const rondaMs = seg * 1000;
  const totalMs = rondaMs * rondas;
  if (transcurrido >= totalMs) {
    return { ronda: rondas, restanteSeg: 0, rondasCerradas: rondas, terminado: true };
  }
  const cerradas = Math.floor(transcurrido / rondaMs);
  const enRonda = transcurrido - cerradas * rondaMs;
  return {
    ronda: cerradas + 1,
    restanteSeg: segundosRestantes(enRonda, seg),
    rondasCerradas: cerradas,
    terminado: false,
  };
}

export interface CfgMyoReps {
  /** Sobrecargas ya hechas (la que viene es la siguiente). */
  sobrecargas: number;
  /** Descanso entre sobrecargas; el método marca 5 s. */
  descansoSeg?: number;
}

export interface FaseMyoReps extends FaseDescanso {
  siguienteSobrecarga: number;
}

/** Myo-reps: el mini descanso de 5 s entre sobrecargas, sobre el reloj. */
export function faseMyoReps(transcurrido: number, cfg: CfgMyoReps): FaseMyoReps {
  const base = descansoRestante(transcurrido, cfg.descansoSeg ?? 5);
  return { ...base, siguienteSobrecarga: cfg.sobrecargas + 1 };
}

export interface CfgMethod35 {
  /** Series ya confirmadas. */
  seriesHechas: number;
}

export interface FaseMethod35 {
  /** Serie en curso, 1-based. */
  serie: number;
  /** A partir de 3 series el usuario puede cerrar el ejercicio. */
  puedeTerminar: boolean;
  /** A las 5 series el ejercicio cierra solo. */
  terminado: boolean;
}

/**
 * Método 3-5: NO lleva reloj (diagnóstico 21-sep-2026: cero setInterval,
 * cero tiempo; las series se cierran a mano). Su máquina es de series, no de
 * tiempo, y queda aquí para que el componente no la lleve suelta.
 */
export function faseMethod35(cfg: CfgMethod35): FaseMethod35 {
  const serie = cfg.seriesHechas + 1;
  return { serie, puedeTerminar: cfg.seriesHechas >= 3, terminado: cfg.seriesHechas >= 5 };
}

/** Regla de peso del 3-5 (intacta): compara las reps reales contra el objetivo. */
export function feedbackMethod35(reps: number, targetReps: number): { texto: string; cue: string } {
  if (reps > targetReps) return { texto: `${reps} reps → Sube peso`, cue: 'Sube peso.' };
  if (reps < targetReps) return { texto: `${reps} reps → Baja peso`, cue: 'Baja peso.' };
  return { texto: `${reps} reps → Peso perfecto`, cue: 'Peso perfecto.' };
}
