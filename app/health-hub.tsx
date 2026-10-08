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
  // 8-oct-2026 (v4): en la v4 el tab /salud es el Perfil; el hub vive en
  // /salud?seccion=hub. La vista clasica ignora 'hub' y abre el hub igual.
  return <Redirect href={{ pathname: '/salud', params: { seccion: 'hub' } }} />;
}
