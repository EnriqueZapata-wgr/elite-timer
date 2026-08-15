/**
 * ARGOS Navegador — el respaldo con modelo, lógica pura (NOCHE-ARGOS Pieza 8).
 *
 * Es el segundo camino, y solo corre cuando el índice local YA falló. El primero
 * cuesta 0 y atiende la mayoría; este cuesta 20 H+ y una consulta de la cuota
 * diaria. Invertir el orden convertiría cada "llévame a" en una llamada de red.
 *
 * POR QUÉ VALE LA PENA EXISTIR IGUAL: sin él, una petición de navegación que el
 * índice no resuelve se va al chat completo. Eso son 280 H+, el cerebro entero
 * (~26K tokens) y Sonnet, para contestar dónde está un botón. Aquí son 20 H+,
 * Gemini Flash, cero datos clínicos y un prompt de una página. 14 veces más
 * barato por hacer un trabajo 14 veces más chico.
 *
 * SE LE MANDA EL CATÁLOGO COMPLETO, no el top-3 del índice. Recortar la lista
 * con el mismo índice que acaba de fallar sería pedirle al modelo que acierte
 * dentro del error. Son ~190 títulos: cabe de sobra y es lo único que puede
 * rescatar el turno.
 *
 * Y LO QUE DEVUELVA SE VALIDA CONTRA EL CATÁLOGO ANTES DE MOVER NADA. El modelo
 * alucina rutas plausibles (/mis-analisis, /ayuno) que no existen; sin ese
 * filtro ARGOS navega a una pantalla en blanco con total seguridad.
 */

import { APP_ROUTES } from '@/src/constants/app-routes.generated';
import { tituloDe, rutaVetada } from './argos-nav-resolver-core';

/** Lo que el modelo debe contestar cuando ninguna pantalla corresponde. */
export const SIN_RUTA = 'NINGUNA';

export interface RutaCatalogada {
  ruta: string;
  titulo: string;
}

let catalogo: RutaCatalogada[] | null = null;

/**
 * El catálogo que ve el modelo. Las rutas vetadas NO viajan: si no aparecen en
 * la lista, el modelo no puede proponerlas y el veto deja de depender de que el
 * filtro de salida se acuerde de correr. Dos candados en serie valen más que
 * uno bueno.
 */
export function catalogoNavegable(): RutaCatalogada[] {
  if (catalogo) return catalogo;
  catalogo = APP_ROUTES
    .filter((r) => !rutaVetada(r))
    .map((r) => ({ ruta: r, titulo: tituloDe(r) }));
  return catalogo;
}

/** Solo para tests. */
export function _resetCatalogo(): void {
  catalogo = null;
}

/**
 * El system prompt. Corto a propósito: este modelo no interpreta salud, hace
 * una sola cosa, y cada línea de más es un token que se paga por navegar.
 */
export function construirPromptNav(rutas: readonly RutaCatalogada[]): string {
  const lista = rutas.map((r) => `${r.ruta} = ${r.titulo}`).join('\n');
  return [
    'Eres el buscador de pantallas de una app de salud. El usuario describe a',
    'dónde quiere ir y tú devuelves la RUTA exacta de la lista.',
    '',
    'REGLAS:',
    '1. Responde SOLO con la ruta, sin explicar, sin comillas, sin punto final.',
    `2. Si ninguna corresponde con claridad, responde exactamente ${SIN_RUTA}.`,
    '3. NUNCA inventes una ruta que no esté en la lista.',
    '4. Ante duda entre dos, responde la más general.',
    '',
    'PANTALLAS:',
    lista,
  ].join('\n');
}

/**
 * Saca la ruta de lo que haya contestado el modelo.
 *
 * Es tolerante porque los modelos adornan aunque se les pida que no: comillas,
 * backticks, "La ruta es: /fasting", un punto final. Ser estricto aquí tiraría
 * respuestas correctas y cobraría 20 H+ por nada.
 */
export function extraerRutaDeRespuesta(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const limpio = texto.trim();
  if (limpio.toUpperCase().includes(SIN_RUTA)) return null;
  // La primera cosa que parezca ruta. `validarRutaPropuesta` hace el juicio
  // final: aquí solo se extrae.
  const m = limpio.match(/\/[A-Za-z0-9\-_/[\]]*/);
  if (!m) return null;
  return m[0].replace(/[.,;:)\]]+$/, '') || null;
}
