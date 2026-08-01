/**
 * SALUD › HOY EN TU CUERPO (MB-19 PIEZA 3) — el horizonte corto.
 *
 * Lo que está pasando ahora: glucosa, cetonas, sol y lo que sientes. Un dato =
 * un lugar: aquí se registra y se ve el de hoy; la serie histórica vive en
 * Mis Datos.
 */
import { PuertaScreen } from '@/src/screens/salud/PuertaScreen';
import { DESTINOS_HOY } from '@/src/constants/salud-puertas';

export default function SaludHoyScreen() {
  return (
    <PuertaScreen
      title="Hoy en tu cuerpo"
      intro="Lo que está pasando ahora. La serie completa de cada dato vive en Mis Datos."
      destinos={DESTINOS_HOY}
    />
  );
}
