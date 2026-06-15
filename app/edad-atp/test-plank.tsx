/**
 * Test Plank — cronómetro de plancha isométrica. Guarda segundos (motor: 180s = 100).
 */
import { StopwatchTestScreen } from '@/src/components/edad-atp/StopwatchTestScreen';

export default function TestPlankScreen() {
  return (
    <StopwatchTestScreen
      testKey="plank"
      title="Plank"
      intro="Plancha con técnica estricta: antebrazos y puntas de los pies, cuerpo en línea recta. Toca Empezar y aguanta; detén cuando rompas la forma."
      helperTitle="¿Cómo se hace el Plank?"
      helperBody={'1. Antebrazos al piso, codos bajo los hombros.\n2. Cuerpo en línea recta: cabeza, cadera y talones alineados.\n3. Abdomen y glúteos contraídos, sin hundir la cadera.\n4. Aguanta el máximo tiempo con buena forma. Detén al perder la línea.'}
      maxSeconds={600}
    />
  );
}
