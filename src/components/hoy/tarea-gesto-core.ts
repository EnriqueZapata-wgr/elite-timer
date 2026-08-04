/**
 * tarea-gesto-core (MB-20.5 · P5) — LA TABLA del gesto, pura y en un solo
 * lugar.
 *
 * El contrato viejo leía el orden de los strings en el source del hook:
 * cambiar 'palomear' por 'navegar' dejaba los tests en verde. Aquí la tabla
 * se INSTANCIA y se afirma completa por tipo (tarea-gesto contrato): esa
 * mutación truena. useTareaGesto no decide nada por su cuenta — despacha lo
 * que esta tabla dice (y el contrato vigila que no re-derive de gesto).
 *
 *   tipo      | tap                        | tap largo
 *   palomear  | palomea                    | navega, si tiene ruta
 *   navegar   | navega (su única acción)   | nada
 *   inline    | navega (botones capturan)  | nada
 *
 * Cero imports con runtime nativo: testeable en el harness node.
 */
import type { TareaGesto, TareaRoute } from '@/src/services/hoy/tareas-core';

/** Lo que un gesto puede disparar. */
export type GestoAccion = 'palomear' | 'navegar' | 'nada';

export interface TareaGestoInput {
  gesto: TareaGesto;
  route?: TareaRoute;
}

/** Los tipos de gesto, completos. El check de tipo de abajo obliga a que un
 * gesto nuevo se agregue aquí (y por tanto a la tabla y su test). */
export const TAREA_GESTOS = ['palomear', 'navegar', 'inline'] as const;
type GestoFaltante = Exclude<TareaGesto, (typeof TAREA_GESTOS)[number]>;
const _exhaustivo: GestoFaltante extends never ? true : never = true;
void _exhaustivo;

/** El TAP hace LA ACCIÓN PRINCIPAL de la fila. Sin ruta no hay a dónde ir:
 * 'nada' (navegación honesta, MB-20.2 · 2.5). */
export function accionTap(t: TareaGestoInput): GestoAccion {
  if (t.gesto === 'palomear') return 'palomear';
  return t.route ? 'navegar' : 'nada';
}

/** El TAP LARGO solo es atajo a la función donde el tap hace otra cosa
 * (palomear). En navegar e inline el tap ya navega: el hold no tiene papel. */
export function accionTapLargo(t: TareaGestoInput): GestoAccion {
  if (t.gesto !== 'palomear') return 'nada';
  return t.route ? 'navegar' : 'nada';
}

/** El copy de la burbuja contextual del gesto (P5.2: vivía suelto en el JSX
 * de TareasView; amarrado como el guion del tour). P6: describe la regla de
 * DOS tipos — es espejo del paso 2 del tour (orb-tour-core). */
export const NUDGE_COPY =
  'Un toque palomea los hábitos y abre las funciones. Mantener presionado abre el módulo de un hábito que además tiene pantalla.';
