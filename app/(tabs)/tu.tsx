/**
 * TÚ: tu cuenta. Tu servicio contratado y su vigencia, escribirle a Enrique, tus herramientas (respiración, ayuno, comida, entrenar...) y ajustes.
 *
 * Sala del tab bar de la app Elite DX (25-sep-2026, flags.APP_ELITE_DX). La
 * pantalla vive en src/screens/elite-dx/TuScreen.tsx. Con la bandera apagada
 * la sala no existe: la ruta manda a HOY (revisión en frío, 25-sep: sin esto
 * un enlace viejo abría la pantalla Elite a cualquier cuenta).
 */
import { APP_ELITE_DX } from '@/src/constants/flags';
import { TuScreen } from '@/src/screens/elite-dx/TuScreen';
import { RedirectLegacy } from '@/src/screens/elite-dx/RedirectLegacy';

export default function TuTab() {
  return APP_ELITE_DX ? <TuScreen /> : <RedirectLegacy a="/" />;
}
