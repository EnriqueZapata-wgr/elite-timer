/**
 * /salud/hoy — ya no es pantalla, es un puente.
 *
 * OLA6 PIEZA A: HOY EN TU CUERPO dejó de ser una ruta con su propio cascarón.
 * La sección vive en el tab SALUD y se abre ahí mismo. La ruta se conserva
 * porque hay deep links, historial y ARGOS apuntando aquí: quien llegue entra
 * al tab con la sección abierta.
 */
import { Redirect } from 'expo-router';

export default function SaludHoyRedirect() {
  return <Redirect href={{ pathname: '/salud', params: { seccion: 'hoy' } }} />;
}
