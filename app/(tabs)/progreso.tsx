/**
 * PROGRESO: tu avance en el programa. Tu constancia de los últimos 14 días,
 * tu cuerpo (peso, cintura, grasa), fuerza, sueño, laboratorios y reportes.
 *
 * Sala del tab bar de la app Elite DX (25-sep-2026, flags.APP_ELITE_DX). La
 * pantalla vive en src/screens/elite-dx/ProgresoScreen.tsx. Con la bandera
 * apagada esta ruta vuelve a ser la tab vieja: un redirect a /fitness-strength
 * para deep links externos (OLA0 QW-6), hecho con RedirectLegacy (useEffect +
 * replace, G09 20-ago-2026: el componente Redirect dentro del grupo dejaba la pantalla
 * en blanco). El redirect vive fuera de este archivo para que el mapa de
 * ARGOS no confunda la sala con un alias.
 */
import { APP_ELITE_DX } from '@/src/constants/flags';
import { ProgresoScreen } from '@/src/screens/elite-dx/ProgresoScreen';
import { RedirectLegacy } from '@/src/screens/elite-dx/RedirectLegacy';

export default function ProgresoTab() {
  return APP_ELITE_DX ? <ProgresoScreen /> : <RedirectLegacy a="/fitness-strength" />;
}
