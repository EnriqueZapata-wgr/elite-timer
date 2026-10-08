/**
 * usePlanV4 (8-oct-2026 (v4), Fase A): la semana del plan para PLAN v4 y para
 * la hilera "Recomendadas por tu plan". Misma disciplina que Mi plan:
 *  - una lectura completa al enfocar (compartida y con cache corta en
 *    plan-v4-service: brincar entre PLAN y Apps no vuelve a pedir todo);
 *  - cada parte llega con su desenlace y un fallo no borra lo ya leido
 *    (fusionarInsumos); una lectura vieja no pinta encima de una nueva
 *    (partesVigentes);
 *  - tope de 10 s: sin lectura a tiempo se dice, nunca un hueco eterno;
 *  - "hoy" y la hora se vuelven a leer al enfocar y al volver al frente.
 * Relee las practicas cuando se pausa o enciende una, y la evaluacion cuando
 * cambia el documento.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { INTERVENTIONS_CHANGED_EVENT } from '@/src/services/interventions/intervention-service';
import { EVALUACION_ELITE_CHANGED_EVENT } from '@/src/services/hoy/elite-hoy-service';
import { TOPE_HERO_ELITE_MS } from '@/src/services/hoy/elite-hoy-core';
import {
  fusionarInsumos, PARTES_TODAS, partesVigentes, type InsumosPlan, type ParteKey,
} from '@/src/services/plan/mi-plan-core';
import { leerPlanSemana, releerPartes } from '@/src/services/plan/plan-v4-service';
import { getLocalToday } from '@/src/utils/date-helpers';

function minutosDeAhora(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export interface PlanV4Estado {
  insumos: InsumosPlan | null;
  /** La primera lectura no llego a tiempo. */
  vencido: boolean;
  hoy: string;
  ahoraMin: number;
  refrescando: boolean;
  /** Marcas de lo que se esta releyendo por un Reintentar ('todo' o la llave de un pilar). */
  releyendo: readonly string[];
  /** Jalar hacia abajo: todo, saltando caches. */
  refrescar: () => Promise<void>;
  /** Reintentar: relee `partes` (todas si no se dice) marcando `marca` mientras llega. */
  reintentar: (marca: string, partes?: readonly ParteKey[]) => Promise<void>;
}

export function usePlanV4(userId: string | undefined): PlanV4Estado {
  const [insumos, setInsumos] = useState<InsumosPlan | null>(null);
  const [vencido, setVencido] = useState(false);
  const [hoy, setHoy] = useState(() => getLocalToday());
  const [ahoraMin, setAhoraMin] = useState(() => minutosDeAhora());
  const [refrescando, setRefrescando] = useState(false);
  const [releyendo, setReleyendo] = useState<readonly string[]>([]);
  const vivo = useRef(true);
  const tope = useRef<ReturnType<typeof setTimeout> | null>(null);
  const yaCargo = useRef(false);
  const cuenta = useRef(userId);
  cuenta.current = userId;
  const turno = useRef(0);
  const ultimoTurno = useRef<Partial<Record<ParteKey, number>>>({});

  const limpiarTope = useCallback(() => {
    if (tope.current) { clearTimeout(tope.current); tope.current = null; }
  }, []);
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; limpiarTope(); }; }, [limpiarTope]);
  // Otra cuenta en el mismo telefono no hereda el plan de la anterior.
  useEffect(() => {
    setInsumos(null);
    setVencido(false);
    setReleyendo([]);
    yaCargo.current = false;
    ultimoTurno.current = {};
  }, [userId]);

  const cargar = useCallback(async (partes?: readonly ParteKey[], forzar = false) => {
    if (!userId) return;
    if (!partes) {
      limpiarTope();
      tope.current = setTimeout(() => {
        tope.current = null;
        if (vivo.current) setVencido(true);
      }, TOPE_HERO_ELITE_MS);
    }
    const mio = ++turno.current;
    for (const k of partes ?? PARTES_TODAS) ultimoTurno.current[k] = mio;
    const leido = partes ? await releerPartes(userId, partes) : await leerPlanSemana(userId, { forzar });
    if (!vivo.current || cuenta.current !== userId) return;
    if (!partes) { limpiarTope(); setVencido(false); yaCargo.current = true; }
    const vigente = partesVigentes(leido, ultimoTurno.current, mio);
    setInsumos((prev) => fusionarInsumos(prev ?? {}, vigente));
  }, [userId, limpiarTope]);

  const alDia = useCallback(() => {
    const ahora = getLocalToday();
    setHoy((prev) => (prev === ahora ? prev : ahora));
    setAhoraMin(minutosDeAhora());
  }, []);
  useFocusEffect(useCallback(() => { alDia(); cargar(); }, [alDia, cargar]));
  useEffect(() => {
    const subA = AppState.addEventListener('change', (e) => { if (e === 'active') alDia(); });
    const subP = DeviceEventEmitter.addListener(INTERVENTIONS_CHANGED_EVENT, () => {
      if (yaCargo.current) cargar(['practicas']);
    });
    const subE = DeviceEventEmitter.addListener(EVALUACION_ELITE_CHANGED_EVENT, (p?: { userId?: string }) => {
      if (p?.userId && userId && p.userId !== userId) return;
      if (yaCargo.current) cargar(['evaluacion']);
    });
    return () => { subA.remove(); subP.remove(); subE.remove(); };
  }, [alDia, cargar, userId]);

  const refrescar = useCallback(async () => {
    setRefrescando(true);
    alDia();
    await cargar(undefined, true);
    if (vivo.current) setRefrescando(false);
  }, [alDia, cargar]);

  const reintentar = useCallback(async (marca: string, partes?: readonly ParteKey[]) => {
    setReleyendo((prev) => (prev.includes(marca) ? prev : [...prev, marca]));
    if (!partes) setVencido(false);
    await cargar(partes, true);
    if (vivo.current) setReleyendo((prev) => prev.filter((m) => m !== marca));
  }, [cargar]);

  return { insumos, vencido, hoy, ahoraMin, refrescando, releyendo, refrescar, reintentar };
}
