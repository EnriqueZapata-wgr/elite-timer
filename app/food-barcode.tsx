/**
 * Registro por código de barras — redirect (OLA3 · Anexo D §1).
 *
 * El sensor CÓDIGO vive en /food-log, junto a foto y texto.
 * El stub se queda porque hay deep links y accesos viejos apuntando aquí;
 * los params viajan al destino, no se pierde contexto.
 */
import { Redirect } from 'expo-router';

export default function FoodBarcodeRedirect() {
  return <Redirect href={{ pathname: '/food-log', params: { sensor: 'codigo' } }} />;
}
