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
  esTokenDeDestino,
  PALABRAS_VACIAS,
  type ResultadoNav,
  type CandidatoNav,
} from './argos-nav-resolver-core';

/**
 * RAÍCES de los verbos con los que se pide un traslado, NO conjugaciones.
 *
 * POR QUÉ CAMBIÓ (VOZ-1). Antes esto era una lista de 30 frases exactas que se
 * buscaban al arranque del texto. Traía "muestrame" pero no "me muestras", así
 * que "¿me muestras mis labs?" se caía al chat y contestaba con un ensayo en vez
 * de abrir la pantalla. Ese es el bug medido, y su causa no es que faltara una
 * frase: es que el español tiene más conjugaciones de las que nadie va a
 * escribir a mano. Exigirle al usuario la fórmula exacta es lo contrario de
 * tener un modelo de lenguaje.
 *
 * Una raíz de 4+ letras cubre la familia entera: `muestr` atrapa "muéstrame",
 * "me muestras", "muéstramelo"; `llev` atrapa "llévame", "me llevas",
 * "llevarme". Se comparan como PREFIJO de una palabra ya normalizada.
 *
 * Cuidado al agregar: la raíz tiene que ser lo bastante larga para no morder
 * otra palabra. Por eso `entra` y no `entr` (que se comería "entrenar"), y
 * `abre`/`abri` y no `abr` (que se comería "abrazo" y "abril").
 */
export const RAICES_NAV: readonly string[] = [
  'llev',                 // llévame, me llevas, llevarme, llévanos
  'muestr', 'mostr',      // muéstrame, me muestras, mostrarme, mostrar
  'abre', 'abri', 'abra',  // ábreme, abre, abrir, ábramelo
  'ensen',                // enséñame, me enseñas, enseñarme
  'entra',                // entra, entrar (NO "entrenar", que empieza con entre)
  'busc',                 // busco, buscar, buscando
  'encuentr', 'encontr',  // encuéntrame, encontrar
  'ubica',                // ubícame, ubicar
  'acced',                // acceder, accede
  'naveg',                // navegar, navégame
  'lleg',                 // cómo llego, llegar a
  'sacam', 'sacar',       // sácame, sacar
  'manda',                // mándame
  'ponme',                // ponme en
  'dirig',                // dirígeme
  'donde', 'adonde',      // dónde, adónde, en dónde
];

/**
 * Verbos de traslado demasiado cortos para tratarlos como prefijo. Se comparan
 * como palabra COMPLETA: `ve` como prefijo se comería "vengo" y "verde".
 */
export const PALABRAS_NAV: readonly string[] = [
  'ver', 'veo', 'vea', 'verlo', 'verla', 've', 'vete', 'vamos', 'voy', 'vas',
  'ir', 'irme', 'ire',
];

/**
 * Vocativos y muletillas de apertura. Se recortan ANTES de mirar el orden de la
 * frase, porque "oye ARGOS, me muestras mis labs" es la misma petición que "me
 * muestras mis labs" y no debe cambiar de veredicto por el saludo de enfrente.
 */
