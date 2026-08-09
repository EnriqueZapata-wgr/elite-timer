/**
 * MB-30B Pieza 1 — bridge invisible del filtro nocturno (patrón RevenueCatSync).
 *
 * Al arrancar con sesión: re-arma el servicio si el usuario lo dejó encendido
 * (no sobrevive reboot: sin RECEIVE_BOOT_COMPLETED a propósito) y honra el
 * apagado hecho desde el aviso persistente (apaga también la preferencia).
 * NUNCA pide permisos: eso solo pasa en /night-filter cuando el usuario
 * activa la función.
 */
import { useEffect } from 'react';
import { useAuth } from '@/src/contexts/auth-context';
import { restoreNightFilterOnLaunch } from '@/src/services/night-filter-service';

export function NightFilterBridge() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    restoreNightFilterOnLaunch(user.id);
  }, [user?.id]);

  return null;
}
