/**
 * /health-hub — ya no es pantalla, es un puente.
 *
 * OLA6 PIEZA B: eran 32 líneas que montaban el MISMO cuerpo del tab SALUD, con
 * la única diferencia de traer botón de regresar. Dos rutas para una pantalla
 * es una pantalla que se mantiene dos veces y se desincroniza una sola vez.
 *
 * El candado de mb31b-remate verifica que este archivo NO nombre al componente
 * del hub: si vuelve a aparecer, es que alguien reabrió la segunda copia.
 *
 * La ruta se conserva porque hay deep links viejos apuntando aquí. Quien
 * llegue aterriza en el tab SALUD, que es donde vive la pantalla.
 */
import { Redirect } from 'expo-router';

export default function HealthHubRedirect() {
  return <Redirect href="/salud" />;
}
