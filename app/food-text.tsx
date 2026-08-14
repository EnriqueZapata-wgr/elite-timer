/**
 * Registro por texto — redirect (OLA3 · Anexo D §1).
 *
 * El sensor TEXTO vive en /food-log, junto a foto y código.
 * El stub se queda porque hay deep links y accesos viejos apuntando aquí;
 * los params viajan al destino, no se pierde contexto.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function FoodTextRedirect() {
  const { mealType } = useLocalSearchParams<{ mealType?: string }>();
  return (
    <Redirect
      href={{ pathname: '/food-log', params: { sensor: 'texto', ...(mealType ? { mealType } : {}) } }}
    />
  );
}
