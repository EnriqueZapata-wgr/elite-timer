/**
 * app-icon-map — EL archivo que se cambia el día que lleguen los SVG.
 *
 * Una línea por nombre lógico: nombre → COMPONENTE que lo dibuja. Hoy casi
 * todos son envoltorios de un Ionicon de relleno, a propósito: Enrique
 * resuelve el set (Phosphor) en paralelo y este run entrega el enchufe, no el
 * icono definitivo. Cuando lleguen, se sustituyen los `ion(...)` por los
 * componentes SVG y los iconos cambian TODOS a la vez, sin tocar pantallas.
 *
 * Dos entradas ya son SVG reales (`emociones`, `rm`) y son el caso de prueba
 * del footgun de color: el set que viene pinta con `fill="currentColor"`,
 * pero los dibujados a mano pintan con `stroke="currentColor"`. El contrato
 * de un glifo es: recibe `{ size, color }` y ese ÚNICO color tiene que entrar
 * por fill Y por stroke (via `color` en el root del Svg + `currentColor`).
 * Un glifo que solo respete una de las dos propiedades sale invisible.
 *
 * La lista de nombres vive aparte (`app-icon-names.ts`, datos puros) para que
 * los tests node verifiquen cobertura sin montar React Native. TypeScript
 * exige aquí una entrada por nombre: agregar un nombre sin dibujo no compila.
 */
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { AppIconName } from './app-icon-names';
import { IconEmociones } from './icons/IconEmociones';
import { Icon1Rm } from './icons/Icon1Rm';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Lo único que recibe un glifo. Con esto tiene que pintarse completo. */
export interface AppIconGlyphProps {
  size: number;
  color: string;
}

export type AppIconGlyph = (props: AppIconGlyphProps) => React.JSX.Element;

/** Envoltorio del Ionicon de relleno. Se borra del mapa el día del montaje. */
function ion(name: IoniconName): AppIconGlyph {
  const Glyph: AppIconGlyph = ({ size, color }) => (
    <Ionicons name={name} size={size} color={color} />
  );
  return Glyph;
}

export const ICON_MAP: Record<AppIconName, AppIconGlyph> = {
  // ── Mente ──
  meditar: ion('flower-outline'),
  respirar: ion('cloud-outline'),
  emociones: IconEmociones,
  journal: ion('book-outline'),
  sueno: ion('moon-outline'),
  nback: ion('grid-outline'),
  rachas: ion('medal-outline'),

  // ── Cuerpo ──
  entrenar: ion('barbell-outline'),
  cardio: ion('pulse-outline'),
  movilidad: ion('body-outline'),
  rm: Icon1Rm,
  records: ion('ribbon-outline'),

  // ── Hábitos diarios ──
  comida: ion('restaurant-outline'),
  hidratacion: ion('water-outline'),
  ayuno: ion('hourglass-outline'),
  suplementos: ion('medkit-outline'),
  recetas: ion('reader-outline'),
  'lista-compra': ion('cart-outline'),

  // ── Salud ──
  sol: ion('sunny-outline'),
  glucosa: ion('analytics-outline'),
  cetonas: ion('flame-outline'),
  ciclo: ion('ellipse-outline'),
  labs: ion('flask-outline'),
  protocolos: ion('clipboard-outline'),

  // ── Sistema ──
  ajustes: ion('settings-outline'),

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
