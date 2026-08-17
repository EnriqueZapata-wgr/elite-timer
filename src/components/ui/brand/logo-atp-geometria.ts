/**
 * logo-atp-geometria — el logo vertical de ATP como DATOS PUROS, extraídos 1:1
 * de `assets/images/Logo-vertical_ATP_1024x1024_N.svg`.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 *  Los dos logos verticales son SVG y `metro.config.js` no tiene transformer de
 *  SVG, así que no se pueden `require` como componente. El canal que YA funciona
 *  en este repo es el del set de iconos: el asset es la fuente de verdad, su
 *  geometría se copia a un módulo de datos puros (cero imports, importable bajo
 *  node) y un componente de `react-native-svg` la monta. Mismo patrón que
 *  `icons/icon-paths.ts` + `app-icon-map.tsx`, aplicado a la marca.
 *
 *  El logo NO entra a `assets/icons/`: ese set está sellado en 56 archivos por
 *  el censo y es de glifos de función monocromos (Phosphor, un path,
 *  `fill="currentColor"`). La marca es otra cosa: multicolor, con degradados y
 *  con una pieza que sí se tematiza.
 *
 * LOS DOS ARCHIVOS SON EL MISMO DIBUJO
 *  Medido: `_N` y `_B` difieren en UN carácter de su bloque <style>, la regla
 *  `.cls-1` (fill #1d1d1b contra #fff). Esa clase es el logotipo "ATP" (la A y
 *  la P). Todo lo demás (molécula, degradados, y la T, que lleva el degradado de
 *  marca) es idéntico. Por eso aquí hay UNA geometría y el color del logotipo
 *  entra por parámetro: sin dos copias que se puedan desincronizar.
 *
 * LA FIRMA NO SE MONTA, A PROPÓSITO
 *  El asset trae vectorizado *"ACTIVA TU ENERGÍA Y SALUD"* en 21 paths (los
 *  primeros 21 del archivo, y = 847..885). `docs/DESIGN_SYSTEM.md` lo declara
 *  deuda de marca: es la firma de otra época, el producto hoy dice "tu sistema
 *  operativo de rendimiento", y la instrucción vigente es **usar el logo sin
 *  firma** hasta que se resuelva con la autora del manual. Así que la firma se
 *  queda fuera del montaje: el `viewBox` recorta a la caja del contenido que sí
 *  va (logotipo + molécula), y la bajada vive como TEXTO en la pantalla, donde
 *  se corrige con un commit y no con un rediseño.
 *
 * REGENERAR: si el asset cambia, este archivo se regenera. El test
 * `__tests__/logo-atp.test.ts` compara los dos contra el SVG y truena si
 * divergen.
 */

/**
 * Caja del contenido que SÍ se monta, medida rasterizando cada elemento por
 * separado: x 116..781, y 0..785 en las unidades del asset (el original es
 * `0 0 912.5 885.71`, y esos 100 de sobra abajo eran la firma).
 */
export const LOGO_ATP_VIEWBOX = '116 0 665 785';

/** Alto contra ancho del montaje (785/665). Para dimensionar sin deformar. */
export const LOGO_ATP_RATIO = 785 / 665;

/**
 * Color del logotipo "ATP" en cada tema, tal cual lo definen los dos assets
 * oficiales. No son colores inventados ni tokens de UI: son la marca.
 *  · claro  → `_N` (#1d1d1b) sobre acero: ~14:1 de contraste.
 *  · oscuro → `_B` (#fff) sobre el gradiente de auth: ~19:1.
 */
export const LOGO_ATP_LOGOTIPO = {
  claro: '#1d1d1b',
  oscuro: '#ffffff',
} as const;

/** Los degradados del asset, con los ids renombrados a algo legible. */
export const LOGO_ATP_GRADIENTES = [
  {
    id: 'atpGrad52',
    x1: '481.16', y1: '871.28', x2: '481.16', y2: '694.49',
    stops: [
      { offset: '0', color: '#34b297' },
      { offset: '0.25', color: '#3eb287' },
      { offset: '0.57', color: '#4eb26c' },
      { offset: '0.74', color: '#50b36b' },
      { offset: '0.81', color: '#58b466' },
      { offset: '0.87', color: '#64b85e' },
      { offset: '0.92', color: '#76bc53' },
      { offset: '0.97', color: '#8ec244' },
      { offset: '1', color: '#a7c834' },
    ],
  },
  {
    id: 'atpGrad38',
    x1: '619.35', y1: '279.67', x2: '819.49', y2: '279.67',
    gradientTransform: 'matrix(-0.32, 0.98, -0.55, -0.57, 1022.8, -99.4)',
    stops: [
      { offset: '0', color: '#a7c834' },
      { offset: '0.11', color: '#8bc34c' },
      { offset: '0.27', color: '#6cbd67' },
      { offset: '0.43', color: '#53b87c' },
      { offset: '0.6', color: '#42b58b' },
      { offset: '0.78', color: '#37b394' },
      { offset: '1', color: '#34b297' },
    ],
  },
  {
    id: 'atpGrad42',
    x1: '645.29', y1: '253', x2: '742.72', y2: '253',
    gradientTransform: 'translate(1038.29 906.55) rotate(-137.81)',
    stops: [
      { offset: '0', color: '#a7c834' },
      { offset: '0.44', color: '#6ebd65' },
      { offset: '0.81', color: '#44b589' },
      { offset: '1', color: '#34b297' },
    ],
  },
  {
    id: 'atpGrad41',
    x1: '282.2', y1: '1.59', x2: '156.84', y2: '1.59',
    gradientTransform: 'matrix(0.35, -0.87, 0.42, 0.73, 311.98, 482.91)',
    stops: [
      { offset: '0', color: '#45b386' },
      { offset: '0.43', color: '#75b94d' },
      { offset: '0.83', color: '#a7c834' },
    ],
  },
] as const;

