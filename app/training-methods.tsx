/**
 * /training-methods (MB-3.6 Bloque 1.1) — MOVIDA a la biblioteca.
 *
 * La teoría de los 3 métodos vive junto a los ejercicios (tab MÉTODOS ATP de
 * /exercise-library), no como destino suelto. Redirect para deep-links viejos.
 */
import { Redirect } from 'expo-router';

export default function TrainingMethodsRedirect() {
  return <Redirect href={{ pathname: '/exercise-library', params: { tab: 'metodos' } }} />;
}
