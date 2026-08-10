/**
 * /health-hub — la misma SALUD, empujada como pantalla.
 *
 * MB-19 PIEZA 3: el menú de ocho cards se reorganizó por horizontes y el
 * contenido se mudó a SaludHub, que comparte con el tab SALUD. Esta ruta se
 * conserva viva porque tiene puertas propias (Ajustes › Salud y la card de
 * sueño del HOY) y porque puede haber deep links apuntando aquí.
 *
 * Diferencia con el tab: esta lleva header con botón de regresar, porque a
 * esta se llega desde otro lado.
 */
import { StatusBar } from 'expo-status-bar';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { SaludHub } from '@/src/screens/salud/SaludHub';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { useAppTheme } from '@/src/contexts/theme-context';

export default function HealthHubScreen() {
  // MB-31B remate: SaludHub migró — la montura declara themed y pone su barra.
  const { kind } = useAppTheme();
  return (
    <MedicalDisclaimerGate>
      <Screen themed>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <PillarHeader pillar="health" title="Salud" />
        <SaludHub />
      </Screen>
    </MedicalDisclaimerGate>
  );
}
