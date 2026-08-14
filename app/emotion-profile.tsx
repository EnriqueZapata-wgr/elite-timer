/**
 * Redirect legacy (OLA1 R-2, ANEXO_A_REPORTS §6).
 * El perfil emocional es hoy la pestaña Perfil de /reports/emociones. Se
 * conserva el destino exacto: quien tenía guardado este enlace sigue cayendo
 * en el perfil, no en el mosaico.
 */
import { Redirect } from 'expo-router';

export default function EmotionProfileRedirect() {
  return <Redirect href="/reports/emociones?section=perfil" />;
}
