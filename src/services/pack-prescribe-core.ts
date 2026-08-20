/**
 * pack-prescribe-core: el plan de prescripción de un caso de uso, puro.
 *
 * Un pack declara `prescribe` (llaves del catálogo de intervenciones) y este
 * núcleo decide QUÉ se escribe sin tocar red: por eso es testeable en node.
 * La regla que lo gobierna es la doctrina del dato sagrado:
 *
 *   · la llave que el usuario no tiene            → se INSERTA activa
 *   · la que está 'suggested'                     → se PROMUEVE a activa
 *   · la que ya está 'active'                     → no se toca (idempotencia)
 *   · la que el usuario pausó ('paused')          → SE RESPETA, no se revive
 *   · la que el usuario descartó ('dismissed')    → SE RESPETA, no se revive
 *
 * "El pack me revivió lo que yo apagué" es exactamente la sorpresa que esta
 * separación prohíbe. Las respetadas se reportan para que la ficha pueda
 * decirlo honesto ("2 prácticas siguen como las dejaste"), nunca en silencio.
 */

export type EstadoIntervencion = 'suggested' | 'active' | 'paused' | 'dismissed';

export interface FilaIntervencion {
  intervention_key: string;
  status: EstadoIntervencion;
}

export interface PlanPrescripcion {
  /** No existen en user_interventions: se insertan con status 'active'. */
  insertar: string[];
  /** Existen como 'suggested': se promueven a 'active'. */
  promover: string[];
  /** Ya estaban activas: cero escrituras (re-aplicar un pack es idempotente). */
  yaActivas: string[];
  /** 'paused' o 'dismissed': decisión del usuario, se respeta y se reporta. */
  respetadas: string[];
}

export function planearPrescripcion(
  prescribe: readonly string[],
  existentes: readonly FilaIntervencion[],
): PlanPrescripcion {
  const porLlave = new Map(existentes.map((f) => [f.intervention_key, f.status]));
  const plan: PlanPrescripcion = { insertar: [], promover: [], yaActivas: [], respetadas: [] };
  for (const key of prescribe) {
    const estado = porLlave.get(key);
    if (estado === undefined) plan.insertar.push(key);
    else if (estado === 'suggested') plan.promover.push(key);
    else if (estado === 'active') plan.yaActivas.push(key);
    else plan.respetadas.push(key);
  }
  return plan;
}
