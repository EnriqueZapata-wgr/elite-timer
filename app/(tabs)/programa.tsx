/**
 * MI PROGRAMA: tu programa con Enrique. Tu evaluación, tu plan de alimentación, suplementos y entrenamiento, lo que va con tu médico, tus estudios y tu expediente.
 *
 * Sala del tab bar de la app Elite DX (25-sep-2026, flags.APP_ELITE_DX). La
 * pantalla vive en src/screens/elite-dx/MiProgramaScreen.tsx. En modo ATP
 * la sala no existe: la ruta manda a HOY (revisión en frío, 25-sep: sin esto
 * un enlace viejo abría la pantalla Elite a cualquier cuenta).
 *
 * 26-sep-2026 (una app, dos modos): ya no decide la bandera sino el modo de la
 * cuenta (useEsEliteDx, ver src/services/modo-app). Una cuenta general, o
 * cualquiera con la bandera maestra apagada, ve la ATP completa y esta ruta
 * se porta como antes del 25-sep.
 *
 * 8-oct-2026 (v4): en la presentacion v4 esta ruta es PLAN. La ruta pone el
 * <TabScreen themed> y la StatusBar; PlanV4Screen es solo el contenido (a
 * diferencia de MiProgramaScreen, que trae su propio TabScreen). Fuera de la
 * v4, igual que antes.
 */
import { StatusBar } from 'expo-status-bar';
import { useEsEliteDx, useEsV4 } from '@/src/hooks/useModoApp';
import { MiProgramaScreen } from '@/src/screens/elite-dx/MiProgramaScreen';
import { RedirectLegacy } from '@/src/screens/elite-dx/RedirectLegacy';
import { TabScreen } from '@/src/components/ui/TabScreen';
import { PlanV4Screen } from '@/src/screens/v4/PlanV4Screen';
import { useAppTheme } from '@/src/contexts/theme-context';

export default function ProgramaTab() {
  const eliteDx = useEsEliteDx();
  const v4 = useEsV4();
  if (v4) return <PlanV4Tab />;
  return eliteDx ? <MiProgramaScreen /> : <RedirectLegacy a="/" />;
}

/** 8-oct-2026 (v4): PLAN. Lee el tema GLOBAL (la ruta abre el scope themed). */
function PlanV4Tab() {
  const t = useAppTheme().tokens;
  return (
    <TabScreen themed>
      <StatusBar style={t.kind === 'light' ? 'dark' : 'light'} />
      <PlanV4Screen />
    </TabScreen>
  );
}
