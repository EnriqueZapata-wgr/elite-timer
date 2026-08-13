/**
 * Redirect legacy (Ola 2 Fitness PR3, ANEXO_B_FITNESS §5).
 * Entrenar se absorbió en /fitness-hub (hero del plan, tira de fase y
 * secundarios). Esta ruta queda solo para deep links y OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function FitnessTrainRedirect() {
  return <Redirect href="/fitness-hub" />;
}
