/**
 * MB-31B REMATE — el candado único de lo que cerró el remate: ámbitos B2/B3
 * mergeados, las pantallas SIN DUEÑO del reparto, la frontera SaludHub y el
 * árbol completo de Edad ATP que B2 dejó fuera. Modelo: mb31b1-ambito.test.ts.
 *
 *  1 · RATCHET: ningún archivo de la lista del remate puede tener un hex
 *      NEUTRO a mano (canales iguales: #000, #fff, #888, #0a0a0a…) ni un
 *      valor de token de tema escrito como literal (#121212, #E9EEF1…).
 *      Marca y sección se quedan (el ratchet distingue por canales). Las
 *      carpetas se enumeran del disco: pantalla nueva entra sola.
 *  2 · CONTRASTE CALCULADO (WCAG real) de los pares que el remate introdujo.
 *  3 · CANDADOS DE SCOPE:
 *      a) el bug que este remate corrigió — una RUTA que declara `themed`
 *         lee el tema GLOBAL (useAppTheme); useSurfaceTokens a nivel de ruta
 *         devuelve oscuro perpetuo porque el <ThemeReady> que abre el claro
 *         lo renderiza la propia pantalla más abajo. Candado: todo archivo
 *         de las listas que declare themed/ThemeReady debe llamar useAppTheme.
 *      b) la frontera B2 cerrada — SaludHub es CUERPO compartido: lee el
 *         scope (useSurfaceTokens, nunca useAppTheme) y sus DOS monturas
 *         declaran themed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  THEME_DARK, THEME_LIGHT, CATEGORY_COLORS, ATP_BRAND, RAMPAS_OSCURAS,
} from '@/src/constants/brand';
import { SECCION_COLORS } from '@/src/constants/concept-colors';
import { contrastRatio } from '@/src/utils/contrast';

// ─── la lista del remate ───────────────────────────────────────────────────

/** Recorre un directorio completo (subcarpetas incluidas) juntando .tsx y .ts.
 *  Los modulos puros .ts tambien pintan: un hex de token escrito a mano ahi
 *  hace el mismo dano, y era un punto ciego del candado.
 *  Los __tests__ quedan fuera a proposito: un fixture puede llevar hexes de
 *  ejemplo sin que eso sea una violacion. Verificado el 29-ago-2026: hoy no
 *  hay ni un .tsx bajo __tests__ en lo que se camina, asi que excluirlos NO
 *  quita ni un archivo de la cobertura que ya existia. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== '__tests__') out.push(...walk(p)); }
    else if (name.endsWith('.tsx') || name.endsWith('.ts')) out.push(p.replace(/\\/g, '/'));
  }
  return out;
}

/** Las pantallas sin dueño del reparto B1/B2/B3 + las zonas que el remate
 *  migró. login/register entran al ratchet aunque su cuerpo (AuthScreen) sea
 *  frontera oscura constante: sus literales quedaron anclados a constantes y
 *  no deben regresar como hex. */
function listaRemate(): string[] {
  return [
    // Sin dueño en el reparto (FIFO de B1), migradas aquí.
    'app/hoy-habitos.tsx',
    'app/ordenar-dia.tsx',
    'app/atp-orden.tsx',
    'app/night-filter.tsx',
    'app/notifications.tsx',
    'app/profile.tsx',
    'app/argos-chat.tsx',
    'app/paywall.tsx',
    'app/redeem-code.tsx',
    'app/login.tsx',
    'app/register.tsx',
    // La frontera B2 cerrada: el cuerpo del tab SALUD y su montura. OLA6 B:
    // /health-hub dejó de ser montura y pasó a ser redirect a /salud, así que
    // ya no tiene tema que declarar. SaludHub ya no se nombra suelto: entra
    // por el walk de src/screens, junto con el resto de los cuerpos de
    // pantalla, que eran de las superficies mas grandes del producto sin un
    // solo candado que las mirara.
    ...walk('src/screens'),
    'app/(tabs)/salud.tsx',
    // Legal: cuerpo compartido de las dos rutas.
    'src/components/legal/LegalDocScreen.tsx',
    // Lo que B2 dejó fuera de su lista, migrado aquí (enumerado del disco).
    ...walk('app/edad-atp'),
    ...walk('app/historia-clinica'),
    ...walk('app/legal'),
    ...walk('src/components/edad-atp'),
    // El kit del chat ARGOS (piezas exclusivas del flujo, scope-aware).
    ...walk('src/components/argos/chat'),
    // Rezagos del bloque de hex sueltos.
    'app/mente/progreso.tsx',
    'src/components/mente/MenteHubCard.tsx',
    'components/circular-timer.tsx',
  ];
}

