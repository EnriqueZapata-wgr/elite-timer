/**
 * Redirect. "Perfil y cuenta" se disolvió en el hub de Ajustes.
 *
 * Tenía tres destinos reales (editar perfil, suscripción, cerrar sesión) y una
 * fila muerta con chevron que solo te mandaba a Privacidad. Una pantalla que
 * existe para reenviarte a otras tres es un peaje, no una pantalla: sus tres
 * filas ahora viven en el hub y se llega en un toque menos.
 *
 * El stub se queda porque la ruta es deep link (ARGOS la resuelve por voz).
 */
import { Redirect } from 'expo-router';

export default function SettingsCuentaRedirect() {
  return <Redirect href="/settings" />;
}
