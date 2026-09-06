/**
 * Contexto Elite para ARGOS (ATP 3.0, 6-sep-2026, ruta 3.6). Puro: sin I/O.
 *
 * Cuando el usuario tiene una evaluación Elite cargada (`functional_dx` con
 * `sources_snapshot.elite_v3`), el system prompt lleva un bloque con el
 * resumen que ya escribe `resumenParaArgos` (elite-v3-core). Este módulo
 * arma ese bloque: encabezado fijo más resumen, con tope de longitud.
 *
 * El texto del encabezado viene del pivote (Parte 2.3 punto 6) tal cual; es
 * instrucción para el modelo, no copy de usuario. Aquí no se escribe ni una
 * palabra nueva de salud: el resumen sale del `elite_v3` ya validado (el
 * validador rechaza palabras rojas) o de `summary_text`, que lo guardó el RPC
 * de carga a partir del mismo resumen.
 */
import { RESUMEN_ARGOS_MAX, resumenParaArgos, validarEliteV3 } from './elite/elite-v3-core';

export const ENCABEZADO_EVALUACION_ELITE =
  'Evaluación Elite del usuario (interpretada por su equipo ATP; usa esto como fuente principal para suplementos, alimentación y prioridades; no es un diagnóstico):';

/** Tope del bloque completo: encabezado + salto + resumen (1,800 de elite-v3-core). */
export const BLOQUE_ELITE_MAX = ENCABEZADO_EVALUACION_ELITE.length + 1 + RESUMEN_ARGOS_MAX;

/** Lo que se lee de `functional_dx` para armar el bloque. */
export interface FilaEliteParaArgos {
  summary_text: string | null;
  sources_snapshot: unknown;
}

/**
 * El resumen de la fila: `summary_text` si existe (lo escribió la carga con
 * `resumenParaArgos`); si viene vacío, se genera desde `sources_snapshot.elite_v3`.
 * Null si el snapshot no valida: mejor sin bloque que con uno a medias.
 */
export function resumenDesdeFila(fila: FilaEliteParaArgos | null | undefined): string | null {
  if (!fila) return null;
  const guardado = typeof fila.summary_text === 'string' ? fila.summary_text.trim() : '';
  if (guardado) return guardado;
  const snapshot = fila.sources_snapshot;
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) return null;
  const ev = (snapshot as Record<string, unknown>).elite_v3;
  const r = validarEliteV3(ev);
  if (!r.ok) return null;
  const resumen = resumenParaArgos(r.valor).trim();
  return resumen || null;
}

/**
 * Bloque para la capa dinámica del system prompt. Con resumen vacío no hay
 * bloque (''): el encabezado solo prometería algo que no viene. Si el resumen
 * excede el tope se corta en el último espacio para no partir una palabra.
 */
export function construirBloqueElite(resumen: string | null | undefined): string {
  const texto = (resumen ?? '').trim();
  if (!texto) return '';
  let cuerpo = texto;
  if (cuerpo.length > RESUMEN_ARGOS_MAX) {
    const corte = cuerpo.lastIndexOf(' ', RESUMEN_ARGOS_MAX);
    cuerpo = cuerpo.slice(0, corte > 0 ? corte : RESUMEN_ARGOS_MAX).trimEnd();
  }
  return `${ENCABEZADO_EVALUACION_ELITE}\n${cuerpo}`;
}

/** ¿Este texto (por ejemplo `extraContext`) ya trae el bloque Elite? Para no duplicarlo. */
export function traeBloqueElite(texto: string | null | undefined): boolean {
  return typeof texto === 'string' && texto.includes(ENCABEZADO_EVALUACION_ELITE);
}
