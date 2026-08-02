/**
 * Censo de nav propia (19.1 · 1.1) — la única forma de que el bug no vuelva.
 *
 * El bug: 30 pantallas se dibujaron su propia flecha de regreso a mano y nunca
 * registraron nav propia, así que la casita flotante global se pintaba encima
 * de sus headers (la foto del device test: la casita sobre la R de "Ranking").
 *
 * La regla que este test hace ley: toda pantalla de `app/` que dibuje una
 * flecha de regreso (`arrow-back` / `chevron-back`) tiene que pasar por un
 * componente que registre nav propia (ScreenHeader / PillarHeader /
 * StickyPillarBanner / GlobalTopBar / BackButton) o llamar
 * useRegisterOwnNav() ella misma.
 *
 * Y la segunda regla (1.2): hay UNA casita. Ningún archivo fuera de
 * HomeIcon.tsx dibuja `home` / `home-outline` — cinco casitas en tres colores
 * es exactamente lo que se retiró.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..', '..');
const APP_DIR = join(ROOT, 'app');
const SRC_DIR = join(ROOT, 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) walk(abs, out);
    else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(abs);
  }
  return out;
}

const rel = (abs: string) => relative(ROOT, abs).split('\\').join('/');

/** Una flecha de regreso dibujada en el archivo (como string de icono). */
const ARROW_RE = /['"](?:arrow-back|chevron-back)['"]/;

/** Formas de registrar nav propia que este censo acredita. */
const REGISTERED_RE =
  /useRegisterOwnNav|ScreenHeader|PillarHeader|StickyPillarBanner|GlobalTopBar|BackButton/;

describe('censo de nav propia (app/)', () => {
  it('toda pantalla con flecha de regreso registra nav propia', () => {
    const offenders = walk(APP_DIR)
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        return ARROW_RE.test(src) && !REGISTERED_RE.test(src);
      })
      .map(rel);
    expect(
      offenders,
      `Pantallas con flecha a mano y SIN registro de nav propia (la casita ` +
      `flotante les va a tapar el header). Usa <BackButton>/ScreenHeader o ` +
      `llama useRegisterOwnNav() — ver useOwnNavPresence.ts:\n  ` +
      offenders.join('\n  ')
    ).toEqual([]);
  });

  it('hay UNA casita: ningún Ionicons home/home-outline fuera de HomeIcon.tsx', () => {
    const offenders = [...walk(APP_DIR), ...walk(SRC_DIR)]
      .filter((f) => !f.endsWith('HomeIcon.tsx'))
      .filter((f) => /name\s*=\s*['"]home(?:-outline)?['"]/.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(
      offenders,
      `La casita se dibuja SOLO con <HomeIcon> (glifo y color únicos):\n  ` +
      offenders.join('\n  ')
    ).toEqual([]);
  });
});
