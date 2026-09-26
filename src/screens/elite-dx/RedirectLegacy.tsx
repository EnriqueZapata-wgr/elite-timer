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
import { useIsFocused } from '@react-navigation/native';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export function RedirectLegacy({ a }: { a: Href }) {
  const router = useRouter();
  const t = useSurfaceTokens();
  // 26-sep-2026 (revision en frio): solo con foco. Las tabs ya visitadas
  // siguen montadas; si el modo cambia con la app abierta, una sala sin foco
  // que pasa a redirect no debe secuestrar la navegacion (el admin elegia
  // "ATP completa" en Ajustes y terminaba en Fuerza en vez de HOY).
  const enFoco = useIsFocused();
  useEffect(() => {
    if (enFoco) router.replace(a);
  }, [router, a, enFoco]);
  return <View style={{ flex: 1, backgroundColor: t.fondo }} />;
}
