/**
 * SALUD › MI EXPEDIENTE (MB-19 PIEZA 3) — lo archivístico.
 *
 * Se llena una vez y se consulta poco: historia clínica, cuestionarios,
 * evaluaciones, padecimientos y la guía de labs. Por eso vive detrás de una
 * puerta y no compitiendo con lo de hoy.
 */
import { PuertaScreen } from '@/src/screens/salud/PuertaScreen';
import { DESTINOS_EXPEDIENTE } from '@/src/constants/salud-puertas';

export default function SaludExpedienteScreen() {
  return (
    <PuertaScreen
      title="Mi expediente"
      intro="Tu historia. Se llena una vez y se consulta cuando hace falta."
      destinos={DESTINOS_EXPEDIENTE}
    />
  );
}
