/**
 * RedirectLegacy (25-sep-2026, app Elite DX): manda a otra ruta despues del
 * primer render, con el fondo del tema mientras tanto.
 *
 * Vive fuera de app/ a proposito. El generador del mapa de ARGOS
 * (scripts/gen-mapa-rutas.js) marca como ALIAS cualquier archivo de ruta corto
 * con `router.replace`, y lo saca del indice. Las salas PROGRESO, MI PROGRAMA
 * y TU solo redirigen con la bandera apagada; si el replace viviera en su
 * archivo, ARGOS las creeria alias con la bandera encendida y no sabria
 * llevar a nadie ahi.
 *
 * Mismo patron que las tabs viejas (G09, 20-ago-2026): useEffect + replace, no
 * <Redirect>, que dentro del grupo (tabs) dejaba la pantalla en blanco.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export function RedirectLegacy({ a }: { a: Href }) {
  const router = useRouter();
  const t = useSurfaceTokens();
  useEffect(() => {
    router.replace(a);
  }, [router, a]);
  return <View style={{ flex: 1, backgroundColor: t.fondo }} />;
}
