/**
 * Redirect legacy (OLA1 R-2, ANEXO_A_REPORTS §6).
 * El historial emocional y el perfil se absorbieron en /reports/emociones, una
 * sola pantalla con pestañas Mosaico y Perfil. Esta ruta queda solo para deep
 * links y builds OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function EmotionHistoryRedirect() {
  return <Redirect href="/reports/emociones" />;
}
