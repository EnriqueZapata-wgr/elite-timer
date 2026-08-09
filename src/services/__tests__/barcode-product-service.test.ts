/**
 * MB-28B P4 — barcode-product-service.
 *
 * Lo que se cementa:
 *  - El contrato de TRES salidas: found / not_found / network_error. Sin red
 *    el servicio falla honesto (network_error), NUNCA lanza — la pantalla
 *    nunca cuelga (punto 5 del brief).
 *  - Un 5xx del servicio NO se reporta como "producto no existe": mentir
 *    not_found mandaría a la persona a capturar a mano un producto que sí
 *    está en la base.
 *  - Doctrina ATP: el mapeo EXCLUYE nutriscore/nova/ecoscore aunque el
 *    payload los traiga. Sin semáforos ni puntuaciones de "qué tan sano".
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/logger', () => ({ log: () => {}, warn: () => {}, error: () => {} }));

import {
  normalizeBarcode, parseServingGrams, scalePer100g, mapOffProduct, lookupBarcode,
} from '@/src/services/barcode-product-service';

describe('normalizeBarcode', () => {
  it('limpia espacios y guiones; acepta EAN-8 a GTIN-14', () => {
    expect(normalizeBarcode('750-1055 300075')).toBe('7501055300075');
    expect(normalizeBarcode('12345678')).toBe('12345678');
  });

  it('rechaza lo que no parece código', () => {
    expect(normalizeBarcode('1234567')).toBeNull();       // 7 dígitos
    expect(normalizeBarcode('123456789012345')).toBeNull(); // 15 dígitos
    expect(normalizeBarcode('sin numeros')).toBeNull();
    expect(normalizeBarcode('')).toBeNull();
  });
});

describe('parseServingGrams', () => {
  it('parsea g y ml (ml cuenta como g)', () => {
    expect(parseServingGrams('30 g')).toBe(30);
    expect(parseServingGrams('600ml')).toBe(600);
    expect(parseServingGrams('2 x 25 g')).toBe(25);
  });

  it('sin unidad parseable devuelve null', () => {
    expect(parseServingGrams('1 porción')).toBeNull();
    expect(parseServingGrams(null)).toBeNull();
    expect(parseServingGrams('')).toBeNull();
  });
});

describe('scalePer100g', () => {
  const per100g = { kcal: 30, proteinG: 0.5, carbsG: 7.5, fatG: 0, fiberG: null };

  it('escala lineal a la porción, con redondeo', () => {
    const r = scalePer100g(per100g, 355);
    expect(r.kcal).toBe(107);       // 30 * 3.55 = 106.5 → 107
    expect(r.proteinG).toBe(1.8);   // 0.5 * 3.55 = 1.775 → 1.8
    expect(r.carbsG).toBe(26.6);
    expect(r.fatG).toBe(0);
  });

  it('null se queda null (dato ausente no se inventa)', () => {
    expect(scalePer100g(per100g, 100).fiberG).toBeNull();
  });
});

// Payload real de OFF (recortado), con los campos de juicio incluidos a
// propósito para verificar que se EXCLUYEN.
const OFF_PRODUCT = {
  product_name: 'Coca-Cola',
  product_name_es: 'Coca-Cola Original',
  brands: 'Coca-Cola, The Coca-Cola Company',
  image_front_small_url: 'https://images.openfoodfacts.org/x/front_small.jpg',
  ingredients_text: 'Carbonated water, sugar',
  ingredients_text_es: 'Agua carbonatada, azúcares',
  serving_size: '355 ml',
  nutriments: {
    'energy-kcal_100g': 30, proteins_100g: 0, carbohydrates_100g: 7.5,
    fat_100g: 0, fiber_100g: 0,
  },
  nutriscore_grade: 'e',
  nova_group: 4,
  ecoscore_grade: 'd',
};

describe('mapOffProduct', () => {
  it('prefiere los campos en español y la primera marca', () => {
    const p = mapOffProduct('7501055300075', OFF_PRODUCT);
    expect(p.name).toBe('Coca-Cola Original');
    expect(p.ingredientsText).toBe('Agua carbonatada, azúcares');
    expect(p.brand).toBe('Coca-Cola');
    expect(p.servingGrams).toBe(355);
    expect(p.per100g.kcal).toBe(30);
  });

  it('payload vacío no truena: nulls honestos', () => {
    const p = mapOffProduct('123', {});
    expect(p.name).toBe('Producto sin nombre');
    expect(p.ingredientsText).toBeNull();
    expect(p.per100g).toEqual({ kcal: null, proteinG: null, carbsG: null, fatG: null, fiberG: null });
  });

  it('DOCTRINA: nutriscore, nova y ecoscore NO pasan al producto de ATP', () => {
    const p = mapOffProduct('7501055300075', OFF_PRODUCT);
    const serialized = JSON.stringify(p).toLowerCase();
    expect(serialized).not.toContain('nutriscore');
    expect(serialized).not.toContain('nova');
    expect(serialized).not.toContain('ecoscore');
  });
});

// ─── lookupBarcode: el contrato de tres salidas ─────────────────────────────

function fakeFetch(response: { ok: boolean; status: number; body?: unknown }) {
  return vi.fn(async () => ({
    ok: response.ok,
    status: response.status,
    json: async () => response.body,
  })) as unknown as typeof fetch;
}

describe('lookupBarcode', () => {
  it('producto en la base → found, mapeado', async () => {
    const fetchFn = fakeFetch({ ok: true, status: 200, body: { status: 1, product: OFF_PRODUCT } });
    const r = await lookupBarcode('7501055300075', { fetchFn });
    expect(r.status).toBe('found');
    if (r.status === 'found') expect(r.product.name).toBe('Coca-Cola Original');
  });

  it('código que no existe (404 con status 0) → not_found con el código', async () => {
    const fetchFn = fakeFetch({ ok: false, status: 404, body: { status: 0, status_verbose: 'product not found' } });
    const r = await lookupBarcode('7501011101012', { fetchFn });
    expect(r).toEqual({ status: 'not_found', barcode: '7501011101012' });
  });

  it('un 5xx del servicio NO es "no existe": es network_error', async () => {
    const fetchFn = fakeFetch({ ok: false, status: 503 });
    const r = await lookupBarcode('7501055300075', { fetchFn });
    expect(r.status).toBe('network_error');
  });

  it('sin red (fetch rechaza) → network_error, sin lanzar', async () => {
    const fetchFn = vi.fn(async () => { throw new Error('Network request failed'); }) as unknown as typeof fetch;
    const r = await lookupBarcode('7501055300075', { fetchFn });
    expect(r).toEqual({ status: 'network_error', barcode: '7501055300075' });
  });

  it('respuesta OK pero sin producto → not_found', async () => {
    const fetchFn = fakeFetch({ ok: true, status: 200, body: { status: 0 } });
    const r = await lookupBarcode('999', { fetchFn });
    expect(r.status).toBe('not_found');
  });
});
