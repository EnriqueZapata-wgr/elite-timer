/**
 * usePerfilDatos (8-oct-2026 (v4)): lo que el PERFIL de la v4 necesita leer.
 *
 *  - El documento vigente, con la MISMA lectura compartida de HOY y MI
 *    PROGRAMA (leerEvaluacionEliteVigente: promesa en vuelo y cache de 60 s).
 *    Relee con EVALUACION_ELITE_CHANGED_EVENT y al volver a la pestana (pega
 *    a la cache: no agrega viajes). Un fallo despues de una lectura buena no
 *    borra lo que ya se sabia (igual que useLecturaDocumento).
 *  - Suplementos y practicas activos (perfil-service), solo cuando hay
 *    documento con evaluacion: son para "Lo mueve en tu plan". Cada parte
 *    puede fallar sola; el Perfil no se apaga por eso.
 *    8-oct-2026 (v4, revision en frio): si una parte no se pudo leer, se
 *    relee al volver a la pestana, y hay un Reintentar solo para el plan
 *    (reintentarPlan) que no vuelve a pedir el documento.
 *  - Toda respuesta tardia se descarta si la cuenta ya cambio (cuenta.current),
 *    igual que usePlanV4: otra cuenta en el mismo telefono no hereda nada.
 *  - El nivel de la cuenta, solo cuando no hay documento leido (sin
 *    documento o no se pudo leer): decide si la tarjeta dice "tu evaluación"
 *    o "tu programa" (vozParaTextos). Una lectura, una vez.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/src/contexts/auth-context';
import {
  EVALUACION_ELITE_CHANGED_EVENT, leerEvaluacionEliteVigente, type LecturaEvaluacionVigente,
} from '@/src/services/hoy/elite-hoy-service';
import { leerPlanParaPerfil, type PlanParaPerfil } from '@/src/services/perfil/perfil-service';
import { fetchEffectiveTier } from '@/src/services/subscription/subscription-service';
import type { Tier } from '@/src/services/subscription/tier-logic';
import { tieneDiagnostico } from '@/src/services/elite/elite-v3-core';

export interface DatosPerfil {
  userId: string | undefined;
  /** null mientras lee la primera vez. */
  lectura: LecturaEvaluacionVigente | null;
  /** null mientras lee (o si no aplica). */
  plan: PlanParaPerfil | null;
  tier: Tier | null;
  nombrePerfil: string | null;
  reintentando: boolean;
  reintentar: () => void;
  /** Relee solo suplementos y practicas (el aviso de "Lo mueve en tu plan"). */
  reintentarPlan: () => void;
  reintentandoPlan: boolean;
}

export function usePerfilDatos(): DatosPerfil {
  const { user } = useAuth();
  const userId = user?.id;
  const meta = (user?.user_metadata ?? {}) as { full_name?: unknown; name?: unknown };
  const nombrePerfil = typeof meta.full_name === 'string' ? meta.full_name
    : typeof meta.name === 'string' ? meta.name : null;

  const [lectura, setLectura] = useState<LecturaEvaluacionVigente | null>(null);
  const [plan, setPlan] = useState<PlanParaPerfil | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [reintentando, setReintentando] = useState(false);
  const [reintentandoPlan, setReintentandoPlan] = useState(false);
  const vivo = useRef(true);
  const cuenta = useRef(userId);
  cuenta.current = userId;
  /** La respuesta sigue siendo de la cuenta que la pidio. */
  const vigente = useCallback((uid: string) => vivo.current && cuenta.current === uid, []);

  const leerDocumento = useCallback((forzar: boolean) => {
    const uid = userId;
    if (!uid) return Promise.resolve();
    return leerEvaluacionEliteVigente(uid, { forzar })
      .then((r) => { if (vigente(uid)) setLectura((prev) => (r.ok || !prev?.ok ? r : prev)); })
      .catch(() => { if (vigente(uid)) setLectura((prev) => (prev?.ok ? prev : { ok: false, motivo: 'lectura' })); });
  }, [userId, vigente]);

  const leerPlan = useCallback((forzar: boolean) => {
    const uid = userId;
    if (!uid) return Promise.resolve();
    return leerPlanParaPerfil(uid, { forzar }).then((p) => { if (vigente(uid)) setPlan(p); });
  }, [userId, vigente]);

  // Al cambiar de cuenta, todo empieza de cero.
  useEffect(() => {
    vivo.current = true;
    setLectura(null);
    setPlan(null);
    setTier(null);
    if (!userId) return;
    void leerDocumento(false);
    const sub = DeviceEventEmitter.addListener(EVALUACION_ELITE_CHANGED_EVENT, (p?: { userId?: string }) => {
      if (p?.userId && p.userId !== userId) return;
      void leerDocumento(false);
    });
    return () => { vivo.current = false; sub.remove(); };
  }, [userId, leerDocumento]);

  const evaluacion = lectura && lectura.ok ? lectura.evaluacion : null;
  const conEvaluacion = evaluacion !== null && tieneDiagnostico(evaluacion);
  const planIncompleto = plan !== null && (plan.suplementos === null || plan.practicas === null);

  // Al volver a la pestana: la lectura compartida decide si hay que ir a la
  // base; una parte del plan que fallo se vuelve a pedir (los fallos no se cachean).
  useFocusEffect(useCallback(() => {
    void leerDocumento(false);
    if (conEvaluacion && planIncompleto) void leerPlan(false);
  }, [leerDocumento, leerPlan, conEvaluacion, planIncompleto]));

  useEffect(() => {
    if (!userId || !conEvaluacion) return;
    void leerPlan(false);
  }, [userId, conEvaluacion, leerPlan]);

  const sinDocumentoLeido = lectura !== null && !(lectura.ok && lectura.evaluacion);
  useEffect(() => {
    if (!userId || !sinDocumentoLeido || tier !== null) return;
    let activo = true;
    const uid = userId;
    fetchEffectiveTier(uid)
      .then((r) => { if (activo && cuenta.current === uid && !r.noSePudoLeer) setTier(r.tier); })
      .catch(() => { /* sin nivel: la voz neutra */ });
    return () => { activo = false; };
  }, [userId, sinDocumentoLeido, tier]);

  const reintentar = useCallback(() => {
    if (!userId) return;
    setReintentando(true);
    const doc = leerDocumento(true);
    const p = conEvaluacion ? leerPlan(true) : Promise.resolve();
    Promise.all([doc, p]).finally(() => { if (vivo.current) setReintentando(false); });
  }, [userId, leerDocumento, leerPlan, conEvaluacion]);

  const reintentarPlan = useCallback(() => {
    if (!userId || !conEvaluacion) return;
    setReintentandoPlan(true);
    leerPlan(true).finally(() => { if (vivo.current) setReintentandoPlan(false); });
  }, [userId, conEvaluacion, leerPlan]);

  return { userId, lectura, plan, tier, nombrePerfil, reintentando, reintentar, reintentarPlan, reintentandoPlan };
}