/**
 * El logotipo "ATP". La A y la P se pintan con el color del tema; la T lleva el
 * degradado de marca (lima→teal) en los DOS temas, que es identidad y no se
 * calibra. El `transform` es el del asset y aplica a los tres.
 */
export const LOGO_ATP_LOGOTIPO_TRANSFORM = 'translate(-50.15 -85.92)';

/** A y P: color del tema. */
export const LOGO_ATP_LETRAS: readonly string[] = [
  'M216.62,833.32l-19.81,38H166.73l92.84-176.79h29.94l92.7,176.79H352.28l-19.82-38ZM274.47,723,229.93,808.1H319Z',
  'M642.88,694.49H777.52a54.36,54.36,0,0,1,20.76,4,56.09,56.09,0,0,1,17.21,11A52.18,52.18,0,0,1,827.2,725.6a45.6,45.6,0,0,1,4.27,19.46,46.44,46.44,0,0,1-4.27,19.59,49.23,49.23,0,0,1-11.71,16.06,57.87,57.87,0,0,1-17.21,10.78,54.17,54.17,0,0,1-20.76,4H669.78v75.79h-26.9Zm134.64,75.78a26.91,26.91,0,0,0,10.42-2,27.92,27.92,0,0,0,8.53-5.42,26,26,0,0,0,5.78-8,22.59,22.59,0,0,0,2.17-9.76,22.23,22.23,0,0,0-2.17-9.7,26.59,26.59,0,0,0-5.85-8,28.3,28.3,0,0,0-8.54-5.49,26.35,26.35,0,0,0-10.34-2H669.78v50.43Z',
];

/** La T: degradado de marca, nunca tematizada. */
export const LOGO_ATP_TE = 'M386.87,694.49H575.46v25.35H494.61V871.28h-26.9V719.84H386.87Z';

/**
 * La molécula. Orden = orden del documento (importa para el pintado). Los
 * `anillo` son las dos circunferencias tenues de trazo lima alrededor del nodo
 * grande: en el asset van a 0.5 y 0.25 unidades de un viewBox de 785, o sea
 * casi imperceptibles. Van tal cual: son parte del dibujo.
 */
export type LogoAtpElemento =
  | { tipo: 'rect'; x: number; y: number; width: number; height: number; transform: string; fill: string }
  | { tipo: 'circulo'; cx: number; cy: number; r: number; fill: string }
  | { tipo: 'elipse'; cx: number; cy: number; rx: number; ry: number; fill: string }
  | { tipo: 'anillo'; cx: number; cy: number; rx: number; ry: number; strokeWidth: number };

/** Trazo de los dos anillos tenues (`.cls-3` / `.cls-4` del asset). */
export const LOGO_ATP_ANILLO_TRAZO = '#a7c834';

export const LOGO_ATP_MOLECULA: readonly LogoAtpElemento[] = [
  { tipo: 'anillo', cx: 267.12, cy: 122.8, rx: 106.68, ry: 107.54, strokeWidth: 0.5 },
  { tipo: 'anillo', cx: 267.12, cy: 124.7, rx: 123.58, ry: 124.58, strokeWidth: 0.25 },
  { tipo: 'rect', x: 628.34, y: 372.31, width: 64.89, height: 21.54, transform: 'translate(609.26 1060.96) rotate(-120)', fill: 'url(#atpGrad38)' },
  { tipo: 'rect', x: 635.26, y: 245.28, width: 117.5, height: 15.44, transform: 'translate(1327.96 -111.58) rotate(137.81)', fill: 'url(#atpGrad42)' },
  { tipo: 'rect', x: 475.88, y: 332.19, width: 117.5, height: 27.09, transform: 'translate(1085.26 470.56) rotate(166.44)', fill: '#73b64c' },
  { tipo: 'rect', x: 342.17, y: 432.56, width: 103.46, height: 29.08, transform: 'translate(917.12 198.99) rotate(115.59)', fill: '#7aba49' },
  { tipo: 'rect', x: 345.69, y: 276.05, width: 89.27, height: 32.29, transform: 'translate(314.39 -280.63) rotate(50.15)', fill: 'url(#atpGrad41)' },
  { tipo: 'elipse', cx: 700.29, cy: 118.01, rx: 38.8, ry: 40.24, fill: '#34b298' },
  { tipo: 'elipse', cx: 575.87, cy: 230.29, rx: 51.82, ry: 53.75, fill: '#5db469' },
  { tipo: 'circulo', cx: 645.58, cy: 369.81, r: 56.19, fill: '#34b297' },
  { tipo: 'circulo', cx: 393.36, cy: 279.48, r: 55.42, fill: '#75b94d' },
  { tipo: 'circulo', cx: 288.38, cy: 455.51, r: 76.58, fill: '#4eb16c' },
  { tipo: 'circulo', cx: 266.87, cy: 122.27, r: 86.5, fill: '#a7c834' },
];
