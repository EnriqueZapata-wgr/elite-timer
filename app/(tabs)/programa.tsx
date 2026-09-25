/**
 * MI PROGRAMA: tu programa con Enrique. Tu evaluación, tu plan de alimentación, suplementos y entrenamiento, lo que va con tu médico, tus estudios y tu expediente.
 *
 * Sala del tab bar de la app Elite DX (25-sep-2026, flags.APP_ELITE_DX). La
 * pantalla vive en src/screens/elite-dx/MiProgramaScreen.tsx. Con la bandera apagada
 * la sala no existe: la ruta manda a HOY (revisión en frío, 25-sep: sin esto
 * un enlace viejo abría la pantalla Elite a cualquier cuenta).
 */
import { APP_ELITE_DX } from '@/src/constants/flags';
import { MiProgramaScreen } from '@/src/screens/elite-dx/MiProgramaScreen';
import { RedirectLegacy } from '@/src/screens/elite-dx/RedirectLegacy';

export default function ProgramaTab() {
  return APP_ELITE_DX ? <MiProgramaScreen /> : <RedirectLegacy a="/" />;
}
