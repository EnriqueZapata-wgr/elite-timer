/**
 * AppIcon — el ÚNICO lugar donde una función de la app se convierte en dibujo.
 *
 *   <AppIcon name="meditar" size={24} color={ATP_BRAND.lime} />
 *
 * ⚠️ La regla que hace barato el cambio de set: **ninguna pantalla importa un
 * icono directo para representar una función.** Todas pasan por aquí. Un
 * `<Ionicons>` suelto dibujando "Meditar" es deuda: hay que traerlo al mapa.
 *
 * Los `<Ionicons>` de chrome (flechas, cerrar, chevrons, lupa) NO son
 * funciones y se quedan donde están.
 *
 * `name` está tipado contra la lista real: `<AppIcon name="meditarr" />` ya no
 * compila (antes pintaba un signo de interrogación en silencio). El fallback
 * runtime sigue existiendo para los datos que llegan como string.
 *
 * El mapa vive aparte, en `app-icon-map.tsx`: es el archivo que se sustituye
 * cuando lleguen los SVG. El color entra por fill Y por stroke (ver contrato
 * de glifo ahí mismo).
 */
import { glyphFor } from './app-icon-map';
import type { AppIconName } from './app-icon-names';

export { hasAppIcon, APP_ICON_NAMES } from './app-icon-names';
export type { AppIconName } from './app-icon-names';

export interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
}

export function AppIcon({ name, size = 24, color = '#FFFFFF' }: AppIconProps) {
  const Glyph = glyphFor(name);
  return <Glyph size={size} color={color} />;
}
