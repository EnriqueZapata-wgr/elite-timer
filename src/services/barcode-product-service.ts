/**
 * barcode-product-service — lookup de productos por código de barras (MB-28B P1).
 *
 * Base: OpenFoodFacts (libre, sin costo). La cobertura de productos mexicanos
 * es parcial (probado 2026-08-08: pegan las marcas grandes; lo demás cae a
 * captura manual) — por eso el contrato es de TRES salidas y el caller está
 * obligado a manejar las tres: found / not_found / network_error. Nunca lanza.
 *
 * Doctrina ATP: el mapeo NO copia nutriscore, nova ni ecoscore aunque el
 * payload los traiga. La app no juzga comida con semáforos ajenos; el valor
 * está en la lista de ingredientes. Hay un test que cementa esta exclusión.
 */
import { warn as logWarn } from '@/src/lib/logger';

export interface BarcodePer100g {
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
}

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  /** La lista de ingredientes tal cual la declara el empaque (es > default). */
  ingredientsText: string | null;
  /** Texto de porción del empaque ("30 g", "600 ml") si existe. */
  servingSize: string | null;
  /** Gramos de la porción si el texto se pudo parsear (ml se toma como g). */
  servingGrams: number | null;
  per100g: BarcodePer100g;
}

export type BarcodeLookup =
  | { status: 'found'; product: BarcodeProduct }
  | { status: 'not_found'; barcode: string }
  | { status: 'network_error'; barcode: string };

/** Solo dígitos, largo EAN-8 a GTIN-14. Devuelve null si no parece código. */
export function normalizeBarcode(raw: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** "30 g" / "600ml" / "2 x 25 g" → gramos best-effort (ml cuenta como g). */
export function parseServingGrams(servingSize: string | null | undefined): number | null {
  if (!servingSize) return null;
  const m = /(\d+(?:[.,]\d+)?)\s*(g|gr|ml)\b/i.exec(servingSize);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Escala lineal de los valores por 100 g a la porción elegida. */
export function scalePer100g(per100g: BarcodePer100g, grams: number): {
  kcal: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; fiberG: number | null;
} {
  const factor = grams / 100;
  const scale = (v: number | null, decimals: number) =>
    v === null ? null : Math.round(v * factor * 10 ** decimals) / 10 ** decimals;
  return {
    kcal: scale(per100g.kcal, 0),
    proteinG: scale(per100g.proteinG, 1),
    carbsG: scale(per100g.carbsG, 1),
    fatG: scale(per100g.fatG, 1),
    fiberG: scale(per100g.fiberG, 1),
  };
}

/**
 * Payload crudo de OFF → producto de ATP. Pura y exportada para tests.
 * Aquí es donde se DECIDE qué entra: ingredientes sí, juicios no.
 */
export function mapOffProduct(barcode: string, raw: any): BarcodeProduct {
  const p = raw ?? {};
  const nutr = p.nutriments ?? {};
  const name = String(p.product_name_es || p.product_name || '').trim() || 'Producto sin nombre';
  const servingSize = typeof p.serving_size === 'string' && p.serving_size.trim() ? p.serving_size.trim() : null;
  return {
    barcode,
    name,
    brand: typeof p.brands === 'string' && p.brands.trim() ? p.brands.split(',')[0].trim() : null,
    imageUrl: typeof p.image_front_small_url === 'string' ? p.image_front_small_url
      : typeof p.image_url === 'string' ? p.image_url : null,
    ingredientsText: String(p.ingredients_text_es || p.ingredients_text || '').trim() || null,
    servingSize,
    servingGrams: parseServingGrams(servingSize),
    per100g: {
      kcal: num(nutr['energy-kcal_100g']),
      proteinG: num(nutr.proteins_100g),
      carbsG: num(nutr.carbohydrates_100g),
      fatG: num(nutr.fat_100g),
      fiberG: num(nutr.fiber_100g),
    },
  };
}

const OFF_FIELDS = [
  'code', 'product_name', 'product_name_es', 'brands',
  'image_front_small_url', 'image_url',
  'ingredients_text_es', 'ingredients_text',
  'serving_size', 'nutriments',
].join(',');

/** Identificarse es requisito de la API libre de OFF. */
const OFF_USER_AGENT = 'ATP - React Native - Version 1.2 - https://somosatp.com';

export interface LookupDeps {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Busca el código en OpenFoodFacts. NUNCA lanza: sin red o con timeout
 * devuelve network_error y el caller ofrece reintentar o capturar a mano.
 */
export async function lookupBarcode(barcode: string, deps: LookupDeps = {}): Promise<BarcodeLookup> {
  const doFetch = deps.fetchFn ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 10000;
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await doFetch(url, {
      headers: { 'User-Agent': OFF_USER_AGENT },
      signal: controller?.signal,
    } as RequestInit);
    // OFF responde 404 con body JSON {status: 0} para código inexistente;
    // cualquier otro no-OK (5xx, rate limit) es problema del servicio, no
    // del producto: se reporta como red para no mentir "no existe".
    if (!res.ok && res.status !== 404) {
      logWarn('[barcode] OFF respondió', res.status);
      return { status: 'network_error', barcode };
    }
    const json = await res.json();
    if (!json || json.status === 0 || !json.product) {
      return { status: 'not_found', barcode };
    }
    return { status: 'found', product: mapOffProduct(barcode, json.product) };
  } catch (e: any) {
    logWarn('[barcode] lookup falló:', e?.message);
    return { status: 'network_error', barcode };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
