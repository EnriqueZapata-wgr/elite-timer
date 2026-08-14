/**
 * Redirect legacy (OLA1 R-3, ANEXO_A_REPORTS §6).
 * El historial de ciclos es hoy la pestaña Ciclos de /reports/ciclo. El guard
 * de acceso vive en el dominio, así que este enlace tampoco abre ciclo a quien
 * no le toca. Solo deep links y builds OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function CycleHistoryRedirect() {
  return <Redirect href="/reports/ciclo?tab=ciclos" />;
}
