/**
 * Redirect legacy (OLA5 pieza 1, ANEXO_D §2).
 * Explorar el territorio dejó de ser otra pantalla: es el modo explorar del
 * check-in, sobre el mismo plano 12x12. Así "ES LO QUE SIENTO" ya no remonta
 * el plano ni tira el zoom del usuario. Esta ruta queda solo para deep links y
 * builds OTA viejos.
 */
import { Redirect } from 'expo-router';

export default function EmotionExplorationRedirect() {
  return <Redirect href="/checkin?mode=explore" />;
}
