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
// ─────────────────────────────────────────────────────────────────────────────
// Reglas de combinación de casos de uso
// ─────────────────────────────────────────────────────────────────────────────

/** La forma mínima de un pack que estas reglas necesitan conocer. */
export interface PackParaCombinar {
  key: string;
  nombre: string;
  excluye?: readonly string[];
  /** true = caso de uso de estilo de vida (cuenta para el techo). */
  cuentaParaElTecho: boolean;
}

export type VeredictoCombinacion =
  | { ok: true }
  | { ok: false; razon: 'exclusion'; con: string; nombreCon: string }
  | { ok: false; razon: 'techo'; activos: number };

/**
 * ¿Puede activarse `candidato` con `activos` ya puestos?
 *
 * Dos frenos, en este orden:
 *  1. EXCLUSIÓN declarada (en cualquiera de las dos direcciones: el candado
 *     del registro exige simetría, pero aquí se revisan ambas por si una
 *     edición rompe la simetría antes de que CI la cache).
 *  2. TECHO de casos de estilo de vida activos (MAX_CASOS_ACTIVOS): tres
 *     días distintos armados a la vez ya no son un día. Los paquetes de
 *     salud no cuentan para el techo: capturan expediente, no arman el día.
 *
 * Re-aplicar un pack que ya está activo nunca choca consigo mismo: el
 * llamador filtra al candidato de la lista de activos.
 */
export function validarCombinacion(
  candidato: PackParaCombinar,
  activos: readonly PackParaCombinar[],
  techo: number,
): VeredictoCombinacion {
  for (const a of activos) {
    if (a.key === candidato.key) continue;
    const choca =
      (candidato.excluye ?? []).includes(a.key) || (a.excluye ?? []).includes(candidato.key);
    if (choca) return { ok: false, razon: 'exclusion', con: a.key, nombreCon: a.nombre };
  }
  if (candidato.cuentaParaElTecho) {
    const cuenta = activos.filter((a) => a.key !== candidato.key && a.cuentaParaElTecho).length;
    if (cuenta >= techo) return { ok: false, razon: 'techo', activos: cuenta };
  }
  return { ok: true };
}
