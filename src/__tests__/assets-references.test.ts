/**
 * NOCTURNO A5 — censo de assets.
 *
 * tsc no valida rutas de require() de assets (no son módulos TS): un rename o
 * un typo solo truena en runtime, en el peor momento. Este test cierra esa
 * puerta en las dos direcciones:
 *   1. Toda referencia `require('...assets/...')` del código resuelve a un
 *      archivo que existe en disco.
 *   2. Toda imagen en SUBCARPETAS de assets/images está referenciada desde el
 *      código (la raíz queda fuera: son marca y los PNG que app.json exige).
 *
 * Nació del recableado masivo a WebP: 129 imágenes cambiaron de extensión y
 * esta es la red que garantiza que ningún require quedó apuntando al pasado.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

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

const CODE_FILES = [...walk('app'), ...walk('src'), ...walk('components')].map((f) =>
  f.split(sep).join('/'),
);

/** require('...assets/...') con literal — Metro no soporta dinámico. */
const REQUIRE_RE = /require\(\s*['"]([^'"]*assets\/[^'"]+)['"]\s*\)/g;

interface Ref {
  file: string;
  raw: string;
  /** Ruta raíz-relativa normalizada (p.ej. assets/images/agenda/x.webp). */
  resolved: string | null;
}

const REFS: Ref[] = [];
for (const f of CODE_FILES) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(REQUIRE_RE)) {
    const raw = m[1];
    let resolved: string | null = null;
    if (raw.startsWith('@/')) {
      resolved = raw.slice(2);
    } else if (raw.startsWith('.')) {
      resolved = resolve(dirname(f), raw).split(sep).join('/');
      const root = resolve('.').split(sep).join('/') + '/';
      resolved = resolved.startsWith(root) ? resolved.slice(root.length) : null;
    }
    REFS.push({ file: f, raw, resolved });
  }
}

describe('censo de assets', () => {
  it('encontró referencias (guard del regex)', () => {
    expect(REFS.length).toBeGreaterThanOrEqual(150);
  });

  it('toda referencia a assets resuelve a un archivo que existe', () => {
    const rotas = REFS.filter((r) => r.resolved === null || !existsSync(r.resolved)).map(
      (r) => `${r.file} → ${r.raw}`,
    );
    expect(rotas, 'require() de asset apuntando a un archivo que no existe').toEqual([]);
  });

  it('ninguna imagen de subcarpeta de assets/images queda huérfana', () => {
    const referenced = new Set(REFS.map((r) => r.resolved).filter(Boolean));
    const huerfanas: string[] = [];
    for (const dir of readdirSync('assets/images', { withFileTypes: true })) {
      if (!dir.isDirectory()) continue; // la raíz no se censa: marca + app.json
      const imgs = walk2(join('assets/images', dir.name));
      for (const img of imgs) {
        if (!referenced.has(img)) huerfanas.push(img);
      }
    }
    expect(huerfanas, 'imagen sin ningún require() — o se cablea o se borra').toEqual([]);
  });
});

function walk2(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk2(p, out);
    else if (/\.(png|jpe?g|webp|gif)$/i.test(e.name)) out.push(p.split(sep).join('/'));
  }
  return out;
}
