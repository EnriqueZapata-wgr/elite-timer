/**
 * Redirect. Los ajustes de comunidad se mudaron a /comunidad/ajustes (Tribu).
 *
 * El archivo se queda como stub y no se borra porque esta ruta es un deep link
 * vivo: ARGOS la resuelve por voz y las notificaciones de comunidad la citan.
 * Borrarla sin más manda al usuario a una pantalla en blanco.
 */
import { Redirect } from 'expo-router';

export default function SettingsComunidadRedirect() {
  return <Redirect href="/comunidad/ajustes" />;
}
