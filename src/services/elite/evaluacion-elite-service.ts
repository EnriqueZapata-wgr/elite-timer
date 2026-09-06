/**
 * Lectura de las evaluaciones Elite del usuario (ATP 3.0, 6 de septiembre de
 * 2026, ruta 3.3 y 3.10). Lo unico con supabase de la pantalla; la logica de
 * ordenar y validar vive en evaluacion-elite-core.ts.
 *
 * Regla 7: supabase-js no lanza en 4xx (devuelve error) y si rechaza sin red.
 * Los dos caminos terminan en `estado: 'error'`, que la pantalla pinta como
 * "no se pudo leer" con reintentar; nunca como "no tienes evaluacion".
 *
 * Se leen TODAS las filas con `elite_v3` ordenadas por version, no solo la
 * `is_current`: si ARGOS regenera el mapa funcional despues de la carga, la
 * fila Elite deja de ser la vigente de functional_dx pero sigue siendo la
 * evaluacion vigente del cliente (dato del usuario sagrado).
 *
 * 4EP 6-sep-2026: `elite_v3.html` (el entregable completo del generador) pesa
 * decenas de KB por version y solo se necesita para el PDF. La lista se
 * proyecta clave por clave (cabecera + las 15 secciones) sin `html`, y el
 * `html` se pide aparte, por id, cuando se toca "Descargar PDF".
 */
import { supabase } from '@/src/lib/supabase';
import { ELITE_SECCIONES } from './elite-v3-core';
import { versionesDesdeFilas, type FilaDxElite, type VersionElite } from './evaluacion-elite-core';

export type LecturaEvaluacionesElite =
  | { estado: 'ok'; versiones: VersionElite[] }
  | { estado: 'error' };

/** Claves de `elite_v3` que la pantalla necesita (todo menos `html`). */
const CLAVES_ELITE = ['schema', 'version', 'generado_en', 'interpretado_por', 'cliente', ...ELITE_SECCIONES] as const;

/** `id, version, created_at, ev_schema:sources_snapshot->elite_v3->schema, ...` */
const SELECT_LISTA = ['id', 'version', 'created_at', ...CLAVES_ELITE.map((k) => `ev_${k}:sources_snapshot->elite_v3->${k}`)].join(', ');

/** Rearma `{ elite_v3: {...} }` a partir de las columnas proyectadas. */
function filaDesdeProyeccion(row: Record<string, unknown>): FilaDxElite {
  const elite: Record<string, unknown> = {};
  for (const k of CLAVES_ELITE) {
    const v = row[`ev_${k}`];
    if (v !== null && v !== undefined) elite[k] = v;
  }
  return {
    id: String(row.id),
    version: Number(row.version),
    created_at: String(row.created_at),
    sources_snapshot: { elite_v3: elite },
  };
}

export async function fetchEvaluacionesElite(userId: string): Promise<LecturaEvaluacionesElite> {
  try {
    const { data, error } = await supabase
      .from('functional_dx')
      .select(SELECT_LISTA)
      .eq('user_id', userId)
      .not('sources_snapshot->elite_v3', 'is', null)
      .order('version', { ascending: false })
      .limit(20);
    if (error) return { estado: 'error' };
    const filas = ((data ?? []) as unknown as Record<string, unknown>[]).map(filaDesdeProyeccion);
    return { estado: 'ok', versiones: versionesDesdeFilas(filas) };
  } catch {
    return { estado: 'error' };
  }
}

export type LecturaHtmlElite =
  | { estado: 'ok'; html: string | null }
  | { estado: 'error' };

/** El `html` del generador para una version concreta; null si esa version no lo trae. */
export async function fetchHtmlEvaluacionElite(dxId: string): Promise<LecturaHtmlElite> {
  try {
    const { data, error } = await supabase
      .from('functional_dx')
      .select('html:sources_snapshot->elite_v3->>html')
      .eq('id', dxId)
      .maybeSingle();
    if (error) return { estado: 'error' };
    const html = (data as { html?: unknown } | null)?.html;
    return { estado: 'ok', html: typeof html === 'string' && html.trim().length > 0 ? html : null };
  } catch {
    return { estado: 'error' };
  }
}
