/**
 * Test BOLT — Body Oxygen Level Test (tolerancia al CO2). Guarda segundos (motor: 40s = 100).
 */
import { StopwatchTestScreen } from '@/src/components/edad-atp/StopwatchTestScreen';

export default function TestBoltScreen() {
  return (
    <StopwatchTestScreen
      testKey="bolt"
      title="BOLT"
      intro="Mide tu tolerancia al CO2 (control respiratorio). Respira normal, exhala normal, tápate la nariz y toca Empezar. Detén a la PRIMERA urgencia de respirar — no aguantes al máximo."
      helperTitle="¿Qué mide el BOLT?"
      helperBody={'El BOLT estima tu tolerancia al CO2 y la eficiencia de tu respiración.\n\n1. Siéntate y respira normal un minuto.\n2. Tras una exhalación NORMAL (no forzada), tápate la nariz.\n3. Cronometra hasta la PRIMERA señal real de querer respirar (no el máximo aguante).\n4. Suelta y respira normal. >40s = excelente; <20s = mejorable.'}
      maxSeconds={120}
    />
  );
}
