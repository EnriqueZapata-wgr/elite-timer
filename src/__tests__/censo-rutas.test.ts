/**
 * El guardián necesitaba quien lo guardara.
 *
 * El audit de MB-19 encontró que el censo daba verde con el pilar Mente sin
 * puerta, y que cualquier archivo muerto le regalaba puertas a media app. Las
 * dos reglas que lo arreglan viven en `scripts/censo-rutas.js`, y aquí se fijan
 * con los mismos experimentos que usó el auditor, para que nadie las relaje sin
 * enterarse.
 *
 * Los casos NO son inventados: cada uno es una línea real del proyecto.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const censo = require_(resolve(here, '..', '..', 'scripts', 'censo-rutas.js'));

const { hasNavForm, navAliases, extractStrings, normalizeRoute } = censo;

/** Ayuda: ¿la última línea de este fragmento cuenta como navegación? */
function navega(codigo: string, aliases: string[] = []): boolean {
  const lines = codigo.split('\n');
  return hasNavForm(lines, lines.length, aliases);
}

describe('REGLA 1 · mencionar una ruta no es navegar a ella', () => {
  it('RECHAZA el predicado que escondía el botón flotante (el bug de MB-19)', () => {
    // src/components/argos/argos-floating-core.ts. Esta línea acreditaba
    // /mente como "con puerta" y dejó 495 líneas inalcanzables.
    expect(navega(`
export function isMentePillarPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase();
  return p.startsWith('/mente') || p === '/meditation' || p === '/breathing';
`)).toBe(false);
  });

  it('RECHAZA una traza', () => {
    expect(navega(`console.log('/admin/reports');`)).toBe(false);
  });

  it('RECHAZA un arreglo suelto de rutas', () => {
    expect(navega(`const rutas = ['/clinical-system', '/legal/aviso'];`)).toBe(false);
  });

  it('RECHAZA una lista de configuración que no navega', () => {
    // El propio RUTAS_DE_TAB de argos-floating-core: decide dónde ESCONDER algo.
    expect(navega(`const RUTAS_DE_TAB = new Set(['/', '/kit', '/salud', '/tribu', '/argos']);`)).toBe(false);
  });

  it('ACEPTA router.push, replace, navigate y dismissTo', () => {
    expect(navega(`router.push('/nutrition');`)).toBe(true);
    expect(navega(`router.replace('/login');`)).toBe(true);
    expect(navega(`router.navigate('/kit');`)).toBe(true);
    expect(navega(`router.dismissTo('/(tabs)');`)).toBe(true);
  });

  it('ACEPTA <Redirect> y <Link>', () => {
    expect(navega(`return <Redirect href="/login" />;`)).toBe(true);
    expect(navega(`<Link href="/salud">Salud</Link>`)).toBe(true);
  });

  it('ACEPTA el campo route: de los arreglos de configuración', () => {
    // Así declaran sus puertas app-registry, hoy-cards y salud-puertas.
    expect(navega(`{ key: 'comida', label: 'Comida', route: '/nutrition' },`)).toBe(true);
  });

  it('ACEPTA pathname: con valor, pero NO la firma que lleva ese nombre', () => {
    expect(navega(`router.push({ pathname: '/food-scan', params: { mode: 'label' } });`)).toBe(true);
    expect(navega(`function f(pathname: string | null) { return '/x'; }`)).toBe(false);
  });

  it('ACEPTA la función que fabrica la ruta (por ahí pasa el onboarding entero)', () => {
    // src/services/onboarding-v2-core.ts
    expect(navega(`
export function v2Route(step: V2Step): Href {
  return \`/onboarding/v2/\${step}\`;
`)).toBe(true);
  });

  it('ACEPTA la tabla tipada de destinos de captura', () => {
    // src/constants/data-capture-routes.ts
    expect(navega(`
const DATA_CAPTURE_ROUTES: Record<string, Href> = {
  systolic_bp: '/edad-atp/vitals?focus=systolic_bp',
`)).toBe(true);
  });

  it('un import de tipo NO acredita puerta', () => {
    expect(navega(`
import type { Href } from 'expo-router';
const x = ['/economy/referrals'];
`)).toBe(false);
  });

  it('ACEPTA la llamada partida en varias líneas', () => {
    expect(navega(`
router.push({
  pathname: '/edad-atp/lab-confirmation',
`)).toBe(true);
  });

  it('ACEPTA la tabla envuelta en otro genérico', () => {
    // app/salud/diagnostico/index.tsx
    expect(navega(`
const MISSING_ROUTES: Partial<Record<DxMissingKey, Href>> = {
  historia_basica: '/historia-clinica',
`)).toBe(true);
  });
});

