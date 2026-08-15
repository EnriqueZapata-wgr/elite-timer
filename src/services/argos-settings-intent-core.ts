/**
 * ARGOS Configura la app — de la frase a la petición, lógica pura (P7).
 *
 * El catálogo (argos-settings-core) ya sabe qué ajustes son operables y cómo se
 * confirman. Lo que faltaba es leer "apágame los sonidos" y sacar de ahí
 * `{ clave: 'sonidos', valor: false }`.
 *
 * ES LOCAL A PROPÓSITO, igual que la navegación: son 9 ajustes con sus alias ya
 * escritos a mano en el catálogo. Mandar eso a un modelo cobraría una consulta
 * de la cuota diaria por apagar la vibración.
 *
 * DOS CANDADOS, Y EL SEGUNDO ES EL QUE IMPORTA:
 *  1. Tiene que haber un VERBO de configuración. Sin él, "el modo oscuro me
 *     cansa la vista" sería una orden de cambiar el tema en vez de un comentario.
 *  2. Tiene que calzar un ALIAS del catálogo, y gana el MÁS LARGO. Sin esa
 *     regla, "pon el modo simple de nutrición" calza también con "modo" a secas
 *     y el desempate lo decide el orden del arreglo, que es un accidente.
 *
 * Lo que este archivo NO decide: si se aplica. Eso es de planearAjuste, que es
 * la única puerta y la que impone la confirmación.
 */
import { AJUSTES_ARGOS, type AjusteArgos } from './argos-settings-core';
import { normalizar, tokenizar } from './argos-nav-resolver-core';

/** Verbos con los que se ordena un cambio de configuración. */
export const VERBOS_AJUSTE: readonly string[] = [
  'enciende', 'encender', 'enciendeme', 'prende', 'prendeme',
  'activa', 'activame', 'activar', 'habilita',
  'apaga', 'apagame', 'apagar', 'desactiva', 'desactivame', 'desactivar',
  'deshabilita', 'quita', 'quitame', 'silencia',
  'cambia', 'cambiame', 'cambiar', 'ponme', 'pon', 'poner', 'dejame',
  'configura', 'configurame', 'ajusta', 'ajustame',
];

/** Lo que significa "sí". */
const AFIRMATIVOS: readonly string[] = [
  'enciende', 'encender', 'enciendeme', 'prende', 'prendeme',
  'activa', 'activame', 'activar', 'habilita', 'muestra', 'muestrame',
];

/** Lo que significa "no". */
const NEGATIVOS: readonly string[] = [
  'apaga', 'apagame', 'apagar', 'desactiva', 'desactivame', 'desactivar',
  'deshabilita', 'quita', 'quitame', 'silencia', 'oculta', 'esconde',
  'ya no', 'sin ',
];

/**
 * Sinónimos de los valores de opción que el usuario dice pero que el catálogo
 * no lista. El catálogo usa el nombre canónico; aquí se aceptan los de la calle.
 */
const SINONIMOS_VALOR: Readonly<Record<string, readonly string[]>> = {
  claro: ['claro', 'blanco', 'dia', 'light'],
  oscuro: ['oscuro', 'negro', 'noche', 'dark'],
  adaptativo: ['adaptativo', 'automatico', 'auto'],
  sistema: ['sistema', 'del telefono', 'del celular'],
  simple: ['simple', 'sencillo', 'basico', 'corto'],
  completo: ['completo', 'avanzado', 'detallado', 'con macro'],
  activo: ['activo', 'activa', 'de vuelta', 'otra vez'],
  graduado: ['graduado', 'graduar', 'graduado ya', 'ya lo domino'],
  reposo: ['reposo', 'pausa', 'pausado', 'descanso', 'en pausa'],
};

export interface PeticionAjuste {
  clave: string;
  valor: string | boolean;
  /** Qué alias disparó el match. Para depurar y para el copy. */
  alias: string;
}

function tieneVerbo(t: string): boolean {
  return VERBOS_AJUSTE.some((v) => t === v || t.startsWith(v + ' ') || t.includes(' ' + v + ' '));
}

function contieneAlguno(t: string, lista: readonly string[]): boolean {
  return lista.some((p) => t.includes(p));
}

/**
 * El alias más específico que calce. Gana el que aporta MÁS tokens.
 *
 * El match es por tokens y no por substring porque el catálogo escribe los
 * alias en infinitivo ("poner en reposo") y la gente conjuga ("pon en reposo").
 * Un `includes` literal falla ahí, y falla en silencio: la frase se va al chat
 * y el ajuste nunca se aplica. tokenizar además singulariza y tira muletillas,
 * o sea que resuelve de paso "sonido" contra "sonidos".
 *
 * El desempate es por número de tokens y no por orden del arreglo: si lo
 * decidiera el orden, agregar una entrada nueva al catálogo movería en silencio
 * a qué ajuste resuelve una frase que ya funcionaba.
 */
function mejorAjuste(tokensTexto: readonly string[]): { ajuste: AjusteArgos; alias: string } | null {
  const set = new Set(tokensTexto);
  let mejor: { ajuste: AjusteArgos; alias: string; peso: number } | null = null;
  for (const ajuste of AJUSTES_ARGOS) {
    for (const alias of ajuste.alias) {
      const tokensAlias = tokenizar(alias);
      if (tokensAlias.length === 0) continue;
      if (!tokensAlias.every((tk) => set.has(tk))) continue;
      if (!mejor || tokensAlias.length > mejor.peso) {
        mejor = { ajuste, alias, peso: tokensAlias.length };
      }
    }
  }
  return mejor ? { ajuste: mejor.ajuste, alias: mejor.alias } : null;
}

/** Para los ajustes de opción: cuál de los valores válidos pidió el usuario. */
function valorDeOpcion(t: string, ajuste: AjusteArgos): string | null {
  for (const opcion of ajuste.opciones ?? []) {
    const formas = SINONIMOS_VALOR[opcion] ?? [opcion];
    if (formas.some((f) => t.includes(normalizar(f)))) return opcion;
  }
  return null;
}

/**
 * ¿El usuario está pidiendo cambiar un ajuste? Devuelve `null` en todo lo demás.
 *
 * Devolver `null` es lo normal y lo barato: el turno sigue su camino al chat.
 * Un falso positivo, en cambio, cambia la app de alguien que solo estaba
 * platicando, y por eso los dos candados son estrictos.
 */
export function detectarIntencionAjuste(texto: string | null | undefined): PeticionAjuste | null {
  const t = normalizar(texto ?? '');
  if (!t) return null;
  if (!tieneVerbo(t)) return null;

  const match = mejorAjuste(tokenizar(t));
  if (!match) return null;
  const { ajuste, alias } = match;

  if (ajuste.tipo === 'booleano') {
    // El orden importa: "quítame los sonidos" trae "quita" y nada más, pero
    // "no me pongas los sonidos" trae ambos. Gana el negativo, porque decir
    // que no de más es reversible y encender de más es intrusivo.
    if (contieneAlguno(t, NEGATIVOS)) return { clave: ajuste.clave, valor: false, alias };
    if (contieneAlguno(t, AFIRMATIVOS)) return { clave: ajuste.clave, valor: true, alias };
    return null; // "cambia los sonidos" no dice a qué. No se adivina.
  }

  const valor = valorDeOpcion(t, ajuste);
  if (valor == null) return null;
  return { clave: ajuste.clave, valor, alias };
}
