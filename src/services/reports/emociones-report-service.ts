/**
 * Lectura del dominio emociones (OLA1 R-2).
 *
 * El punto de esta pieza: /emotion-history y /emotion-profile llamaban CADA
 * UNA a loadHistoryData, que es la consulta más cara del pilar Mente (check-ins
 * + sueño + fuerza + cardio + ayuno + sol + fase del ciclo). Eran dos viajes
 * por el mismo dato y, entre uno y otro, dos fotos que podían no coincidir.
 * Aquí se lee UNA vez y de ahí salen el mosaico y el perfil.
 *
 * Los movimientos de navegación sí son otro dato, y van aparte. Que fallen no
 * tumba la pantalla: sin ellos la sección "moverte funciona" no se pinta, y el
 * resto sigue en pie.
 */
import { supabase } from '@/src/lib/supabase';
import { loadHistoryData, type HistoryData } from '@/src/services/emotion-history-service';
import { loadNavigationLogs } from '@/src/services/emotion-stats-service';
import type { NavEvent } from '@/src/services/emotion-stats-core';

export interface EmocionesReportData {
  history: HistoryData;
  navLogs: NavEvent[];
}

export async function loadEmocionesReport(): Promise<EmocionesReportData> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user?.id) throw new Error('sin sesión');

  const [history, navLogs] = await Promise.all([
    loadHistoryData(),
    loadNavigationLogs().catch(() => [] as NavEvent[]),
  ]);

  return { history, navLogs };
}