describe('atajos locales de navegación', () => {
  it('encuentra el helper que envuelve a router.push', () => {
    // src/components/hoy/HoyEditorialSection.tsx (el gemelo de YO murió en CIERRE-6)
    expect(navAliases(`const go = (route: Href) => router.push(route);`)).toEqual(['go']);
  });

  it('encuentra también la forma de función declarada', () => {
    expect(navAliases(`
function abrir(r: Href) {
  haptic.light();
  router.replace(r);
}`)).toEqual(['abrir']);
  });

  it('NO confunde una función que no navega', () => {
    expect(navAliases(`const calcular = (x: number) => x * 2;`)).toEqual([]);
  });

  it('con el atajo declarado, la llamada cuenta como puerta', () => {
    expect(navega(`onTap={() => go('/reports')}`, ['go'])).toBe(true);
  });

  it('sin atajo declarado, la misma llamada NO cuenta', () => {
    // Es lo que separa un helper de navegación de cualquier función de una letra.
    expect(navega(`onTap={() => go('/reports')}`, [])).toBe(false);
  });
});

describe('REGLA 2 · resolución de imports', () => {
  const { resolveImport } = censo;
  const desde = resolve(here, '..', 'services', 'atp-room-core.ts');

  it('resuelve el alias @/ contra la raíz del proyecto', () => {
    expect(resolveImport(desde, '@/src/constants/app-registry')).toBeTruthy();
  });

  it('resuelve rutas relativas', () => {
    expect(resolveImport(desde, './atp-room-store')).toBeTruthy();
  });

  it('ignora los paquetes de node_modules', () => {
    expect(resolveImport(desde, 'react-native')).toBeNull();
    expect(resolveImport(desde, 'expo-router')).toBeNull();
  });

  it('devuelve null cuando el archivo no existe', () => {
    expect(resolveImport(desde, './no-existe-este-modulo')).toBeNull();
  });
});

describe('el tokenizador', () => {
  it('devuelve cada string con su línea', () => {
    const out = extractStrings("const a = 1;\nconst b = '/kit';");
    expect(out).toEqual([{ value: '/kit', line: 2 }]);
  });

  it('no captura rutas mencionadas en comentarios', () => {
    const out = extractStrings("// va a '/health-hub'\n/* y a '/salud' */\nconst x = 1;");
    expect(out).toEqual([]);
  });

  it('no confunde https:// con un comentario', () => {
    const out = extractStrings(`const u = 'https://somosatp.com/x';`);
    expect(out).toEqual([{ value: 'https://somosatp.com/x', line: 1 }]);
  });

  it('convierte la interpolación en [param]', () => {
    const out = extractStrings('const r = `/comunidad/perfil/${id}`;');
    expect(out[0].value).toBe('/comunidad/perfil/[param]');
  });

  it('cuenta bien las líneas después de un comentario de bloque multilínea', () => {
    const out = extractStrings('/*\n\n\n*/\nconst x = "/kit";');
    expect(out[0].line).toBe(5);
  });
});

describe('normalizeRoute', () => {
  it('colapsa diagonales y quita la final', () => {
    expect(normalizeRoute('//salud//hoy/')).toBe('/salud/hoy');
  });

  it('la raíz sigue siendo la raíz', () => {
    expect(normalizeRoute('/')).toBe('/');
  });
});

/**
 * 19.1 · Pieza 6 — el recorrido corto. `--cambiadas <ref>` compara el mapa de
 * puertas de hoy contra el de un commit anterior; la pieza comparable y pura
 * es diffPuertas, y aquí se fija su contrato: solo cambios, con el antes y el
 * ahora, y quedarse sin puerta también es un cambio.
 */
