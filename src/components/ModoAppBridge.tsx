/**
 * ModoAppBridge (26-sep-2026): decide, sin pintar nada, que version de la app
 * ve esta cuenta (Elite DX o ATP completa) y la deja en modo-app-estado.
 * Vive en el layout raiz, dentro de AuthProvider, una sola vez.
 *
 * Lee el nivel y la evaluacion por su cuenta, con las mismas funciones que
 * useSubscription, y NO usa ese hook. Revision en frio (26-sep): el hook, al
 * pasar de "sin sesion" a una cuenta, entrega un render con la foto vieja
 * (free, sin evaluacion, sin cargar); con ella un cliente Elite caia a la ATP
 * completa en cada arranque, y sin red se quedaba ahi y se guardaba. Ademas el
 * hook arrastra RevenueCat y las ofertas, que el modo no necesita.
 *
 * Orden: lo guardado en el telefono (para no parpadear en frio), luego la
 * cuenta. Una lectura que falla no cambia el modo (regla 2 de modo-app-core);
 * una lectura de otra cuenta se tira (modoDeLectura).
 */
import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useAuth } from '@/src/contexts/auth-context';
import { isAdmin } from '@/src/constants/admin-config';
import { SUBSCRIPTION_CHANGED_EVENT } from '@/src/hooks/useSubscription';
import { EVALUACION_ELITE_CHANGED_EVENT } from '@/src/services/hoy/elite-hoy-service';
import { fetchEffectiveTier, fetchTieneEvaluacionElite } from '@/src/services/subscription/subscription-service';
import { modoDeLectura } from '@/src/services/modo-app/modo-app-core';
import {
  fijarEsAdmin,
  fijarModoPorCuenta,
  fijarPreferencia,
  fijarUltimoConocido,
  fijarUltimoConocidoSiVacio,
} from '@/src/services/modo-app/modo-app-estado';
import { guardarUltimoModo, leerModoGuardado } from '@/src/services/modo-app/modo-app-persistencia';

export function ModoAppBridge() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userActual = useRef<string | null>(userId);
  userActual.current = userId;
  // Solo la lectura mas reciente escribe: un canje de codigo puede disparar
  // una lectura nueva mientras la anterior sigue en vuelo (verificacion en
  // frio, 26-sep).
  const turno = useRef(0);

  useEffect(() => {
    let vivo = true;
    leerModoGuardado().then(({ ultimo, preferencia }) => {
      if (!vivo) return;
      fijarUltimoConocidoSiVacio(ultimo);
      fijarPreferencia(preferencia);
    });
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    fijarEsAdmin(isAdmin(userId));
    // Cambio de cuenta (o cierre de sesion): lo resuelto para la anterior no
    // vale para esta. Hasta que se lea, manda el ultimo conocido.
    fijarModoPorCuenta(null);
    if (!userId) return;
    const uid = userId;
    let vivo = true;

    const leer = async () => {
      const mio = ++turno.current;
      const [nivel, evaluacion] = await Promise.all([
        fetchEffectiveTier(uid),
        fetchTieneEvaluacionElite(uid),
      ]);
      if (!vivo || mio !== turno.current) return;
      const m = modoDeLectura(uid, userActual.current, {
        tier: nivel.tier,
        tieneEvaluacionElite: evaluacion.tiene,
        nivelCargando: false,
        nivelNoSePudoLeer: nivel.noSePudoLeer,
        evaluacionNoSePudoLeer: evaluacion.noSePudoLeer,
      });
      if (!m) return;
      fijarModoPorCuenta(m);
      fijarUltimoConocido(m);
      guardarUltimoModo(m);
    };

    leer();
    // Un codigo canjeado o una evaluacion recien cargada pueden cambiar el
    // modo sin reiniciar la app.
    const s1 = DeviceEventEmitter.addListener(SUBSCRIPTION_CHANGED_EVENT, () => { leer(); });
    const s2 = DeviceEventEmitter.addListener(EVALUACION_ELITE_CHANGED_EVENT, () => { leer(); });
    return () => { vivo = false; s1.remove(); s2.remove(); };
  }, [userId]);

  return null;
}
