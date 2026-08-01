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
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { SaludHub } from '@/src/screens/salud/SaludHub';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';

export default function HealthHubScreen() {
  return (
    <MedicalDisclaimerGate>
      <Screen>
        <PillarHeader pillar="health" title="Salud" />
        <SaludHub />
      </Screen>
    </MedicalDisclaimerGate>
  );
}
