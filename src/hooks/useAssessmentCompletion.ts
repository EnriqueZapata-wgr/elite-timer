/**
 * OLA 4 · useAssessmentCompletion (Anexo C, pieza 2).
 *
 * Lee de un jalón el estado de completado de TODAS las evaluaciones: una
 * consulta por tabla, no una por evaluación. Sustituye las seis versiones
 * caseras que hoy viven repartidas en los hubs.
 *
 * La lógica que decide qué cuenta como completado vive en
 * services/assessments/completion.ts, que es puro y sí se testea.
 */
import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import {
  completionQueries,
  reduceCompletion,
  type CompletionMap,
  type Row,
} from '@/src/services/assessments/completion';

/** Eventos que dejan obsoleto el estado del hub. */
const REFRESH_EVENTS = [
  'electrons_changed',
  'chronotype_changed',
  'master_quiz_changed',
  'fototipo_changed',
];

export function useAssessmentCompletion(userId?: string) {
  const [map, setMap] = useState<CompletionMap>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const queries = completionQueries();
      const results = await Promise.all(
        queries.map(async (q) => {
          try {
            const { data } = await supabase
              .from(q.table)
              .select(q.columns.join(', '))
              .eq('user_id', userId);
            return [q.table, (data ?? []) as unknown as Row[]] as const;
          } catch {
            // Una tabla que falle no debe tumbar el hub completo.
            return [q.table, [] as Row[]] as const;
          }
        }),
      );
      setMap(reduceCompletion(Object.fromEntries(results)));
    } catch {
      /* el hub se pinta igual, solo sin palomitas */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    const subs = REFRESH_EVENTS.map((e) => DeviceEventEmitter.addListener(e, refresh));
    return () => subs.forEach((s) => s.remove());
  }, [refresh]);

  return { completion: map, loading, refresh };
}
