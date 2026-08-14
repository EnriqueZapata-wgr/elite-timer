/**
 * Lectura del dominio nback (OLA1 R-4).
 *
 * El estado es lo único obligatorio: si no se puede leer, se LANZA y el shell
 * dice que no pudimos leer. El reto y los percentiles son adornos honestos —
 * si fallan, sus tarjetas se apagan y el resumen sigue en pie. Los percentiles
 * salen de una RPC agregada (mig 218): cero filas de otros usuarios.
 */
import { supabase } from '@/src/lib/supabase';
import {
  fetchNBackState, fetchChallengeStats, fetchNBackPercentiles,
  type NBackUserState, type NBackChallengeStats, type NBackPercentiles,
} from '@/src/services/nback-service';

export interface NbackReportData {
  state: NBackUserState;
  /** null si nunca arrancó el reto, o si no se pudo leer. */
  challenge: NBackChallengeStats | null;
  /** null si la RPC no contestó: se esconde el percentil, no se inventa. */
  percentiles: NBackPercentiles | null;
}

export async function loadNbackReport(): Promise<NbackReportData> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('sin sesión');

  const state = await fetchNBackState(userId);

  const [challenge, percentiles] = await Promise.all([
    state.challenge_started_on
      ? fetchChallengeStats(userId, state.challenge_started_on).catch(() => null)
      : Promise.resolve(null),
    fetchNBackPercentiles().catch(() => null),
  ]);

  return { state, challenge, percentiles };
}
