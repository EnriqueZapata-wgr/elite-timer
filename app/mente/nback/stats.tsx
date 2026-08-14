/**
 * Redirect legacy (OLA1 R-4, ANEXO_A_REPORTS §6).
 * Las estadísticas de N-Back son hoy /reports/nback, con sus mismas tres
 * pestañas. Esta ruta queda solo para deep links y builds OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function NBackStatsRedirect() {
  return <Redirect href="/reports/nback" />;
}
