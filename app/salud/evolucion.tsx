/**
 * SALUD › TU EVOLUCIÓN (MB-19 PIEZA 3) — el horizonte largo.
 *
 * Hacia dónde vas: tu mapa funcional, el protocolo que sigues, el detalle de
 * tu Edad ATP y tus reportes.
 */
import { PuertaScreen } from '@/src/screens/salud/PuertaScreen';
import { DESTINOS_EVOLUCION } from '@/src/constants/salud-puertas';

export default function SaludEvolucionScreen() {
  return (
    <PuertaScreen
      title="Tu evolución"
      intro="Hacia dónde vas y por qué. Aquí está el porqué detrás de lo que te sugerimos."
      destinos={DESTINOS_EVOLUCION}
    />
  );
}
