/**
 * ARGOS Navegador — ¿esto es una petición de navegación? (NOCHE-ARGOS Pieza 5).
 *
 * El resolvedor ya sabe traducir "donde registro el ayuno" a una ruta. Lo que
 * faltaba es la pregunta anterior: de todo lo que el usuario escribe en el chat,
 * ¿QUÉ turnos son navegación y cuáles son una consulta de salud?
 *
 * POR QUÉ HACE FALTA ESTE FILTRO, Y POR QUÉ ES LO PRIMERO DEL TURNO:
 * si el chat le pasara TODO al resolvedor, "me duele la cabeza al ayunar"
 * mandaría al usuario a la pantalla de Ayuno en vez de responderle. Y si no le
 * pasara nada, cada "llévame a X" cuesta una llamada de chat: 280 H+ y una de
 * las 5 consultas diarias del tier gratis, para resolver un índice invertido que
 * ya viaja en el bundle. Ese es el error que ya nos costó caro con una usuaria
 * real: pagó y se quedó sin acceso.
 *
 * EL ORDEN DE LOS TRES CANDADOS IMPORTA:
 *   1. Disparador explícito. El usuario tiene que PEDIR que lo lleven. Sin verbo
 *      de navegación no hay navegación, por más que el resolvedor tenga opinión.
 *   2. Veto semántico. "por qué", "es normal", "me duele" son consultas de fondo
 *      aunque traigan un "dónde" adelante. Ante la duda, gana el chat: contestar
 *      de más es un turno cobrado, navegar de más es sacar al usuario de donde
 *      estaba.
 *   3. Longitud. Una petición de navegación es corta por naturaleza. Un párrafo
 *      con "ábreme" en medio es otra cosa.
 * Y la red de seguridad final: si los tres candados pasan pero el resolvedor NO
 * resuelve, el turno cae al chat normal. Nunca se le dice "no encontré" a alguien
 * que quizá estaba preguntando otra cosa.
 */
import {
  resolverDestino,
  normalizar,
  type ResultadoNav,
  type CandidatoNav,
} from './argos-nav-resolver-core';

/**
 * Verbos y frases con los que se pide un traslado. Se buscan al ARRANQUE del
 * texto normalizado: "llévame al ayuno" es navegación, "el ayuno me lleva a
 * dormir mal" no lo es, y la diferencia es la posición.
 */
export const DISPARADORES_NAV: readonly string[] = [
  'llevame', 'llevame a', 'llevame al',
  'llevar me', 'me llevas',
  'abreme', 'abre', 'abrir', 'abrime',
  'ir a', 'ir al', 'quiero ir', 'vamos a', 've a', 'vete a',
  'muestrame', 'ensename', 'enseñame',
  'donde', 'a donde', 'en donde',
  'como llego', 'como entro', 'como abro', 'como veo', 'como encuentro',
  'quiero ver', 'quiero abrir', 'quiero entrar',
  'necesito ver', 'necesito abrir',
  'busco', 'buscar',
  'sacame', 'mandame a', 'mandame al',
  'entra a', 'entrar a',
  'ponme en', 'ponme la pantalla',
];

/**
 * Lo que delata una consulta de fondo. Si aparece en cualquier parte del texto,
 * NO se navega, aunque el disparador esté.
 *
 * "para que sirve" está aquí a propósito: preguntar qué hace una pantalla es
 * trabajo de la inyección de contexto de pantalla, no del navegador. Llevarte a
 * un lado cuando preguntaste qué es, es no haber escuchado.
 */
export const VETOS_NAV: readonly string[] = [
  'por que', 'porque', 'deberia', 'debo', 'me conviene', 'es normal',
  'me duele', 'me siento', 'que opinas', 'que piensas', 'recomiendas',
  'recomiendame', 'que significa', 'para que sirve', 'que hace esta',
  'explicame', 'explica', 'ayudame a entender', 'cual es mejor',
  'cuanto', 'cuando debo', 'esta bien si', 'puedo comer', 'puedo tomar',
  'que tal si', 'sirve para', 'que es mejor', 'me ayuda',
];

/** Una petición de traslado es corta. Un párrafo con "ábreme" en medio no lo es. */
export const MAX_PALABRAS_NAV = 10;

