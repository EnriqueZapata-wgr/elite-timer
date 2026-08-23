/**
 * LEER LA LISTA DE INGREDIENTES — lo que los sellos no alcanzan a decir.
 *
 * POR QUÉ
 * Los sellos de la NOM-051 miden cantidades: cuánta azúcar, cuánto sodio,
 * cuánta grasa. No miden QUÉ es la cosa. Un paquete de tocino prensado puede
 * traer los mismos sellos que una pieza de tocino de verdad y no ser lo mismo:
 * uno es carne, el otro es recorte de carne, agua, almidón, proteína aislada y
 * grasa endurecida, pegado con transglutaminasa y prensado con forma de
 * tocino. La diferencia no está en la tabla nutrimental. Está en la lista de
 * ingredientes, que es la parte que casi nadie lee.
 *
 * QUÉ HACE ESTE ARCHIVO
 * Marca ingredientes que NO EXISTEN EN UNA COCINA. Ese es el criterio, y es
 * deliberadamente simple de explicar: si es algo que no podrías comprar para
 * cocinar en tu casa, está ahí para que el producto se parezca a un alimento
 * (que dure, que tenga cuerpo, que sepa, que se vea) y no para alimentarte.
 * Es la idea que la clasificación NOVA (Monteiro y cols., Universidad de São
 * Paulo) llama "marcadores de ultraprocesamiento".
 *
 * LO QUE ESTO NO ES
 * No es un juicio de toxicidad ni una advertencia clínica. Ninguno de estos
 * ingredientes está prohibido y varios son inofensivos por sí solos. Lo que
 * señalan, juntos, es qué tan lejos está ese paquete de ser comida. Esa
 * distinción se dice tal cual en la pantalla; aquí no se emite veredicto de
 * salud sobre ningún producto.
 */

export type CategoriaMarcador =
  | 'grasa_modificada'
  | 'azucar_disfrazada'
  | 'proteina_aislada'
  | 'textura'
  | 'sabor_color'
  | 'conservador';

export interface Marcador {
  categoria: CategoriaMarcador;
  /** Cómo apareció en la etiqueta. */
  encontrado: string;
  /** Qué hace ahí, en una línea, sin tecnicismos. */
  paraQue: string;
}

/**
 * Cada patrón se busca en la lista de ingredientes ya normalizada (minúsculas
 * y sin acentos). Se listan las formas que de verdad aparecen en empaques
 * mexicanos, incluidas las abreviadas.
 */
const PATRONES: Array<{
  categoria: CategoriaMarcador;
  regex: RegExp;
  paraQue: string;
}> = [
  {
    categoria: 'grasa_modificada',
    regex: /\b(parcialmente\s+hidrogenad[oa]s?|aceite\s+hidrogenad[oa]s?|grasa\s+hidrogenad[oa]s?|manteca\s+vegetal|grasa\s+vegetal\s+parcialmente)/,
    paraQue: 'endurece una grasa líquida para que el producto tenga cuerpo y aguante en el anaquel',
  },
  {
    categoria: 'grasa_modificada',
    regex: /\b(interesterificad[oa]s?|grasa\s+interesterificada)/,
    paraQue: 'reacomoda la grasa para que quede sólida sin declarar grasas trans',
  },
  {
    categoria: 'azucar_disfrazada',
    regex: /\b(jarabe\s+de\s+ma[ií]z\s+de\s+alta\s+fructosa|jarabe\s+de\s+ma[ií]z|alta\s+fructosa|fructosa\s+cristalina|dextrosa|maltodextrina|jarabe\s+de\s+glucosa|azucar\s+invertid[oa]|melaza|jarabe\s+de\s+agave)/,
    paraQue: 'es azúcar con otro nombre; varias formas juntas reparten el total para que ninguna encabece la lista',
  },
  {
    categoria: 'proteina_aislada',
    // 4EP: se fueron "proteína de soya" y "gluten de trigo". El criterio de
    // este archivo es "algo que no podrías comprar para cocinar en tu casa", y
    // los dos lo incumplen: el gluten se vende en bolsa y es la base del
    // seitán, y la proteína de soya ES el producto en un tofu o una bebida de
    // soya. Marcarlos contradecía la regla que la cabecera declara.
    regex: /\b(prote[ií]na\s+aislada|aislado\s+de\s+soya|prote[ií]na\s+vegetal\s+texturizada|prote[ií]na\s+hidrolizada|caseinato|colageno\s+hidrolizado)/,
    paraQue: 'sustituye carne o leche por proteína barata que aporta gramos pero no el alimento',
  },
  {
    categoria: 'textura',
    // 4EP: se fue "lecitina de soya". Es un emulsificante que en chocolate
    // BAJA la viscosidad; ni pega, ni retiene agua, ni añade peso, así que la
    // explicación de esta categoría era falsa para ella. Y aparece en casi
    // todo chocolate, incluido uno de cuatro ingredientes: marcarla convertía
    // el marcador en ruido justo donde no había nada que señalar.
    // Se añaden "fosfatos" a secas y "difosfato", que es como vienen impresos
    // en la mayoría de los cárnicos mexicanos.
    regex: /\b(transglutaminasa|carragenina|goma\s+xantana|goma\s+guar|almid[oó]n\s+modificad[oa]|celulosa\s+microcristalina|(?:poli|di|tri)?fosfatos?|fosfato\s+de\s+sodio|carboximetilcelulosa|mono\s+y\s+digl[ií]ceridos|poliglicerol)/,
    paraQue: 'pega, espesa o retiene agua para que el producto se sienta firme y pese más',
  },
  {
    categoria: 'sabor_color',
    // "sabor artificial" y "colorante artificial" también aparecen así de
    // secos en empaques mexicanos (4EP).
    regex: /\b(saborizantes?|sabor(?:es)?\s+artificial(?:es)?|colorantes?\s+artificial(?:es)?|aroma\s+artificial|glutamato\s+monos[oó]dico|inosinato|guanilato|extracto\s+de\s+levadura|rojo\s+40|amarillo\s+[56]|azul\s+1|caramelo\s+clase\s+i{1,4}|tartrazina|carm[ií]n)/,
    paraQue: 'pone el sabor o el color que el ingrediente real ya no aporta',
  },
  {
    categoria: 'conservador',
    regex: /\b(benzoato\s+de\s+sodio|sorbato\s+de\s+potasio|nitrito\s+de\s+sodio|nitrato\s+de\s+sodio|bht|bha|tbhq|propionato\s+de\s+calcio|eritorbato)/,
    paraQue: 'alarga la vida del producto en el anaquel',
  },
];

