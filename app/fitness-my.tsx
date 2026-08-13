/**
 * Redirect legacy (Ola 2 Fitness PR3, ANEXO_B_FITNESS §5).
 * Mi Fitness se absorbió en /fitness-hub (secciones REGISTRAR / EXPLORAR /
 * MI FITNESS). Esta ruta queda solo para deep links y OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function FitnessMyRedirect() {
  return <Redirect href="/fitness-hub" />;
}
