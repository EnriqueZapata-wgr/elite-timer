/**
 * El seguro del reconcile (MB-20.3 P3) — lógica pura, testeable en node.
 *
 * El reconcile alinea electron_logs con la actividad real del día. Su poder
 * peligroso es revocar: dos veces (P1 fuerza, P2 suplementos) una consulta
 * empezó a devolver algo inútil y el sistema lo leyó como "no lo hizo" —
 * borrando electrones ya ganados en cada compilación de HOY.
 *
 * La regla que este módulo encarna: **la ausencia de evidencia no es
 * evidencia de ausencia.** La evidencia de cada llave tiene TRES estados,
 * no dos:
 *
 *   · 'hecho'       → hay actividad real hoy            → award si falta.
 *   · 'no_hecho'    → la fuente respondió bien y dice
 *                     que NO hay actividad               → revoke si sobra.
 *   · 'no_se_sabe'  → la consulta falló o su fila es
 *                     ilegible                           → NUNCA tocar el ledger.
 *
 * Los derivadores viven aquí (puros, con test) y day-compiler solo les pasa
 * las respuestas crudas de supabase. El plan (qué award, qué revoke) también
 * se decide aquí: el shell imperativo solo lo ejecuta y deja rastro.
 */

export type Evidencia = 'hecho' | 'no_hecho' | 'no_se_sabe';

/**
 * Evidencia desde un conteo head:true ({ count, error }).
 * supabase-js NO lanza en 4xx: un fallo llega como { error, count: null } y
 * el `?? 0` viejo lo convertía en "cero actividad" — exactamente el tipo de
 * lectura que borra electrones. Sin número no hay evidencia.
 */
export function evidenciaDeConteo(res: {
  count: number | null | undefined;
  error: unknown;
}): Evidencia {
  if (res.error || typeof res.count !== 'number') return 'no_se_sabe';
  return res.count >= 1 ? 'hecho' : 'no_hecho';
}

/**
 * Evidencia desde la consulta "última fila por fecha" (maybeSingle).
 *
 *   · error                → no_se_sabe (la fuente no está disponible).
 *   · sin fila, sin error  → no_hecho (vacío REAL: nunca ha habido actividad).
 *   · fila con fecha nula
 *     o malformada         → no_se_sabe (fila ilegible — la familia del bug
 *     de exercise_logs: hay actividad pero no sabemos de cuándo).
 *   · fecha === hoy        → hecho; fecha vieja → no_hecho.
 */

/** MB-20.4 P5.2: un created_at con basura pasa por toLocalDateString como
 * "NaN-NaN-NaN" — un string truthy distinto de hoy que el `!== today` leía
 * como evidencia positiva de ausencia, la misma clase de bug que este módulo
 * vino a cerrar. Si la fecha no tiene forma de fecha, es no_se_sabe. */
const FECHA_LOCAL_RE = /^\d{4}-\d{2}-\d{2}$/;

export function evidenciaDeUltimaFecha(
  res: { data: unknown; error: unknown },
  fecha: string | null | undefined,
  today: string,
): Evidencia {
  if (res.error) return 'no_se_sabe';
  if (res.data == null) return 'no_hecho';
  if (!fecha || !FECHA_LOCAL_RE.test(fecha)) return 'no_se_sabe';
  return fecha === today ? 'hecho' : 'no_hecho';
}

export interface ReconcilePlan {
  /** Actividad real sin log → otorgar. */
  award: string[];
  /** Evidencia positiva de ausencia con log presente → revocar. */
  revoke: string[];
}

/**
 * Decide el plan del reconcile. La única puerta a `revoke` es evidencia
 * positiva de ausencia ('no_hecho'). Con 'no_se_sabe' el dato del usuario
 * gana: el electrón se queda exactamente como está.
 */
export function planReconcile(
  evidencias: Record<string, Evidencia>,
  awarded: ReadonlySet<string>,
): ReconcilePlan {
  const award: string[] = [];
  const revoke: string[] = [];
  for (const [src, ev] of Object.entries(evidencias)) {
    if (ev === 'hecho' && !awarded.has(src)) award.push(src);
    else if (ev === 'no_hecho' && awarded.has(src)) revoke.push(src);
    // 'no_se_sabe' → ni award ni revoke, jamás.
  }
  return { award, revoke };
}
