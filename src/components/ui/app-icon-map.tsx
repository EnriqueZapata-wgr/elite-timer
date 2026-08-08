/**
 * app-icon-map — nombre lógico → COMPONENTE que lo dibuja.
 *
 * El set SVG (assets/icons/) está COMPLETO desde MB-28A: los glifos de relleno
 * pasan por `svg(...)` — un path de icon-paths.ts, extraído 1:1 del asset; el
 * censo verifica que no diverjan — y los dos de trazo (`emociones`, `rm`) son
 * componentes a mano. Aquí ya no queda familia ajena y el censo lo vigila:
 * un Ionicon nuevo en este archivo truena el ratchet. Un nombre nuevo entra
 * con su SVG (assets/icons/ + icon-paths.ts) o no entra.
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
import Svg, { Path } from 'react-native-svg';
import type { AppIconName } from './app-icon-names';
import { ICON_PATHS, type SvgPathIconName } from './icons/icon-paths';
import { IconEmociones } from './icons/IconEmociones';
import { Icon1Rm } from './icons/Icon1Rm';

/** Lo único que recibe un glifo. Con esto tiene que pintarse completo. */
export interface AppIconGlyphProps {
  size: number;
  color: string;
}

export type AppIconGlyph = (props: AppIconGlyphProps) => React.JSX.Element;

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
  medidas: svg('medidas'),

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
  'salud-hoy': svg('salud-hoy'),
  'salud-datos': svg('salud-datos'),
  'salud-evolucion': svg('salud-evolucion'),
  'salud-expediente': svg('salud-expediente'),
  'salud-ciclo': svg('salud-ciclo'),

  // ── Hábitos del HOY sin app propia ──
  'bano-frio': svg('bano-frio'),
  grounding: svg('grounding'),
  'sin-alcohol': svg('sin-alcohol'),
  'lentes-rojos': svg('lentes-rojos'),
  pasos: svg('pasos'),
  'sin-procesados': svg('sin-procesados'),
  'off-pantallas': svg('off-pantallas'),

  // ── Destinos de SALUD sin app propia ──
  sintomas: svg('sintomas'),
  diagnostico: svg('diagnostico'),
  'edad-atp': svg('edad-atp'),
  reportes: svg('reportes'),
  cronotipo: svg('cronotipo'),
  'historia-clinica': svg('historia-clinica'),
  cuestionario: svg('cuestionario'),
  evaluaciones: svg('evaluaciones'),
  padecimientos: svg('padecimientos'),
};

/** El dibujo cuando un nombre no está en el mapa. Visible, para que se note. */
export const ICON_FALLBACK: AppIconGlyph = svg('fallback');

export function glyphFor(name: string): AppIconGlyph {
  return (ICON_MAP as Record<string, AppIconGlyph>)[name] ?? ICON_FALLBACK;
}
