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
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
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
  /** FIX-215: alguna de las consultas falló. El hub tiene que poder decirlo. */
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    // FIX-215: userId indefinido NO es "cero completados", es "todavía no sé".
    // La sesión sale de SecureStore y es asíncrona, así que al arranque en frío
    // este hook corre una primera vez sin usuario. Si aquí apagáramos loading,
    // el hub pintaría un contador en cero durante esa ventana, que es justo la
    // mentira que este fix cierra. Se queda cargando hasta que haya usuario.
    if (!userId) return;
    let hubo = false;
    try {
      const queries = completionQueries();
      const results = await Promise.all(
        queries.map(async (q) => {
          try {
            // FIX-215: `error` se leía y se tiraba. PostgREST no lanza: devuelve
            // { data: null, error }. Sin esto un RLS mal puesto o una tabla caída
            // se veían idénticos a "no has hecho nada", sin rastro en ningún log.
            const { data, error } = await supabase
              .from(q.table)
              .select(q.columns.join(', '))
              .eq('user_id', userId);
            if (error) {
              hubo = true;
              logWarn(`useAssessmentCompletion: ${q.table} no se pudo leer`, error);
              return [q.table, [] as Row[]] as const;
            }
            return [q.table, (data ?? []) as unknown as Row[]] as const;
          } catch (e) {
            // Una tabla que falle no debe tumbar el hub completo, pero sí se dice.
            hubo = true;
            logWarn(`useAssessmentCompletion: ${q.table} reventó`, e);
            return [q.table, [] as Row[]] as const;
          }
        }),
      );
      setMap(reduceCompletion(Object.fromEntries(results)));
    } catch (e) {
      hubo = true;
      logWarn('useAssessmentCompletion: la lectura completa reventó', e);
    } finally {
      setFailed(hubo);
      setLoading(false);
    }
  }, [userId]);

  // Usuario nuevo (o sesión que por fin resuelve) → el mapa anterior no vale.
  useEffect(() => { setLoading(true); }, [userId]);

  useEffect(() => {
    const subs = REFRESH_EVENTS.map((e) => DeviceEventEmitter.addListener(e, refresh));
    return () => subs.forEach((s) => s.remove());
  }, [refresh]);

  // FIX-215: la lectura cuelga del FOCO, no del mount. Dos razones. Una, los
  // tests físicos, los de Edad ATP y la historia clínica escriben sin emitir
  // ninguno de los cuatro eventos de arriba, así que volver al hub tras
  // terminar uno dejaba el contador viejo. Dos, expo-router deja montadas las
  // pantallas del back-stack: colgarlo del mount es justo lo que no se entera.
  // Cubre también el mount inicial, así que no hay doble consulta.
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return { completion: map, loading, failed, refresh };
}
