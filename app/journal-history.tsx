/**
 * Redirect legacy (OLA1 R-1, ANEXO_A_REPORTS §6).
 * El historial del journal se absorbió en /reports/journal, que es LA pantalla
 * del dominio: se entra desde el hub de reportes o desde el composer, y el
 * atrás regresa por donde entraste. Esta ruta queda solo para deep links y
 * builds OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function JournalHistoryRedirect() {
  return <Redirect href="/reports/journal" />;
}
