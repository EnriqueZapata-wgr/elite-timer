/**
 * useLecturaDocumento (8-oct-2026, nivel 2): el documento vigente del cliente
 * para las piezas que solo necesitan saber COMO hablarle (marca de HOY,
 * asunto del correo al coach). Un programa (`tipo: 'programa'`) entra al
 * mismo modo Elite DX y nunca lee "Elite"; para decidirlo hay que leer el
 * documento.
 *
 * Usa la MISMA lectura compartida que HOY y MI PROGRAMA
 * (leerEvaluacionEliteVigente: promesa en vuelo y cache de 60 s), asi que no
 * agrega viajes a la base. Devuelve null mientras lee (o si `activo` es
 * false): quien la usa decide con eso una palabra neutra, no la de Elite.
 * Un fallo despues de una lectura buena no borra lo que ya se sabia. Relee
 * con EVALUACION_ELITE_CHANGED_EVENT. Al cambiar de cuenta empieza de cero.
 */
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import {
  EVALUACION_ELITE_CHANGED_EVENT, leerEvaluacionEliteVigente, type LecturaEvaluacionVigente,
} from '@/src/services/hoy/elite-hoy-service';

export function useLecturaDocumento(userId: string | undefined, activo = true): LecturaEvaluacionVigente | null {
  const [lectura, setLectura] = useState<LecturaEvaluacionVigente | null>(null);
  useEffect(() => {
    setLectura(null);
    if (!activo || !userId) return;
    let vivo = true;
    const leer = () => {
      leerEvaluacionEliteVigente(userId)
        .then((r) => { if (vivo) setLectura((prev) => (r.ok || !prev?.ok ? r : prev)); })
        .catch(() => { if (vivo) setLectura((prev) => (prev?.ok ? prev : { ok: false, motivo: 'lectura' })); });
    };
    leer();
    const sub = DeviceEventEmitter.addListener(EVALUACION_ELITE_CHANGED_EVENT, (p?: { userId?: string }) => {
      if (p?.userId && p.userId !== userId) return;
      leer();
    });
    return () => { vivo = false; sub.remove(); };
  }, [userId, activo]);
  return lectura;
}
