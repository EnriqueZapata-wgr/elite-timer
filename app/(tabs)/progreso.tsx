/**
 * PROGRESO: tu avance en el programa. Tu constancia de los últimos 14 días,
 * tu cuerpo (peso, cintura, grasa), fuerza, sueño, laboratorios y reportes.
 *
 * Sala del tab bar de la app Elite DX (25-sep-2026, flags.APP_ELITE_DX). La
 * pantalla vive en src/screens/elite-dx/ProgresoScreen.tsx. En modo ATP
 * esta ruta vuelve a ser la tab vieja: un redirect a /fitness-strength
 * para deep links externos (OLA0 QW-6), hecho con RedirectLegacy (useEffect +
 * replace, G09 20-ago-2026: el componente Redirect dentro del grupo dejaba la pantalla
 * en blanco). El redirect vive fuera de este archivo para que el mapa de
 * ARGOS no confunda la sala con un alias.
 *
 * 26-sep-2026 (una app, dos modos): ya no decide la bandera sino el modo de la
 * cuenta (useEsEliteDx, ver src/services/modo-app). Una cuenta general, o
 * cualquiera con la bandera maestra apagada, ve la ATP completa y esta ruta
 * se porta como antes del 25-sep.
 */
import { useEsEliteDx } from '@/src/hooks/useModoApp';
import { ProgresoScreen } from '@/src/screens/elite-dx/ProgresoScreen';
import { RedirectLegacy } from '@/src/screens/elite-dx/RedirectLegacy';

export default function ProgresoTab() {
  const eliteDx = useEsEliteDx();
  return eliteDx ? <ProgresoScreen /> : <RedirectLegacy a="/fitness-strength" />;
}
