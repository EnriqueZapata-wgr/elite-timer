/**
 * Redirect legacy (Ola 2 Fitness PR3, ANEXO_B_FITNESS §5).
 * HIIT es la puerta INTERVALOS del generador (presets en
 * hiit-presets-core.ts → modo timer de /session). Esta ruta queda solo
 * para deep links y OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function FitnessHiitRedirect() {
  return <Redirect href="/routine-generator?puerta=intervalos" />;
}
