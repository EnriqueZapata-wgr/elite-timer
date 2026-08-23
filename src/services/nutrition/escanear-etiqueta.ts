/**
 * ESCANEAR UNA ETIQUETA — el modelo transcribe, nuestro código decide.
 *
 * REPARTO DE TRABAJO, a propósito:
 *  · El modelo hace OCR y nada más: copia la tabla nutrimental y la lista de
 *    ingredientes tal como están impresas. No opina, no clasifica, no
 *    recomienda. Se le pide explícitamente que deje en null lo que no alcance
 *    a leer, porque un dato inventado aquí se convierte en un sello falso.
 *  · El juicio lo hace `sellos-nom051.ts` y `etiqueta-ingredientes.ts`, en
 *    código puro y probado, con la regla escrita.
 *
 * Así el resultado es el mismo siempre, se puede explicar renglón por renglón
 * y no cambia porque el proveedor haya cambiado de modelo.
 */
import { callAnthropic, extractResponseText } from '@/src/services/anthropic-client';
import { getArgosCallMetadata } from '@/src/services/argos-service';
import { ATP_LLM } from '@/src/constants/llm-config';
import { warn as logWarn } from '@/src/lib/logger';
import { calcularSellos, type LecturaSellos, type TablaNutrimental, type TipoProducto } from './sellos-nom051';
import { leerIngredientes, type LecturaIngredientes } from './etiqueta-ingredientes';
import { num, extraerJson, compararConElEmpaque, PORCION_MIN_G, PORCION_MAX_G } from './escaneo-core';

const PROMPT = `Eres un transcriptor de etiquetas de alimentos. NO opines, NO clasifiques, NO recomiendes. Copia lo que la etiqueta dice.

Devuelve SOLO JSON válido, sin backticks, con este shape exacto:
{
  "producto": "nombre del producto tal como aparece, o null",
  "tipo": "solido" | "liquido",
  "base": "100g" | "100ml" | "porcion",
  "porcion_g": número o null,
  "kcal": número o null,
  "azucares_libres_g": número o null,
  "grasas_saturadas_g": número o null,
  "grasas_trans_g": número o null,
  "sodio_mg": número o null,
  "cafeina_anadida": true | false,
  "edulcorantes": true | false,
  "ingredientes": "la lista COMPLETA tal como está impresa, separada por comas, o null",
  "sellos_impresos": ["EXCESO CALORIAS", ...] (los octágonos que se VEN en el empaque, o [])
}

REGLAS:
1. Si un dato NO se alcanza a leer, va null. NUNCA lo estimes ni lo deduzcas. Un número inventado aquí se convierte en una advertencia falsa.
2. "base" dice a qué se refieren los números que copiaste: si la tabla es por 100 g pon "100g", si es por 100 mL pon "100ml", si SOLO viene por porción pon "porcion" y llena porcion_g.
3. azucares_libres_g son los azúcares AÑADIDOS (y los de jarabes, mieles y jugos). Si la etiqueta solo dice "Azúcares" sin distinguir, usa ese número.
4. "tipo" es liquido para bebidas, solido para todo lo demás.
5. La lista de ingredientes se copia COMPLETA y textual, con sus paréntesis. Es la parte más importante.`;

export interface EscaneoEtiqueta {
  producto: string | null;
  tipo: TipoProducto;
  tabla: TablaNutrimental;
  lectura: LecturaSellos;
  ingredientes: LecturaIngredientes;
  /** Los octágonos que el modelo VIO impresos en el empaque. */
  sellosImpresos: string[];
  /**
   * El empaque trae sellos impresos que nuestro cálculo NO produjo, o al revés.
   *
   * 4EP MEDIO-11 y MEDIO-15: es el testigo barato de casi todo lo que puede
   * salir mal aquí. Si el modelo leyó mal un número, si la tabla venía por
   * porción y dijo que no, o si el criterio depende de que el nutrimento sea
   * AÑADIDO (cosa que la norma condiciona y nuestro cálculo todavía no
   * modela), la diferencia sale aquí. Cuando no coinciden, la pantalla lo dice
   * y le cree al empaque, que es el dato duro.
   */
  discrepancia: { soloCalculados: string[]; soloImpresos: string[] } | null;
  /**
   * La tabla venía solo por porción y se reescaló a 100 g o 100 mL, que es la
   * base sobre la que la norma decide. Se avisa porque el reescalado depende
   * del tamaño de porción declarado, y ese número a veces está redondeado.
   */
  reescalado: boolean;
}

export type EscaneoError = { error: string };