/** Quita comentarios (los briefs y refs viven ahí). */
function sinComentarios(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

/** ¿El hex es NEUTRO (canales iguales)? Acepta #RGB(A) y #RRGGBB(AA). */
function esNeutro(hex: string): boolean {
  let v = hex.slice(1);
  if (v.length === 4) v = v.slice(0, 3);
  if (v.length === 8) v = v.slice(0, 6);
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  if (v.length !== 6) return false;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return r === g && g === b;
}

function normaliza(hex: string): string {
  let v = hex.slice(1).toLowerCase();
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  return `#${v}`;
}

/** Marca y sección son IDENTIDAD: pueden vivir como literal. */
const IDENTIDAD = new Set(
  [
    ...Object.values(CATEGORY_COLORS),
    ...Object.values(SECCION_COLORS),
    ATP_BRAND.lime, ATP_BRAND.teal, ATP_BRAND.teal1, ATP_BRAND.amber,
    ...ATP_BRAND.moleculeGradient,
  ].map((v) => normaliza(v)),
);

/** Valores de token de tema: tampoco se escriben como literal en pantallas.
 *
 *  ACERO (22-ago-2026): se miran LAS DOS rampas oscuras, no solo la vigente.
 *  Si la lista saliera únicamente de los tokens vivos, mover la bandera
 *  desarmaría medio candado: con el acero encendido dejarían de estar
 *  bloqueados los doce grises del negro (que sí siguen bloqueados por
 *  neutros, pero solo por casualidad) y con el acero apagado dejarían de
 *  estar bloqueados los doce del acero, que NO son neutros y se colarían sin
 *  que nadie se enterara. El candado se reapunta, no se debilita. */
const VALORES_TOKEN = new Set(
  [
    ...Object.values(THEME_DARK),
    ...Object.values(THEME_LIGHT),
    ...RAMPAS_OSCURAS.flatMap((r) => Object.values(r)),
  ]
    .filter((v): v is string => typeof v === 'string' && v.startsWith('#'))
    .map((v) => normaliza(v))
    .filter((v) => !IDENTIDAD.has(v)),
);

// ─── 1 · RATCHET ───────────────────────────────────────────────────────────

describe('1 · ratchet del remate: cero hex neutro a mano en la lista', () => {
  it.each(listaRemate())('%s', (file) => {
    const src = sinComentarios(readFileSync(file, 'utf8'));
    const hexes = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    const ofensas = hexes.filter(
      (h) => esNeutro(h) || VALORES_TOKEN.has(normaliza(h)),
    );
    expect(ofensas, `hex neutro/token a mano: ${ofensas.join(', ')}`).toEqual([]);
  });
});

// ─── 2 · CONTRASTE CALCULADO de los pares del remate ───────────────────────

describe('2 · pares del remate, calculados (no comparación de strings)', () => {
  // [nombre, fg, bg, mínimo]
  const PARES: [string, string, string, number][] = [
    // El acento-dato del remate (gramsInput y equivalentes): lima como letra
    // SOLO en oscuro, sobre superficie flotante.
    ['oscuro: lima sobre flotante (acento-dato)', ATP_BRAND.lime, THEME_DARK.flotante, 4.5],
    // …y su espejo en claro: el teal calibrado sobre flotante.
    ['claro: teal calibrado sobre flotante', THEME_LIGHT.tealTexto, THEME_LIGHT.flotante, 4.5],
    // SaludHub denso en claro: el tenue cae a secundario para letra chica.
    ['claro: secundario sobre card (denso/meta)', THEME_LIGHT.textoSecundario, THEME_LIGHT.card, 4.5],
    // Legal en claro: cuerpo de lectura sobre fondo.
    ['claro: secundario sobre fondo (legal body)', THEME_LIGHT.textoSecundario, THEME_LIGHT.fondo, 4.5],
    // Edad ATP en claro: texto principal sobre card.
    ['claro: texto sobre card (edad-atp)', THEME_LIGHT.texto, THEME_LIGHT.card, 7],
  ];

  it.each(PARES)('%s', (_nombre, fg, bg, minimo) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(minimo);
  });
});

// ─── 3 · CANDADOS DE SCOPE ─────────────────────────────────────────────────

describe('3a · ruta que declara themed lee el tema GLOBAL (useAppTheme)', () => {
  // El bug corregido en el remate: useSurfaceTokens a nivel de ruta = oscuro
  // perpetuo. Si un archivo abre scope (themed/ThemeReady) tiene que leer
  // useAppTheme en alguna parte; solo-scoped es la firma del bug.
  const declaraScope = (src: string) =>
    /<Screen[^>]*\bthemed\b/.test(src) || /<TabScreen[^>]*\bthemed\b/.test(src) || /<ThemeReady>/.test(src);

  it.each(listaRemate().filter((f) => f.startsWith('app/')))('%s', (file) => {
    const src = sinComentarios(readFileSync(file, 'utf8'));
    if (!declaraScope(src)) return; // wrappers delgados y fronteras: sin scope propio
    expect(
      src.includes('useAppTheme('),
      'declara themed/ThemeReady pero no lee useAppTheme: useSurfaceTokens a nivel de ruta es oscuro perpetuo',
    ).toBe(true);
  });
});

describe('3b · la frontera SaludHub quedó cerrada y en el patrón correcto', () => {
  it('SaludHub (cuerpo compartido) lee el SCOPE, nunca el tema global', () => {
    const src = readFileSync('src/screens/salud/SaludHub.tsx', 'utf8');
    expect(src).toContain('useSurfaceTokens');
    expect(src.includes('useAppTheme(')).toBe(false);
  });

  it.each([
    ['app/(tabs)/salud.tsx', /<TabScreen themed>/],
  ])('%s declara themed', (file, patron) => {
    expect(readFileSync(file, 'utf8')).toMatch(patron);
  });

  // OLA6 B: la segunda montura murió. Si alguien la revive, este test lo dice.
  it('/health-hub es un redirect, no una segunda copia de SALUD', () => {
    const src = readFileSync('app/health-hub.tsx', 'utf8');
    expect(src).toContain('Redirect');
    expect(src.includes('SaludHub')).toBe(false);
  });
});