export interface DeteccionNav {
  es: boolean;
  /** Por qué NO fue navegación. Para depurar y para los tests. */
  motivo?: 'sin_disparador' | 'veto_semantico' | 'demasiado_largo' | 'vacio';
}

function arrancaCon(texto: string, frase: string): boolean {
  return texto === frase || texto.startsWith(frase + ' ');
}

/**
 * ¿El usuario está pidiendo que lo lleven a algún lado?
 *
 * No decide A DÓNDE: eso es del resolvedor. Solo decide si vale la pena
 * preguntárselo.
 */
export function detectarIntencionNavegacion(texto: string | null | undefined): DeteccionNav {
  const t = normalizar(texto ?? '');
  if (!t) return { es: false, motivo: 'vacio' };

  for (const veto of VETOS_NAV) {
    if (t.includes(veto)) return { es: false, motivo: 'veto_semantico' };
  }

  const palabras = t.split(' ').filter(Boolean);
  if (palabras.length > MAX_PALABRAS_NAV) return { es: false, motivo: 'demasiado_largo' };

  for (const d of DISPARADORES_NAV) {
    if (arrancaCon(t, d)) return { es: true };
  }
  return { es: false, motivo: 'sin_disparador' };
}

// ---------------------------------------------------------------------------
// Decisión del turno
// ---------------------------------------------------------------------------

export type TurnoNav =
  /** Hay ganador claro. El chat navega y lo dice. */
  | { accion: 'navegar'; ruta: string; titulo: string; mensaje: string }
  /** Dos plausibles. El chat PREGUNTA con las opciones. Contrato: no adivinar. */
  | { accion: 'preguntar'; mensaje: string; opciones: CandidatoNav[] }
  /** Existe pero ARGOS no abre ahí, o falta un dato. Se dice y no se mueve nada. */
  | { accion: 'avisar'; mensaje: string }
  /** No era navegación, o el índice local no alcanzó: turno normal de chat. */
  | { accion: 'chat'; escalable: boolean };

function listar(candidatos: readonly CandidatoNav[]): string {
  return candidatos.map((c) => `"${c.titulo}"`).join(' o ');
}

/**
 * Traduce un resultado del resolvedor a lo que hace el turno. Puro: no navega,
 * no toca estado. El componente ejecuta.
 *
 * `sin_resultado` cae a chat con `escalable: true`. Ese es el único camino que
 * puede llegar a costar H+, y por eso viaja marcado: quien lo consuma decide si
 * gasta o no, con el dato a la vista.
 */
export function turnoDesdeResultado(resultado: ResultadoNav): TurnoNav {
  switch (resultado.tipo) {
    case 'resuelta':
      return {
        accion: 'navegar',
        ruta: resultado.ruta,
        titulo: resultado.titulo,
        mensaje: `Listo, te llevo a ${resultado.titulo}.`,
      };

    case 'ambigua':
      return {
        accion: 'preguntar',
        mensaje: `¿Te refieres a ${listar(resultado.candidatos)}?`,
        opciones: resultado.candidatos,
      };

    case 'requiere_dato':
      return {
        accion: 'avisar',
        mensaje: `Para abrir ${resultado.titulo} necesito saber cuál en específico.`,
      };

    case 'bloqueada':
      return {
        accion: 'avisar',
        mensaje: 'Esa parte de la app no se abre desde aquí.',
      };

    case 'sin_resultado':
    default:
      return { accion: 'chat', escalable: true };
  }
}

/**
 * La puerta única del turno: texto del usuario a decisión.
 *
 * Devuelve `chat` en todo lo que no sea navegación clarísima. Es deliberado:
 * el costo de equivocarse hacia el chat es un turno cobrado; el costo de
 * equivocarse hacia la navegación es sacar al usuario de donde estaba parado
 * en medio de una pregunta de salud.
 */
export function decidirTurnoNav(texto: string | null | undefined): TurnoNav {
  const deteccion = detectarIntencionNavegacion(texto);
  if (!deteccion.es) return { accion: 'chat', escalable: false };
  return turnoDesdeResultado(resolverDestino(texto ?? ''));
}
