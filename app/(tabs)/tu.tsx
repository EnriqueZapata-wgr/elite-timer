/**
 * TÚ: tu cuenta. Tu servicio contratado y su vigencia, escribirle a Enrique, tus herramientas (respiración, ayuno, comida, entrenar...) y ajustes.
 *
 * Sala del tab bar de la app Elite DX (25-sep-2026, flags.APP_ELITE_DX). La
 * pantalla vive en src/screens/elite-dx/TuScreen.tsx. En modo ATP
 * la sala no existe: la ruta manda a HOY (revisión en frío, 25-sep: sin esto
 * un enlace viejo abría la pantalla Elite a cualquier cuenta).
 *
 * 26-sep-2026 (una app, dos modos): ya no decide la bandera sino el modo de la
 * cuenta (useEsEliteDx, ver src/services/modo-app). Una cuenta general, o
 * cualquiera con la bandera maestra apagada, ve la ATP completa y esta ruta
 * se porta como antes del 25-sep.
 */
import { useEsEliteDx } from '@/src/hooks/useModoApp';
import { TuScreen } from '@/src/screens/elite-dx/TuScreen';
import { RedirectLegacy } from '@/src/screens/elite-dx/RedirectLegacy';

export default function TuTab() {
  const eliteDx = useEsEliteDx();
  return eliteDx ? <TuScreen /> : <RedirectLegacy a="/" />;
}