/**
 * Lee una foto de etiqueta y devuelve los sellos que le corresponden más la
 * lectura de su lista de ingredientes.
 */
export async function escanearEtiqueta(
  fotoBase64: string,
  userId: string,
): Promise<EscaneoEtiqueta | EscaneoError> {
  try {
    const meta = await getArgosCallMetadata({ callerUserId: userId, requestType: 'etiqueta_super' });
    const respuesta = await callAnthropic([{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fotoBase64 } },
        { type: 'text', text: PROMPT },
      ],
    }], ATP_LLM.MAX_TOKENS_DEFAULT, ATP_LLM.PRIMARY_MODEL, undefined, meta);

    const texto = extractResponseText(respuesta) ?? '';
    const json = extraerJson(texto.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
    if (!json) return { error: 'No pudimos leer la etiqueta. Intenta con la foto más cerca y sin reflejos.' };

    let d: any;
    try { d = JSON.parse(json); } catch { return { error: 'No pudimos leer la etiqueta. Intenta de nuevo.' }; }

    // 4EP MEDIO-11: el tipo caía a 'solido' con cualquier valor raro, y eso
    // cambia el umbral de calorías de 70 a 275. Un refresco mal tipificado
    // perdía su sello. Si no viene uno de los dos valores, se dice.
    if (d.tipo !== 'liquido' && d.tipo !== 'solido') {
      return { error: 'No pudimos saber si es un sólido o una bebida. Vuelve a tomar la foto incluyendo el frente del empaque.' };
    }
    const tipo: TipoProducto = d.tipo;

    // Si la tabla venía por porción, se lleva a 100 g o 100 mL, que es la base
    // sobre la que la norma decide. Sin el peso de la porción no se puede, y
    // entonces se dice en vez de adivinar.
    const porcion = num(d.porcion_g);
    const base = typeof d.base === 'string' ? d.base.replace(/\s/g, '').toLowerCase() : '';
    // Cualquier base que no sea una de las tres esperadas se trata como
    // porción si hay peso, y si no, se rechaza. Antes, un "100 g" con espacio
    // o un valor inesperado caían al camino de "no reescalar" sin una sola
    // señal: 120 kcal de una porción de 30 g se leían como 120 por 100 g y el
    // sello de calorías desaparecía (4EP MEDIO-11).
    const basePor100 = base === '100g' || base === '100ml';
    const necesitaEscala = !basePor100;
    if (necesitaEscala && porcion == null) {
      return { error: 'La etiqueta trae los datos por porción y no pudimos leer cuánto pesa la porción. Toma la foto incluyendo esa línea.' };
    }
    if (necesitaEscala && porcion != null && (porcion < PORCION_MIN_G || porcion > PORCION_MAX_G)) {
      return { error: 'El tamaño de porción que leímos no cuadra. Vuelve a tomar la foto de la tabla nutrimental completa.' };
    }
    const factor = necesitaEscala && porcion ? 100 / porcion : 1;
    const esc = (v: number | null): number | null => (v == null ? null : v * factor);

    const kcal = esc(num(d.kcal));
    if (kcal == null) {
      return { error: 'No pudimos leer las calorías de la tabla. Sin ese dato no se puede calcular nada.' };
    }

    const tabla: TablaNutrimental = {
      tipo,
      kcal,
      azucaresLibresG: esc(num(d.azucares_libres_g)),
      grasasSaturadasG: esc(num(d.grasas_saturadas_g)),
      grasasTransG: esc(num(d.grasas_trans_g)),
      sodioMg: esc(num(d.sodio_mg)),
      cafeinaAnadida: d.cafeina_anadida === true,
      edulcorantes: d.edulcorantes === true,
    };

    const lectura = calcularSellos(tabla);
    const sellosImpresos = Array.isArray(d.sellos_impresos)
      ? d.sellos_impresos.filter((x: unknown): x is string => typeof x === 'string')
      : [];

    return {
      producto: typeof d.producto === 'string' && d.producto.trim() ? d.producto.trim() : null,
      tipo,
      tabla,
      lectura,
      ingredientes: leerIngredientes(typeof d.ingredientes === 'string' ? d.ingredientes : ''),
      sellosImpresos,
      discrepancia: compararConElEmpaque(lectura.sellos.map((x) => x.etiqueta), sellosImpresos),
      reescalado: necesitaEscala,
    };
  } catch (e: any) {
    logWarn('[super] escanearEtiqueta falló:', e);
    return { error: 'No pudimos leer la etiqueta. Revisa tu conexión e intenta de nuevo.' };
  }
}
