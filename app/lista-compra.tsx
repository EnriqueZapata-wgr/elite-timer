/**
 * Lista de compra — redirect (OLA3 · Anexo D §1).
 *
 * Es la pestaña Lista de /cocina, dueña única de shopping_list_items.
 * El stub se queda porque hay deep links y accesos viejos apuntando aquí;
 * los params viajan al destino, no se pierde contexto.
 */
import { Redirect } from 'expo-router';

export default function ListaCompraRedirect() {
  return <Redirect href={{ pathname: '/cocina', params: { tab: 'lista' } }} />;
}
