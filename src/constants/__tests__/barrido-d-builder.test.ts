/**
 * Barrido D · el Constructor de rutinas — candados.
 *
 * builder.tsx era la última pantalla grande sin tema: 800 líneas de color
 * duro que en modo claro se veían negras enteras. Al migrarla aparecieron dos
 * defectos que este archivo existe para que no vuelvan:
 *
 *  1 · RATCHET de hex a mano en la pantalla y sus componentes. Mismo criterio
 *      que el ámbito B1: los neutros y los valores de token no se escriben a
 *      mano; los colores de identidad (marca, tipo de bloque) sí, porque son
 *      semántica del producto y además viajan a la base dentro de block.color.
 *
 *  2 · El picker de ejercicios NO está migrado. Vive FUERA del <ThemeReady>
 *      a propósito: adentro, su EmptyState resolvía tokens claros y los
 *      pintaba sobre su propio fondo negro (contraste 1.14, texto invisible).
 *      Cuando alguien migre el picker, este candado se cae y hay que borrarlo
 *      a mano: eso es la señal de que el paso siguiente está hecho.
 *
 *  3 · CONTRASTE CALCULADO de los pares que esta pantalla introdujo. El lima
 *      como TEXTO en claro da 1.34 y por eso no aparece en ninguno: lo que se
 *      mide aquí es su reemplazo.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { THEME_DARK, THEME_LIGHT, CATEGORY_COLORS, ATP_BRAND } from '@/src/constants/brand';
import { contrastRatio } from '@/src/utils/contrast';

const PANTALLA = 'app/builder.tsx';
const PIEZAS = [
  'src/components/builder/BlockCard.tsx',
  'src/components/builder/StatsBar.tsx',
  'src/components/builder/AddBlockButton.tsx',
];

function sinComentarios(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

function normaliza(hex: string): string {
  let v = hex.slice(1).toLowerCase();
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  return `#${v}`;
}

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

const IDENTIDAD = new Set(
  [
    ...Object.values(CATEGORY_COLORS),
    ATP_BRAND.lime, ATP_BRAND.teal, ATP_BRAND.teal1, ATP_BRAND.teal2, ATP_BRAND.amber,
    ...ATP_BRAND.moleculeGradient,
  ].map(normaliza),
);

const VALORES_TOKEN = new Set(
  [...Object.values(THEME_DARK), ...Object.values(THEME_LIGHT)]
    .filter((v): v is string => typeof v === 'string' && v.startsWith('#'))
    .map(normaliza)
    .filter((v) => !IDENTIDAD.has(v)),
);

describe('1 · ratchet: cero hex neutro o valor de token a mano', () => {
  it.each([PANTALLA, ...PIEZAS])('%s', (file) => {
    const src = sinComentarios(readFileSync(file, 'utf8'));
    const hexes = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    const ofensas = hexes.filter((h) => esNeutro(h) || VALORES_TOKEN.has(normaliza(h)));
    expect(ofensas, `hex neutro/token a mano: ${ofensas.join(', ')}`).toEqual([]);
  });
});

describe('2 · el Constructor entrega tema de verdad', () => {
  const src = readFileSync(PANTALLA, 'utf8');

  it('envuelve la pantalla en ThemeReady', () => {
    // Sin esto, los hijos que usan useSurfaceTokens (BlockCard) reciben el
    // oscuro de respaldo y la pantalla queda negra en modo claro.
    expect(src).toMatch(/<ThemeReady>/);
  });

  it('el lienzo no lleva color en la hoja de estilos', () => {
    // El fondo entra por token en el JSX. Si vuelve al StyleSheet, vuelve a
    // ser un solo color para los dos temas.
    const hoja = src.slice(src.indexOf('StyleSheet.create'));
    expect(hoja).not.toMatch(/screen:\s*\{[^}]*backgroundColor/);
  });

  it('no importa la paleta fija de Colors', () => {
    // Los colores que quedan en esta pantalla son de tipo de bloque, y esos
    // los traen sus componentes. La pantalla ya no necesita paleta.
    expect(src.match(/import \{([^}]*)\} from '@\/constants\/theme'/)?.[1] ?? '')
      .not.toMatch(/\bColors\b/);
  });

  it('el picker de ejercicios queda FUERA del ThemeReady mientras no se migre', () => {
    // Ver la cabecera de este archivo: adentro, su EmptyState pinta texto
    // claro sobre fondo negro. Cuando el picker se migre, este candado se
    // borra a mano y el componente entra al scope.
    const cierre = src.lastIndexOf('</ThemeReady>');
    const picker = src.indexOf('<MatrixExercisePicker');
    expect(cierre, 'no encontré el cierre de ThemeReady').toBeGreaterThan(0);
    expect(picker, 'no encontré el picker').toBeGreaterThan(0);
    expect(picker, 'el picker sin migrar no puede quedar dentro del ThemeReady')
      .toBeGreaterThan(cierre);
  });
});

describe('3 · el color de bloque sigue siendo DATO, no tema', () => {
  it('createDefaultBlock escribe colores fijos, no tokens', () => {
    // block.color se guarda en Supabase. Si dependiera del tema, el mismo
    // bloque se vería distinto según con qué tema lo editó cada quien.
    const src = readFileSync('src/components/builder/AddBlockButton.tsx', 'utf8');
    const fn = src.slice(src.indexOf('function createDefaultBlock'));
    const cuerpo = fn.slice(0, fn.indexOf('export function'));
    expect(cuerpo).toMatch(/color: Colors\./);
    expect(cuerpo, 'el color persistido no puede salir de un token de tema')
      .not.toMatch(/color: t\./);
  });
});

describe('4 · pares de contraste que introdujo esta pantalla', () => {
  // [nombre, fg, bg, mínimo]
  const PARES: [string, string, string, number][] = [
    // El reemplazo del lima como texto: teal calibrado sobre el lienzo claro.
    ['claro: teal calibrado sobre fondo (acentos del Constructor)', THEME_LIGHT.tealTexto, THEME_LIGHT.fondo, 4.5],
    // Píldoras inactivas de modo y categoría: la pista pasó a flotante.
    ['claro: secundario sobre flotante (píldora inactiva)', THEME_LIGHT.textoSecundario, THEME_LIGHT.flotante, 4.5],
    // El placeholder del nombre va sobre el fondo desnudo, no sobre card.
    ['claro: secundario sobre fondo (placeholder del nombre)', THEME_LIGHT.textoSecundario, THEME_LIGHT.fondo, 4.5],
    // GUARDAR: negro sobre los dos extremos del degradado de marca.
    ['negro sobre lima (GUARDAR, inicio del degradado)', THEME_LIGHT.textoSobreLima, ATP_BRAND.lime, 4.5],
    // Chip de ejercicio en claro: el nombre va en teal sobre superficie hundida.
    ['claro: teal calibrado sobre hundido (chip de ejercicio)', THEME_LIGHT.tealTexto, THEME_LIGHT.hundido, 4.5],
    // Y el valor de las stats en oscuro no se movió.
    ['oscuro: texto sobre flotante (stats del Constructor)', THEME_DARK.texto, THEME_DARK.flotante, 7],
  ];

  it.each(PARES)('%s', (_n, fg, bg, minimo) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(minimo);
  });

  it('el lima como TEXTO sigue prohibido en claro (por eso existe el teal)', () => {
    // Este no es un candado del código, es el número que justifica la regla.
    expect(contrastRatio(ATP_BRAND.lime, THEME_LIGHT.fondo)).toBeLessThan(3);
  });
});
