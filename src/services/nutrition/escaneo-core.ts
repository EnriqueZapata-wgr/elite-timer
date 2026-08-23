/**
 * ESCANEO DE ETIQUETA — las piezas puras.
 *
 * POR QUÉ VIVEN APARTE
 * `escanear-etiqueta.ts` importa el cliente del modelo, y eso arrastra
 * react-native. Un test que importe ese archivo truena al parsear ("Expected
 * 'from', got 'typeOf'"): es el mismo tropiezo que ya nos costó tiempo en la
 * suite de paquetes. Estas tres funciones son aritmética y texto, sin una sola
 * dependencia nativa, así que se prueban aquí sin arrastrar nada. Misma
 * decisión que en cycle-phase-core.
 */

/**
 * Convierte a número lo que venga, aguantando cómo se imprimen los números en
 * una etiqueta mexicana.
 *
 * 4EP MEDIO-1: esto hacía `v.replace(',', '.')`, que reemplaza SOLO la primera
 * coincidencia. Un sodio impreso como "1,150" se volvía "1.150" y de ahí 1.15
 * mg: el producto perdía sus dos criterios de sodio a la vez, en silencio, y
 * justo en el nutrimento donde más caro sale equivocarse.
 */
export function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim().replace(/\s|kcal|kj|mg|g\b/gi, '');
  // Separador de miles: una coma o un punto seguidos de EXACTAMENTE tres
  // dígitos y nada más detrás. "1,150" son mil ciento cincuenta; "1,15" es
  // uno coma quince.
  s = s.replace(/[.,](\d{3})\b(?![\d])/g, '$1');
  // Lo que quede como coma es separador decimal.
  s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Una porción declarada tiene que ser plausible. Fuera de estas cotas, el dato
 * está mal leído y reescalar con él multiplica el error por cien mil.
 */
export const PORCION_MIN_G = 1;
export const PORCION_MAX_G = 1000;

/**
 * Compara lo que calculamos contra lo que el empaque trae impreso.
 *
 * Solo se pronuncia cuando el modelo SÍ reportó haber visto sellos (una lista
 * vacía puede significar "no hay" o "no se alcanzó a ver el frente", y no se
 * puede distinguir). Normaliza acentos porque un sello impreso se transcribe
 * indistintamente como "EXCESO CALORÍAS" o "EXCESO CALORIAS".
 */
export function compararConElEmpaque(
  calculados: string[],
  impresos: string[],
): { soloCalculados: string[]; soloImpresos: string[] } | null {
  if (impresos.length === 0) return null;
  const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const setImpresos = new Set(impresos.map(norm));
  const setCalculados = new Set(calculados.map(norm));
  const soloCalculados = calculados.filter((x) => !setImpresos.has(norm(x)));
  const soloImpresos = impresos.filter((x) => !setCalculados.has(norm(x)));
  if (soloCalculados.length === 0 && soloImpresos.length === 0) return null;
  return { soloCalculados, soloImpresos };
}

/**
 * Saca el objeto JSON balanceado de un texto.
 *
 * 4EP: tomaba el PRIMER `{`. Si el modelo escribe prosa con una llave antes
 * ("el JSON {así}"), extraía eso, el parseo fallaba y el usuario recibía el
 * mensaje genérico. Se prefiere el ÚLTIMO bloque balanceado, que es donde
 * queda la respuesta cuando el modelo se pone a explicar antes.
 */
export function extraerJson(s: string): string | null {
  let ultimo: string | null = null;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '{') continue;
    let nivel = 0; let enCadena = false; let escape = false;
    for (let j = i; j < s.length; j++) {
      const c = s[j];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { enCadena = !enCadena; continue; }
      if (enCadena) continue;
      if (c === '{') nivel += 1;
      if (c === '}') {
        nivel -= 1;
        if (nivel === 0) {
          const trozo = s.slice(i, j + 1);
          // Solo cuenta si de verdad es un objeto: así una llave suelta en la
          // prosa no gana sobre la respuesta buena.
          try { JSON.parse(trozo); ultimo = trozo; } catch { /* no era */ }
          i = j;
          break;
        }
      }
    }
  }
  return ultimo;
}


/**
 * EL RESUMEN DE UNA ETIQUETA.
 *
 * El dueño pidió, verbatim, "ver scores de cada una de las etiquetas". Esto es
 * lo más cerca que se puede estar de eso sin cruzar la línea que esta app no
 * cruza: un número del 0 al 100 sería un veredicto, y para dar un veredicto
 * habría que decidir cuánto vale un sello contra otro, cosa que ni la norma
 * hace. Inventar esa ponderación y presentarla como dato sería exactamente el
 * tipo de número sin respaldo que aquí está prohibido.
 *
 * Lo que sí se puede contar sin inventar nada: cuántos sellos le tocan (de
 * cinco posibles) y cuántas clases de recurso de fábrica trae su lista (de
 * seis posibles). Los dos son conteos verificables mirando el mismo empaque, y
 * los dos se leen de un vistazo, que es para lo que sirve un score.
 */
export interface ResumenEtiqueta {
  sellos: number;
  /** Clases distintas de ingrediente de fábrica en la lista. */
  marcasDeFabrica: number;
  /** Cuántos de los cinco criterios NO se pudieron evaluar. */
  sinEvaluar: number;
  frase: string;
}

export function resumirEtiqueta(
  sellos: number,
  marcasDeFabrica: number,
  sinEvaluar: number,
): ResumenEtiqueta {
  const partes: string[] = [];
  partes.push(sellos === 0 ? 'Sin sellos' : sellos === 1 ? '1 sello' : `${sellos} sellos`);
  if (marcasDeFabrica > 0) {
    partes.push(marcasDeFabrica === 1
      ? '1 tipo de ingrediente de fábrica'
      : `${marcasDeFabrica} tipos de ingrediente de fábrica`);
  } else {
    partes.push('nada de fábrica en su lista');
  }
  if (sinEvaluar > 0) {
    partes.push(sinEvaluar === 1 ? '1 criterio sin poder evaluar' : `${sinEvaluar} criterios sin poder evaluar`);
  }
  return { sellos, marcasDeFabrica, sinEvaluar, frase: partes.join(' · ') };
}
