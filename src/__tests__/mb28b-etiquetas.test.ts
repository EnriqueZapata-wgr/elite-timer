/**
 * MB-28B P4 — los candados propios del run (estilo censo: leen fuente).
 *
 *  1. Código no encontrado o sin red → captura manual. Las DOS ramas de
 *     fallo renderizan el formulario manual: nunca pantalla muerta.
 *  2. El código escaneado queda guardado con el registro manual (por si la
 *     persona quiere completarlo después).
 *  3. Doctrina: la pantalla del escáner no dibuja juicios morales — sin
 *     nutriscore/nova/ecoscore, sin anillos de score, sin semáforos.
 *  4. shopping_list_items tiene UNA puerta de escritura (el servicio),
 *     mismo patrón que el candado de food_logs.
 *
 * El contrato general de pantallas de registro (modo simple/completo, hora
 * compartida, ruta única a food_logs) vive en registro-comida.test.ts, que
 * ya incluye a food-barcode como cuarta pantalla.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';

const read = (f: string) => readFileSync(f, 'utf8');
const BARCODE_SCREEN = read('app/food-barcode.tsx');

describe('escáner: caída con gracia a captura manual', () => {
  it('las dos ramas de fallo existen y ninguna es callejón sin salida', () => {
    expect(BARCODE_SCREEN).toContain("'not_found'");
    expect(BARCODE_SCREEN).toContain("'network_error'");
    // El formulario manual se renderiza en AMBAS ramas de fallo.
    const manualRenders = BARCODE_SCREEN.split('{manualForm}').length - 1;
    expect(manualRenders, 'una rama de fallo se quedó sin captura manual').toBeGreaterThanOrEqual(2);
  });

  it('sin red además ofrece reintentar (fallo honesto, no terminal)', () => {
    expect(BARCODE_SCREEN).toContain('Reintentar');
  });

  it('el código queda guardado con el registro manual', () => {
    expect(BARCODE_SCREEN).toContain("lookup: 'not_found'");
    expect(BARCODE_SCREEN).toMatch(/aiAnalysis:.*barcode/s);
  });

  it('todo entra etiquetado como barcode por el writer único', () => {
    expect(BARCODE_SCREEN).toContain("source: 'barcode'");
    expect(BARCODE_SCREEN).toContain("from '@/src/services/food-log-service'");
  });
});

describe('escáner: sin juicio moral sobre la comida', () => {
  it('la pantalla no dibuja puntuaciones ni semáforos', () => {
    expect(BARCODE_SCREEN).not.toMatch(/nutriscore|nova_group|ecoscore/i);
    expect(BARCODE_SCREEN).not.toMatch(/score/i);
    expect(BARCODE_SCREEN).not.toContain('ScoreRing');
    expect(BARCODE_SCREEN).not.toContain('getTagColor');
  });

  it('la lista de ingredientes es el contenido central', () => {
    expect(BARCODE_SCREEN).toContain('ingredientsText');
  });
});

// ─── shopping_list_items: una sola puerta de escritura ──────────────────────

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '__tests__') continue;
      walk(p, out);
    } else if (/\.tsx?$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

describe('shopping_list_items — ruta única de escritura', () => {
  const WRITER = 'src/services/shopping-list-service.ts';

  it('solo shopping-list-service muta la tabla', () => {
    const files = [...walk('app'), ...walk('src')].map((f) => f.split(sep).join('/'));
    const violaciones: string[] = [];
    for (const f of files) {
      if (f === WRITER) continue;
      const src = read(f);
      let idx = src.indexOf("from('shopping_list_items')");
      while (idx !== -1) {
        const ventana = src.slice(idx, idx + 220);
        if (/\.(insert|upsert|update|delete)\s*\(/.test(ventana)) {
          violaciones.push(`${f} muta shopping_list_items directo — usa shopping-list-service`);
        }
        idx = src.indexOf("from('shopping_list_items')", idx + 1);
      }
    }
    expect(violaciones).toEqual([]);
  });

  it('el writer verifica sus mutaciones destructivas (0 filas != éxito)', () => {
    const src = read(WRITER);
    expect(src).toContain('Row not found or RLS blocked');
  });
});
