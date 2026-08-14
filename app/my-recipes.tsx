/**
 * Mis recetas — redirect (OLA3 · Anexo D §1).
 *
 * Es la pestaña Recetas de /cocina, dueña de user_recipes.
 * El stub se queda porque hay deep links y accesos viejos apuntando aquí;
 * los params viajan al destino, no se pierde contexto.
 */
import { Redirect } from 'expo-router';

export default function MyRecipesRedirect() {
  return <Redirect href={{ pathname: '/cocina', params: { tab: 'recetas' } }} />;
}
