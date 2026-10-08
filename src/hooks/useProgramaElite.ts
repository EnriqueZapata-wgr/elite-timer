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
 * 8-oct-2026 (nivel 2): el estado 'ok' trae ademas `nombre` y `tipo` del
 * documento vigente, y `porEmpezar`. El inicio que el coach declaro manda
 * sobre la primera carga. Si ese inicio todavia no llega, `porEmpezar` trae
 * la fecha y los dias que faltan y `avance` es null: QUIEN PINTA tiene que
 * mirar `porEmpezar` ANTES de leer `avance === null` como "fecha ilegible".
 *
 * Relee al volver a la pestana y cuando la evaluacion cambia (carga nueva o
 * Reintentar en otra pantalla).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { fetchInicioProgramaElite } from '@/src/services/elite/evaluacion-elite-service';
import type { EliteTipo } from '@/src/services/elite/elite-v3-core';
import { situacionDelPrograma, type AvancePrograma, type PorEmpezar } from '@/src/services/elite/programa-elite-core';
import { EVALUACION_ELITE_CHANGED_EVENT } from '@/src/services/hoy/elite-hoy-service';
import { getLocalToday, toLocalDateString } from '@/src/utils/date-helpers';

export type EstadoProgramaElite =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'sin_evaluacion' }
  | {
      estado: 'ok';
      avance: AvancePrograma | null;
      /** YYYY-MM-DD desde donde se cuenta (declarado o primera carga); '' si no se pudo leer. */
      inicio: string;
      /** Nombre del programa en el documento vigente; null si no trae. */
      nombre: string | null;
      /** 'elite' tambien para todo documento anterior al nivel 2. */
      tipo: EliteTipo;
      /** No null solo cuando el coach declaro un inicio que todavia no llega. */
      porEmpezar: PorEmpezar | null;
    };

export function useProgramaElite(userId: string | undefined): {
  programa: EstadoProgramaElite;
  recargar: () => void;
} {
  const [programa, setPrograma] = useState<EstadoProgramaElite>({ estado: 'cargando' });
  const vivo = useRef(true);
  // 8-oct-2026 (nivel 2, revision en frio): la cuenta duena de lo que hay en
  // pantalla. Al cambiar de cuenta se vuelve a 'cargando' y una lectura de la
  // anterior que llegue tarde se descarta: un fallo de la nueva nunca deja a
  // la vista el nombre ni el tipo del programa de otra persona.
  const cuenta = useRef(userId);
  useEffect(() => {
    if (cuenta.current === userId) return;
    cuenta.current = userId;
    setPrograma({ estado: 'cargando' });
  }, [userId]);
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
    if (!vivo.current || cuenta.current !== userId) return;
    if (r.estado === 'error') {
      // Un fallo no borra lo que ya se veia: solo se reporta si no habia nada.
      setPrograma((prev) => (prev.estado === 'ok' ? prev : { estado: 'error' }));
      return;
    }
    if (!r.inicio) { setPrograma({ estado: 'sin_evaluacion' }); return; }
    const fecha = new Date(r.inicio);
    const primeraCarga = Number.isNaN(fecha.getTime()) ? '' : toLocalDateString(fecha);
    // 8-oct-2026 (nivel 2): cual fecha manda y si ya empezo se decide en puro.
    const situacion = situacionDelPrograma({
      declarado: r.inicioDeclarado,
      primeraCarga,
      hoy: getLocalToday(),
      programaSemanas: r.programaSemanas,
    });
    setPrograma({
      estado: 'ok',
      inicio: situacion?.inicio ?? '',
      avance: situacion?.avance ?? null,
      porEmpezar: situacion?.porEmpezar ?? null,
      nombre: r.nombre,
      tipo: r.tipo,
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