export const APERTURAS_NAV: readonly string[] = [
  'oye', 'oiga', 'hey', 'ey', 'hola', 'argos', 'porfa', 'porfavor', 'favor',
  'disculpa', 'perdon', 'perdona', 'ok', 'okey', 'bueno', 'pues', 'este', 'ya',
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

/**
 * Cuántas palabras de contenido puede tener una frase para que ARGOS se atreva
 * a leerla como un destino a secas ("mis labs", "el ayuno"). Más largo que esto
 * ya es una oración, y una oración sin verbo de traslado es una consulta.
 */
export const MAX_PALABRAS_DESTINO_DESNUDO = 4;

/**
 * Qué tan bien tiene que resolver una frase SIN verbo para que valga la pena
 * preguntar "¿te llevo?".
 *
 * NO es un número inventado. Medido contra el índice real: un destino a secas
 * pega un alias limpio y sale por arriba de 38 ("mis labs" 40, "el ayuno" 38,
 * "mi agenda" 60). Una consulta de salud que roza una pantalla de refilón se
 * queda abajo de 21 ("estoy cansado" 14, "cómo bajo de peso" 20, "hola ARGOS
 * buenos días" 16). El piso vive en medio de ese hueco, no pegado a ninguno de
 * los dos bordes.
 */
export const UMBRAL_DESTINO_DESNUDO = 30;

export interface DeteccionNav {
  /** Petición clara de traslado: hay verbo y apunta a un destino. */
  es: boolean;
  /**
   * Podría ser una petición pero no hay verbo que lo confirme ("mis labs").
   * NUNCA se navega con esto: se PREGUNTA. Un "¿te llevo?" de más cuesta un
   * toque; navegar de más saca a la persona de donde estaba.
   */
  duda?: boolean;
  /** Por qué NO fue navegación. Para depurar y para los tests. */
  motivo?: 'sin_disparador' | 'veto_semantico' | 'demasiado_largo' | 'vacio';
}

function esRaiz(palabra: string): boolean {
  if (PALABRAS_NAV.includes(palabra)) return true;
  return RAICES_NAV.some((r) => palabra.startsWith(r));
}

/** Recorta vocativos y muletillas del arranque. "oye argos ..." → "...". */
function sinApertura(palabras: string[]): string[] {
  let i = 0;
  while (i < palabras.length && APERTURAS_NAV.includes(palabras[i])) i++;
  // Todo era saludo: se devuelve tal cual para no dejar la frase vacía.
  return i >= palabras.length ? palabras : palabras.slice(i);
}

/**
 * ¿El usuario está pidiendo que lo lleven a algún lado?
 *
 * No decide A DÓNDE: eso es del resolvedor. Solo decide si vale la pena
 * preguntárselo, y con cuánta confianza.
 *
 * EL CRITERIO QUE SUSTITUYE A LA LISTA DE FRASES: en una petición de traslado el
 * verbo va ANTES del destino ("muéstrame mis labs"). Cuando el destino va antes
 * y el verbo después, el destino es el sujeto de otra cosa ("el ayuno me lleva a
 * dormir mal") y eso es una consulta, no una petición. Es la diferencia
 * gramatical de verdad entre los dos casos, y no depende de que alguien haya
 * escrito a mano la conjugación correcta.
 */
export function detectarIntencionNavegacion(texto: string | null | undefined): DeteccionNav {
  const t = normalizar(texto ?? '');
  if (!t) return { es: false, motivo: 'vacio' };

  for (const veto of VETOS_NAV) {
    if (t.includes(veto)) return { es: false, motivo: 'veto_semantico' };
  }

  const crudas = t.split(' ').filter(Boolean);
  if (crudas.length > MAX_PALABRAS_NAV) return { es: false, motivo: 'demasiado_largo' };

  const palabras = sinApertura(crudas);
  const iVerbo = palabras.findIndex(esRaiz);
  // Un verbo de traslado NUNCA cuenta como destino, aunque el índice lo conozca.
  // Medido: "lleva" aparece en la descripción de un reporte, así que "me llevas
  // a mis labs" se leía como destino-antes-de-verbo y moría en el chat. El
  // vocabulario del índice es de pantallas, no de gramática.
  const iDestino = palabras.findIndex((p) => !esRaiz(p) && esTokenDeDestino(p));

  if (iVerbo >= 0 && (iDestino < 0 || iVerbo < iDestino)) return { es: true };

  // Sin verbo de traslado, pero corto y con vocabulario de la app: puede ser un
  // destino a secas. No se afirma, se marca la duda; quien decide es el
  // resolvedor y lo que sale de ahí es una PREGUNTA.
  if (iVerbo < 0 && iDestino >= 0) {
    // TODA palabra de contenido tiene que ser vocabulario de la app. Es la misma
    // doctrina de COBERTURA_MINIMA del resolvedor, aplicada antes de resolver:
    // si algo de lo que dijo no lo conocemos, no estaba nombrando una pantalla.
    // Medido: sin esto, "ayuno 16 8" ofrecía llevar a Ayuno en vez de contestar
    // sobre el 16:8, y "gracias ARGOS" ofrecía llevar al chat desde el chat.
    const contenido = palabras.filter(
      (p) => !PALABRAS_VACIAS.has(p) && !APERTURAS_NAV.includes(p),
    );
    const todoConocido = contenido.length > 0 && contenido.every(esTokenDeDestino);
    if (todoConocido && contenido.length <= MAX_PALABRAS_DESTINO_DESNUDO) {
      return { es: false, duda: true, motivo: 'sin_disparador' };
    }
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
      // NAV-2: con opciones expandidas, el turno PREGUNTA en vez de avisar y
      // morir. Ver el mismo caso en argos-nav-exec-core.
      if (resultado.opciones && resultado.opciones.length > 0) {
        return {
          accion: 'preguntar',
          mensaje: `¿Te refieres a ${listar(resultado.opciones)}?`,
          opciones: resultado.opciones,
        };
      }
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
 * Un destino a secas resuelto con claridad no se navega: se OFRECE.
 *
 * Es la respuesta a "si tiene duda, que pregunte". El usuario escribió "mis
 * labs" y puede querer dos cosas distintas: que lo lleven, o que le cuenten qué
 * dicen. Adivinar cualquiera de las dos es apostar; preguntar cuesta un toque y
 * cero protones. Se reusa la acción `preguntar` con UNA opción a propósito: la
 * pantalla ya sabe pintar chips de desambiguación, así que un ofrecimiento no
 * necesita interfaz nueva ni un camino que se pueda pudrir aparte.
 */
function turnoDesdeDuda(texto: string): TurnoNav | null {
  const r = resolverDestino(texto);
  if (r.tipo !== 'resuelta' || r.puntaje < UMBRAL_DESTINO_DESNUDO) return null;
  // Ofrecer el chat desde el chat. Este detector solo corre dentro de la
  // conversación, así que llevar ahí no mueve a nadie a ningún lado.
  if (r.ruta === '/argos-chat') return null;
  return {
    accion: 'preguntar',
    mensaje: `¿Te llevo a ${r.titulo}?`,
    opciones: [{ ruta: r.ruta, titulo: r.titulo, puntaje: r.puntaje }],
  };
}

/**
 * La puerta única del turno: texto del usuario a decisión.
 *
 * Devuelve `chat` en todo lo que no sea navegación clarísima. Es deliberado:
 * el costo de equivocarse hacia el chat es un turno cobrado; el costo de
 * equivocarse hacia la navegación es sacar al usuario de donde estaba parado
 * en medio de una pregunta de salud.
 *
 * VOZ-1, LA REGLA DE COSTO QUE NO SE TOCA: una duda nunca escala al modelo.
 * Escalar es pagar por una corazonada. Si el índice local no la resolvió con
 * holgura, el turno sigue al chat como siempre y ahí se decide.
 */
export function decidirTurnoNav(texto: string | null | undefined): TurnoNav {
  const deteccion = detectarIntencionNavegacion(texto);
  if (deteccion.es) return turnoDesdeResultado(resolverDestino(texto ?? ''));
  if (deteccion.duda) {
    const oferta = turnoDesdeDuda(texto ?? '');
    if (oferta) return oferta;
  }
  return { accion: 'chat', escalable: false };
}
