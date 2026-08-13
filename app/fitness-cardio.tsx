/**
 * Redirect legacy (Ola 2 Fitness PR3, ANEXO_B_FITNESS §5).
 * El cardio completo vive en /log-cardio (disciplinas, PRs por distancia,
 * manual y fase de importación). Esta ruta queda solo para deep links y
 * OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function FitnessCardioRedirect() {
  return <Redirect href="/log-cardio" />;
}
