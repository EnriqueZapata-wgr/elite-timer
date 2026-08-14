/**
 * Redirect legacy (OLA1 R-3, ANEXO_A_REPORTS §6).
 * Las gráficas del ciclo son hoy la pestaña Gráficas de /reports/ciclo. El
 * guard de acceso vive en el dominio. Solo deep links y builds OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function CycleChartsRedirect() {
  return <Redirect href="/reports/ciclo?tab=graficas" />;
}
