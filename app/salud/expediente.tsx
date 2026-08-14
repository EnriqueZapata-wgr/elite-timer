/**
 * /salud/expediente — ya no es pantalla, es un puente.
 *
 * OLA6 PIEZA A: MI EXPEDIENTE vive como sección del tab SALUD. La ruta se
 * conserva para deep links e historial y abre la sección al aterrizar.
 */
import { Redirect } from 'expo-router';

export default function SaludExpedienteRedirect() {
  return <Redirect href={{ pathname: '/salud', params: { seccion: 'expediente' } }} />;
}
