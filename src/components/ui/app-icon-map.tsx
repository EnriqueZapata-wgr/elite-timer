/**
 * app-icon-map — nombre lógico → COMPONENTE que lo dibuja.
 *
 * El set SVG (assets/icons/) YA está montado: los glifos de relleno pasan por
 * `svg(...)` — un path de icon-paths.ts, extraído 1:1 del asset; el censo
 * verifica que no diverjan — y los dos de trazo (`emociones`, `rm`) son
 * componentes a mano. Los `ion(...)` que quedan son los nombres SIN asset
 * todavía (puertas de SALUD, hábitos sin app propia, destinos): cuando
 * lleguen sus SVG se sustituyen aquí y cambian todos a la vez, sin tocar
 * pantallas.
 *
 * El footgun de color sigue vivo: el set pinta con `fill="currentColor"`,
 * pero `emociones` y `rm` son 100% trazo (`stroke="currentColor"`) — si el
 * color solo entrara por fill, saldrían negros. El contrato de un glifo es:
 * recibe `{ size, color }` y ese ÚNICO color tiene que entrar por fill Y por
 * stroke (via `color` en el root del Svg + `currentColor`). El censo vigila
 * que los assets de trazo no acaben en el factory de relleno.
 *
 * La lista de nombres vive aparte (`app-icon-names.ts`, datos puros) para que
 * los tests node verifiquen cobertura sin montar React Native. TypeScript
 * exige aquí una entrada por nombre: agregar un nombre sin dibujo no compila.
 */
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import type { AppIconName } from './app-icon-names';
import { ICON_PATHS, type SvgPathIconName } from './icons/icon-paths';
import { IconEmociones } from './icons/IconEmociones';
import { Icon1Rm } from './icons/Icon1Rm';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Lo único que recibe un glifo. Con esto tiene que pintarse completo. */
export interface AppIconGlyphProps {
  size: number;
  color: string;
}

export type AppIconGlyph = (props: AppIconGlyphProps) => React.JSX.Element;

/** Envoltorio del Ionicon de relleno. Queda SOLO para nombres sin asset. */
function ion(name: IoniconName): AppIconGlyph {
  const Glyph: AppIconGlyph = ({ size, color }) => (
    <Ionicons name={name} size={size} color={color} />
  );
  return Glyph;
}

/**
 * Glifo del set SVG: un path de relleno sobre viewBox 256 (Phosphor). El
 * `color` entra por el root del Svg y el path lo toma vía `currentColor` —
 * mismo mecanismo que usan los componentes de trazo para el stroke. SOLO
 * para assets de relleno: uno 100% trazo aquí saldría negro (censo lo veta).
 */
function svg(name: SvgPathIconName): AppIconGlyph {
  const Glyph: AppIconGlyph = ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 256 256" color={color}>
      <Path d={ICON_PATHS[name]} fill="currentColor" />
    </Svg>
  );
  return Glyph;
}

export const ICON_MAP: Record<AppIconName, AppIconGlyph> = {
  // ── Mente ──
  meditar: svg('meditar'),
  respirar: svg('respirar'),
  emociones: IconEmociones,
  journal: svg('journal'),
  sueno: svg('sueno'),
  nback: svg('nback'),
  rachas: svg('rachas'),

  // ── Cuerpo ──
  entrenar: svg('entrenar'),
  cardio: svg('cardio'),
  movilidad: svg('movilidad'),
  rm: Icon1Rm,
  records: svg('records'),

  // ── Hábitos diarios ──
  comida: svg('comida'),
  hidratacion: svg('hidratacion'),
  ayuno: svg('ayuno'),
  suplementos: svg('suplementos'),
  recetas: svg('recetas'),
  'lista-compra': svg('lista-compra'),

  // ── Salud ──
  sol: svg('sol'),
  glucosa: svg('glucosa'),
  cetonas: svg('cetonas'),
  ciclo: svg('ciclo'),
  labs: svg('labs'),
  protocolos: svg('protocolos'),

  // ── Sistema ──
  ajustes: svg('ajustes'),

  // ── Tab bar ──
  // Las cuatro salas: línea en reposo, '-fill' en activo (lo decide el
  // tabBarIcon del layout con `focused`). La orbe no está aquí: es ArgosOrb.
  'tab-hoy': svg('tab-hoy'),
  'tab-hoy-fill': svg('tab-hoy-fill'),
  'tab-atp': svg('tab-atp'),
  'tab-atp-fill': svg('tab-atp-fill'),
  'tab-salud': svg('tab-salud'),
  'tab-salud-fill': svg('tab-salud-fill'),
  'tab-tribu': svg('tab-tribu'),
  'tab-tribu-fill': svg('tab-tribu-fill'),

  // ── Puertas de SALUD ──
  'salud-hoy': ion('today-outline'),
  'salud-datos': ion('stats-chart-outline'),
  'salud-evolucion': ion('trending-up-outline'),
  'salud-expediente': ion('folder-open-outline'),
  'salud-ciclo': ion('ellipse-outline'),

  // ── Hábitos del HOY sin app propia ──
  'bano-frio': ion('snow-outline'),
  grounding: ion('leaf-outline'),
  'sin-alcohol': ion('wine-outline'),
  'lentes-rojos': ion('glasses-outline'),
  pasos: ion('footsteps-outline'),
  'sin-procesados': ion('nutrition-outline'),
  'off-pantallas': ion('phone-portrait-outline'),

  // ── Destinos de SALUD sin app propia ──
  // Mismos rellenos que tenían sus filas antes del enchufe: cero churn visual.
  sintomas: ion('medkit-outline'),
  diagnostico: ion('git-network-outline'),
  'edad-atp': ion('hourglass-outline'),
  reportes: ion('bar-chart-outline'),
  cronotipo: ion('moon-outline'),
  'historia-clinica': ion('document-text-outline'),
  cuestionario: ion('list-outline'),
  evaluaciones: ion('checkbox-outline'),
  padecimientos: ion('bandage-outline'),
};

/** El dibujo cuando un nombre no está en el mapa. Visible, para que se note. */
export const ICON_FALLBACK: AppIconGlyph = ion('help-circle-outline');

export function glyphFor(name: string): AppIconGlyph {
  return (ICON_MAP as Record<string, AppIconGlyph>)[name] ?? ICON_FALLBACK;
}