describe('diffPuertas (--cambiadas)', () => {
  const { puertasMap, diffPuertas } = censo;

  it('una puerta igual no aparece', () => {
    expect(diffPuertas({ '/kit': ['HOY'] }, { '/kit': ['HOY'] })).toEqual([]);
  });

  it('reporta puerta cambiada con antes y ahora', () => {
    expect(diffPuertas({ '/mente/progreso': ['mente'] }, { '/mente/progreso': ['ATP'] }))
      .toEqual([{ route: '/mente/progreso', antes: ['mente'], ahora: ['ATP'] }]);
  });

  it('ruta nueva y ruta borrada aparecen con null', () => {
    const d = diffPuertas({ '/mente': ['ATP'] }, { '/rachas': ['ATP'] });
    expect(d).toEqual([
      { route: '/mente', antes: ['ATP'], ahora: null },
      { route: '/rachas', antes: null, ahora: ['ATP'] },
    ]);
  });

  it('quedarse sin puerta TAMBIÉN es un cambio (huérfana nueva)', () => {
    expect(diffPuertas({ '/x': ['HOY'] }, { '/x': [] }))
      .toEqual([{ route: '/x', antes: ['HOY'], ahora: [] }]);
  });

  it('el orden interno de las puertas no genera falsos cambios', () => {
    // puertasMap ordena las fuentes: dos audits con el mismo contenido dan el
    // mismo mapa aunque los Sets iteren distinto.
    const a = puertasMap([{ withGroups: '/kit', sources: ['app/b.tsx', 'app/a.tsx'] }]);
    const b = puertasMap([{ withGroups: '/kit', sources: ['app/a.tsx', 'app/b.tsx'] }]);
    expect(diffPuertas(a, b)).toEqual([]);
  });

  it('puertasMap traduce las salas y limpia rutas de archivo (5 salas)', () => {
    const m = puertasMap([
      { withGroups: '/solar', sources: ['app/(tabs)/kit.tsx', 'app/supplements.tsx'] },
    ]);
    expect(m['/solar']).toEqual(['ATP', 'supplements']);
  });
});

/**
 * DEUDA · la lista blanca también necesita quien la guarde.
 *
 * `/economy/challenges`, `/economy/referrals` y `/admin/reports` siguieron
 * listadas con el motivo "la pantalla se conserva" semanas después de que
 * `ba42730` las borrara. El censo daba verde: una entrada cuyo archivo no
 * existe no es una huérfana, y las huérfanas eran lo único que miraba.
 */
describe('entradasFantasma · la lista blanca no puede citar pantallas borradas', () => {
  const { entradasFantasma } = censo;

  // El shape que devuelve collectRoutes(), reducido a lo que mira la función.
  const ruta = (noGroups: string, withGroups = noGroups) => ({ noGroups, withGroups });

  it('caza la entrada cuyo archivo ya no existe', () => {
    const allowed = { '/legal/aviso': 'motivo real', '/economy/challenges': 'la pantalla se conserva' };
    expect(entradasFantasma(allowed, [ruta('/legal/aviso')])).toEqual(['/economy/challenges']);
  });

  it('una entrada con archivo vivo NO es fantasma, tenga o no puerta', () => {
    // /health-hub existe en app/ y es un redirect legacy a propósito.
    expect(entradasFantasma({ '/health-hub': 'redirect legacy' }, [ruta('/health-hub')])).toEqual([]);
  });

  it('acepta la entrada escrita sin el grupo aunque el archivo lo tenga', () => {
    // app/(tabs)/kit.tsx se puede citar como '/kit' o '/(tabs)/kit'.
    expect(entradasFantasma({ '/kit': 'x' }, [ruta('/kit', '/(tabs)/kit')])).toEqual([]);
  });

  it('normaliza antes de comparar: la diagonal final no inventa un fantasma', () => {
    expect(entradasFantasma({ '/salud/': 'x' }, [ruta('/salud')])).toEqual([]);
  });

  it('la lista blanca de HOY no tiene ni un fantasma', () => {
    // El candado de verdad: corre contra el disco real. Si alguien borra una
    // pantalla y olvida podar su motivo, este test truena antes que el censo.
    const { collectRoutes } = censo;
    const permitidas = require_(
      resolve(here, '..', '..', 'scripts', 'censo-permitidas.json')
    ).permitidas;
    expect(entradasFantasma(permitidas, collectRoutes())).toEqual([]);
  });
});
