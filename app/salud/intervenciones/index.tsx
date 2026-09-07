/**
 * /salud/intervenciones: RETIRADA A REDIRECT (pivote limpio, 7-sep-2026,
 * decisión del dueño).
 *
 * Era "Mi Protocolo": la lista cruda de prácticas activas más las sugeridas.
 * Con el pivote la persona ya no elige práctica por práctica: elige su
 * objetivo, y el objetivo las enciende por abajo. Lo que desaparece es la
 * PUERTA, no el contenido: user_interventions no pierde una sola fila, sus
 * prácticas siguen alimentando la tarjeta QUÉ HACER HOY y siguen contando
 * electrones. El dato del usuario es sagrado.
 *
 * Se manda a /agenda porque es la ÚNICA pantalla que pinta las prácticas
 * encendidas una por una (interventionAgendaItems), con su hora, y deja
 * completarlas, posponerlas, cambiarles la hora y abrir su detalle. HOY solo
 * muestra tres. El detalle de cada práctica sigue vivo en
 * /salud/intervenciones/[key].
 *
 * La pantalla completa (589 líneas) vive en el historial de git, hasta el
 * commit padre de este, por si algo hubiera que rescatar. La ruta se queda
 * como alias para deep links viejos, builds OTA anteriores y los enlaces que
 * todavía la nombran.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

export default function MiProtocoloRedirect() {
  const router = useRouter();
  const t = useSurfaceTokens();
  useEffect(() => {
    router.replace('/agenda');
  }, [router]);
  return <View style={{ flex: 1, backgroundColor: t.fondo }} />;
}