/** Minúsculas y sin acentos, para que "proteína" y "proteina" sean lo mismo. */
export function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface LecturaIngredientes {
  /** La lista tal cual, separada por comas. */
  ingredientes: string[];
  marcadores: Marcador[];
  /** Cuántos ingredientes distintos declara. */
  cuantos: number;
  /**
   * Formas de azúcar distintas encontradas. Cuando son varias, es la señal de
   * que el total está repartido a propósito.
   */
  formasDeAzucar: string[];
}

/**
 * Separa la lista de ingredientes de una etiqueta.
 *
 * Quita el encabezado ("Ingredientes:"), corta por comas y descarta lo que
 * quede entre paréntesis como elemento suelto (los subingredientes se quedan
 * pegados a su padre, que es como los lee una persona).
 */
export function separarIngredientes(texto: string): string[] {
  if (!texto || !texto.trim()) return [];
  const sinEncabezado = texto.replace(/^\s*ingredientes?\s*:?\s*/i, '');
  const partes: string[] = [];
  let nivel = 0;
  let actual = '';
  for (const ch of sinEncabezado) {
    if (ch === '(' || ch === '[') nivel += 1;
    if (ch === ')' || ch === ']') nivel = Math.max(0, nivel - 1);
    if ((ch === ',' || ch === ';') && nivel === 0) {
      if (actual.trim()) partes.push(actual.trim());
      actual = '';
      continue;
    }
    actual += ch;
  }
  if (actual.trim()) partes.push(actual.trim().replace(/\.\s*$/, ''));
  return partes.filter((p) => p.length > 0);
}

/** Lee la lista de ingredientes y marca lo que no existe en una cocina. */
export function leerIngredientes(texto: string): LecturaIngredientes {
  const ingredientes = separarIngredientes(texto);
  const plano = normalizarTexto(ingredientes.join(', '));
  const marcadores: Marcador[] = [];
  const vistos = new Set<string>();

  for (const p of PATRONES) {
    const m = plano.match(p.regex);
    if (!m) continue;
    // Una categoría se reporta una sola vez: lo que importa es que el
    // producto usa esa clase de recurso, no cuántas variantes trae.
    //
    // 4EP: la llave incluía el texto encontrado, así que dos patrones de la
    // misma categoría (hay dos de grasa modificada) la duplicaban en la ficha.
    if (vistos.has(p.categoria)) continue;
    vistos.add(p.categoria);
    marcadores.push({ categoria: p.categoria, encontrado: m[0], paraQue: p.paraQue });
  }

  // Las formas de azúcar se cuentan POR INGREDIENTE, no por coincidencias
  // sobre el texto pegado.
  //
  // 4EP MEDIO-9: con la alternancia corriendo sobre todo el texto, "jarabe de
  // maíz de alta fructosa" daba DOS coincidencias ("jarabe de maiz" y "alta
  // fructosa"). Un refresco con ese único endulzante salía con dos formas y la
  // pantalla afirmaba que estaban repartiendo el azúcar a propósito. Acusar de
  // intención deliberada con un artefacto del regex es exactamente lo que este
  // módulo no puede hacer.
  const AZUCARES = /\b(jarabe\s+de\s+ma[ií]z\s+de\s+alta\s+fructosa|jarabe\s+de\s+ma[ií]z|jarabe\s+de\s+glucosa|jarabe\s+de\s+agave|azucar\s+invertid[oa]|alta\s+fructosa|maltodextrina|dextrosa|sacarosa|fructosa|glucosa|melaza|azucar|miel|malta)\b/;
  const formasDeAzucar: string[] = [];
  for (const ing of ingredientes) {
    const m = normalizarTexto(ing).match(AZUCARES);
    // Un ingrediente aporta UNA forma de azúcar: la primera que empate, que
    // por el orden de la alternancia es siempre la más específica.
    if (m && !formasDeAzucar.includes(m[0])) formasDeAzucar.push(m[0]);
  }

  return { ingredientes, marcadores, cuantos: ingredientes.length, formasDeAzucar };
}
