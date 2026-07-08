/**
 * RevenueCatSync — componente invisible montado dentro de AuthProvider.
 * Configura el SDK al arrancar y mantiene la identidad RevenueCat
 * sincronizada con la sesión de Supabase (logIn/logOut).
 */
import { useEffect } from 'react';

import { useAuth } from '@/src/contexts/auth-context';
import {
  configureRevenueCat,
  identifyRevenueCatUser,
  logOutRevenueCat,
} from '@/src/services/revenuecat';

export function RevenueCatSync() {
  const { user } = useAuth();

  useEffect(() => {
    configureRevenueCat();
  }, []);

  useEffect(() => {
    if (user?.id) {
      identifyRevenueCatUser(user.id);
    } else {
      logOutRevenueCat();
    }
  }, [user?.id]);

  return null;
}
