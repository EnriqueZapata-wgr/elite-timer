/**
 * Redirect legacy (Ola 2 Fitness PR3, ANEXO_B_FITNESS §5).
 * El import Health es la fase ?fase=importar de /log-cardio
 * (CardioImportFlow conserva las 7 fases íntegras). Esta ruta queda solo
 * para deep links y OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function CardioImportRedirect() {
  return <Redirect href="/log-cardio?fase=importar" />;
}
