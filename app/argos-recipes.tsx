/**
 * Recetas de ARGOS — redirect (OLA3 · Anexo D §1).
 *
 * El generador es parte de la pestaña Recetas de /cocina. Su lista de super en memoria murió: la única puerta receta→lista es sendRecipeToList.
 * El stub se queda porque hay deep links y accesos viejos apuntando aquí;
 * los params viajan al destino, no se pierde contexto.
 */
import { Redirect } from 'expo-router';

export default function ArgosRecipesRedirect() {
  return <Redirect href={{ pathname: '/cocina', params: { tab: 'recetas' } }} />;
}
