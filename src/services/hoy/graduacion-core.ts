/**
 * graduacion-core (MB-26 Pieza 2) — la regla de graduación, pura.
 *
 * Un hábito activo que se cumple 30 de los últimos 35 días es candidato a
 * graduarse. LA APP PROPONE, EL USUARIO ACEPTA: aquí solo se calculan
 * candidatos y recaídas; ninguna función de este módulo cambia estados.
 *
 * Si un graduado recae (se le va 5 de 7 días) vuelve solo a activo y se
 * avisa sin regaño. La recaída solo se evalúa en hábitos VERIFICADOS: su
 * hecho/no-hecho nace de actividad real aunque no ocupen renglón. Un
 * declarativo graduado ya no tiene card que palomear — su silencio no es
 * evidencia de nada y dejarlo caer por eso sería castigar el premio.
 *
 * El historial NO vive en una tabla de rachas nueva: es el ledger por
 * fecha que ya existe (electron_logs, una fila por hábito y día, escrita
 * por awardBooleanElectron tanto para declarativos como verificados; el
 * blob de daily_electrons es vestigial para verificados desde MB-5).
 * mente-streaks-* es de otro dominio y no se toca.
 */
import { VERIFIED_ELECTRON_KEYS } from '@/src/services/hoy/day-booleans';
import type { HabitEstado } from '@/src/services/hoy/habit-states-core';

/** 30 de los últimos 35 días cumplidos → candidato a graduarse. */
export const GRADUACION = { dias: 35, minimo: 30 } as const;
/** 5 de los últimos 7 días fallados → el graduado vuelve a activo. */
export const RECAIDA = { dias: 7, fallosMinimos: 5 } as const;
/** 14 de los últimos 21 días → sostienes los core del pack (Pieza 7.2). */
export const ETAPA_PACK = { dias: 21, minimo: 14 } as const;

/** Historial por hábito: fechas locales 'YYYY-MM-DD' con el hábito hecho. */
export type HistorialHabitos = Record<string, ReadonlySet<string>>;

function fmtFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Las últimas n fechas locales terminando en `hoy` (inclusive). Mediodía
 *  local como ancla: el DST no puede recorrer el día. */
export function ultimasFechas(hoy: string, n: number): string[] {
  const [y, m, d] = hoy.split('-').map((v) => parseInt(v, 10));
  const base = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(fmtFecha(new Date(base.getTime() - i * 86400000)));
  }
  return out;
}

/** Días cumplidos dentro de la ventana de los últimos `dias`. */
export function cumplidosEnVentana(
  hechas: ReadonlySet<string> | undefined,
  hoy: string,
  dias: number,
): number {
  if (!hechas || hechas.size === 0) return 0;
  return ultimasFechas(hoy, dias).filter((f) => hechas.has(f)).length;
}

/** 30/35 propone; 29/35 no. */
export function esCandidatoAGraduar(hechas: ReadonlySet<string> | undefined, hoy: string): boolean {
  return cumplidosEnVentana(hechas, hoy, GRADUACION.dias) >= GRADUACION.minimo;
}

/** Recaída del graduado: se le fueron 5 de los últimos 7 días. */
export function hayRecaida(hechas: ReadonlySet<string> | undefined, hoy: string): boolean {
  const fallos = RECAIDA.dias - cumplidosEnVentana(hechas, hoy, RECAIDA.dias);
  return fallos >= RECAIDA.fallosMinimos;
}

/**
 * Candidatos a graduar: SOLO hábitos activos que cumplen 30/35. La app
 * propone; aceptar es del usuario (Pieza 2: nunca gradúa solo).
 */
export function propuestasDeGraduacion(
  activos: string[],
  historial: HistorialHabitos,
  hoy: string,
): string[] {
  return activos.filter((k) => esCandidatoAGraduar(historial[k], hoy));
}

/**
 * Graduados VERIFICADOS que recayeron: estos SÍ vuelven solos a activo
 * (con aviso sin regaño; la escritura vive en graduacion-service).
 */
export function recaidasDeGraduados(
  estados: Record<string, HabitEstado>,
  historial: HistorialHabitos,
  hoy: string,
): string[] {
  const verificados = VERIFIED_ELECTRON_KEYS as readonly string[];
  return Object.keys(estados).filter(
    (k) => estados[k] === 'graduado' && verificados.includes(k) && hayRecaida(historial[k], hoy),
  );
}
