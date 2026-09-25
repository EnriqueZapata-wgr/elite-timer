/**
 * useProgramaElite (25-sep-2026, app Elite DX): en que semana del programa va
 * el cliente. Lo usan HOY y MI PROGRAMA.
 *
 * Estados (regla 13, nunca un hueco presentado como cero):
 *  - 'cargando'
 *  - 'sin_evaluacion': la lectura funciono y Enrique todavia no carga nada.
 *  - 'error': no se pudo leer. La pantalla ofrece Reintentar; NUNCA dice
 *    "no tienes evaluacion", porque quien lo lee acaba de pagar.
 *  - 'ok': con su avance. `avance` null solo si la fecha guardada no se
 *    puede leer, y entonces se pinta el programa sin semana, no una inventada.
 *
 * Relee al volver a la pestana y cuando la evaluacion cambia (carga nueva o
 * Reintentar en otra pantalla).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { fetchInicioProgramaElite } from '@/src/services/elite/evaluacion-elite-service';
import { avanceDelPrograma, type AvancePrograma } from '@/src/services/elite/programa-elite-core';
import { EVALUACION_ELITE_CHANGED_EVENT } from '@/src/services/hoy/elite-hoy-service';
import { getLocalToday, toLocalDateString } from '@/src/utils/date-helpers';

export type EstadoProgramaElite =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'sin_evaluacion' }
  | { estado: 'ok'; avance: AvancePrograma | null; inicio: string };

export function useProgramaElite(userId: string | undefined): {
  programa: EstadoProgramaElite;
  recargar: () => void;
} {
  const [programa, setPrograma] = useState<EstadoProgramaElite>({ estado: 'cargando' });
  const vivo = useRef(true);
  // Revision en frio (25-sep): se vuelve a encender al montar. Con StrictMode
  // o Fast Refresh el efecto corre, se limpia y corre otra vez; sin esto
  // `vivo` quedaba en false y el header se quedaba en blanco para siempre.
  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; };
  }, []);

  const cargar = useCallback(async () => {
    if (!userId) return;
    const r = await fetchInicioProgramaElite(userId);
    if (!vivo.current) return;
    if (r.estado === 'error') {
      // Un fallo no borra lo que ya se veia: solo se reporta si no habia nada.
      setPrograma((prev) => (prev.estado === 'ok' ? prev : { estado: 'error' }));
      return;
    }
    if (!r.inicio) { setPrograma({ estado: 'sin_evaluacion' }); return; }
    const fecha = new Date(r.inicio);
    const inicio = Number.isNaN(fecha.getTime()) ? '' : toLocalDateString(fecha);
    setPrograma({
      estado: 'ok',
      inicio,
      avance: inicio ? avanceDelPrograma(inicio, getLocalToday(), r.programaSemanas) : null,
    });
  }, [userId]);

  const recargar = useCallback(() => {
    // Sin sesion no hay que leer: no se pasa a 'cargando' para no dejar un
    // hueco sin salida.
    if (!userId) return;
    setPrograma((prev) => (prev.estado === 'error' ? { estado: 'cargando' } : prev));
    cargar();
  }, [cargar, userId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(EVALUACION_ELITE_CHANGED_EVENT, (p?: { userId?: string }) => {
      if (p?.userId && userId && p.userId !== userId) return;
      cargar();
    });
    return () => sub.remove();
  }, [cargar, userId]);

  return { programa, recargar };
}
