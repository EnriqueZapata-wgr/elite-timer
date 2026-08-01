/**
 * AppIcon — el ÚNICO lugar donde una app se convierte en un dibujo.
 *
 *   <AppIcon name="meditar" size={24} color={ATP_BRAND.lime} />
 *
 * ⚠️ La regla que hace barato el cambio de set: **ninguna pantalla importa un
 * icono directo para representar una app.** Todas pasan por aquí. Un
 * `<Ionicons>` suelto dibujando "Meditar" es deuda: hay que traerlo al mapa.
 *
 * Los `<Ionicons>` de chrome (flechas, cerrar, chevrons, lupa) NO son apps y se
 * quedan donde están: esto es el registro de las funciones, no de la UI.
 *
 * El mapa vive aparte, en `app-icon-map.ts`: es el archivo que se sustituye
 * cuando lleguen los SVG.
 */
import { Ionicons } from '@expo/vector-icons';
import { iconFor } from './app-icon-map';

export { hasAppIcon, APP_ICON_NAMES } from './app-icon-map';

export interface AppIconProps {
  name: string;
  size?: number;
  color?: string;
}

export function AppIcon({ name, size = 24, color = '#FFFFFF' }: AppIconProps) {
  return <Ionicons name={iconFor(name)} size={size} color={color} />;
}
