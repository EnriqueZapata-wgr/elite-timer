/**
 * Preferencias de comida — redirect (OLA3 · Anexo D §1).
 *
 * Es la pestaña Preferencias de /cocina, al lado de su único consumidor: el generador de recetas.
 * El stub se queda porque hay deep links y accesos viejos apuntando aquí;
 * los params viajan al destino, no se pierde contexto.
 */
import { Redirect } from 'expo-router';

export default function FoodPreferencesRedirect() {
  return <Redirect href={{ pathname: '/cocina', params: { tab: 'preferencias' } }} />;
}
