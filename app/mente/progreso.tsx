/**
 * Redirect legacy (OLA1 R-5, ANEXO_A_REPORTS §6).
 * Las rachas y las medallas se absorbieron en /reports/adherencia, pestaña
 * Rachas: una racha es adherencia, no contenido de Mente. Esta ruta queda solo
 * para deep links y builds OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function MenteProgresoRedirect() {
  return <Redirect href="/reports/adherencia?tab=rachas" />;
}
