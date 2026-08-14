/**
 * Selección de tipo de comida — redirect (OLA3 · Anexo D §1).
 *
 * Dejó de ser un paso previo: la barra de tipo de comida y la zona de un toque (frecuentes + registros de hoy) son parte de /food-log.
 * El stub se queda porque hay deep links y accesos viejos apuntando aquí;
 * los params viajan al destino, no se pierde contexto.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function FoodRegisterRedirect() {
  const { mealType } = useLocalSearchParams<{ mealType?: string }>();
  return (
    <Redirect href={{ pathname: '/food-log', params: mealType ? { mealType } : {} }} />
  );
}
