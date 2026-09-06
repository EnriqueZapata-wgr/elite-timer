/**
 * "Qué hacer hoy" (ATP 3.0, 6-sep-2026, ruta 2.2): la regla PURA que elige
 * exactamente tres acciones para la tarjeta de HOY.
 *
 * Materia prima: las intervenciones que la persona YA tiene en
 * `user_interventions` (activas y sugeridas; nunca pausadas ni descartadas:
 * revivirlas sería pisar una decisión suya) y, si no tiene ninguna, tres
 * hábitos base del catálogo. Este archivo no importa el catálogo (10 mil
 * líneas) ni Supabase: recibe candidatos ya resueltos y devuelve tres.
 *
 * Prioridad: primero las ligadas a un marcador fuera de ventana (más
 * coincidencias primero, y las que piden atención pesan doble frente a las
 * aceptables), luego activas antes que sugeridas, luego la prioridad del
 * catálogo (1 = roja), y por último la llave para que el orden sea estable
 * entre cargas. Sin estudio o sin ligadas, salen las tres de mayor prioridad.
 */

export type OrigenAccion = 'activa' | 'sugerida' | 'base';

export interface CandidatoHoy {
  /** intervention_key del catálogo (o custom). */
  key: string;
  nombre: string;
  /** Cómo se hace, una línea. */
  como: string;
  /** 1 roja, 2 amarilla, 3 verde. */
  prioridad: number;
  origen: OrigenAccion;
  /** id de la fila en user_interventions, o null si todavía no tiene fila. */
  userInterventionId: string | null;
  /**
   * Nombres de biomarcadores que la intervención mueve o por los que se
   * recomienda (epigeneticImpact.biomarkers + boostIf de laboratorio), tal
   * cual vienen del catálogo; aquí se normalizan.
   */
  marcadores: string[];
}

export interface MarcadorFuera {
  /** parameter_key canónico ("hba1c"). */
  key: string;
  /** Nombres con los que puede aparecer en el catálogo ("HbA1c"). */
  nombres: string[];
  /** Nombre para la persona ("Hemoglobina glucosilada"). */
  etiqueta: string;
  estado: 'atencion' | 'aceptable';
}

export interface AccionHoy {
  key: string;
  titulo: string;
  detalle: string;
  origen: OrigenAccion;
  userInterventionId: string | null;
  /** Etiqueta del marcador que la justifica, o null si no está ligada. */
  porMarcador: string | null;
  hecha: boolean;
}

export const ACCIONES_HOY = 3;

/**
 * Los tres hábitos base cuando la persona no tiene intervenciones: llaves
 * del catálogo que ya existe (universales), no hábitos inventados. El
 * servicio resuelve nombre y "cómo" desde el catálogo.
 */
export const HABITOS_BASE_KEYS = ['hidratacion_matutina', 'caminata_postprandial', 'recordatorio_dormir'] as const;

/** Minúsculas, sin acentos ni signos: "HbA1c" y "hba1c" y "HOMA-IR" y "homair" coinciden. */
export function normalizarMarcador(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Tokens de un nombre: "PCR_hs" -> ["pcr","hs"], "HOMA-IR" -> ["homa","ir"]. */
export function tokensMarcador(s: string): string[] {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Coinciden si son el mismo nombre (sin signos) o si TODOS los tokens del
 * más corto aparecen como tokens completos del más largo: "PCR" casa con
 * "PCR_hs" e "insulina" con "insulina_ayunas", pero "ldh" no casa con
 * "ratio_cortisol_dhea" ni "iga" con "fatiga_ocular_score_subjetivo"
 * (4EP B3: la contención por substring daba esos falsos positivos).
 */
export function coincideMarcador(a: string, b: string): boolean {
  const x = normalizarMarcador(a);
  const y = normalizarMarcador(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const ta = tokensMarcador(a);
  const tb = tokensMarcador(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [corto, largo] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const setLargo = new Set(largo);
  return corto.every((t) => setLargo.has(t));
}

/**
 * Regla 1: una llave que la persona pausó o descartó no vuelve por la
 * puerta de atrás como "hábito base". Devuelve los base que no están
 * excluidos y, si quedan menos de tres, rellena con `universales` (otras
 * llaves universales del catálogo) que tampoco estén excluidas.
 */
export function habitosBaseSinExcluidas(
  base: ReadonlyArray<CandidatoHoy>,
  excluidas: ReadonlySet<string>,
  universales: ReadonlyArray<CandidatoHoy> = [],
): CandidatoHoy[] {
  const out = base.filter((b) => !excluidas.has(b.key));
  const vistos = new Set(out.map((b) => b.key));
  for (const u of universales) {
    if (out.length >= ACCIONES_HOY) break;
    if (excluidas.has(u.key) || vistos.has(u.key)) continue;
    vistos.add(u.key);
    out.push(u);
  }
  return out;
}

const RANGO_ORIGEN: Record<OrigenAccion, number> = { activa: 0, sugerida: 1, base: 2 };

interface Puntuado {
  c: CandidatoHoy;
  puntos: number;
  marcador: MarcadorFuera | null;
}

/** Puntos por marcadores fuera de ventana que esta intervención toca (atención vale doble). */
function puntuar(c: CandidatoHoy, fuera: ReadonlyArray<MarcadorFuera>): Puntuado {
  let puntos = 0;
  let mejor: MarcadorFuera | null = null;
  for (const f of fuera) {
    const nombres = [f.key, ...f.nombres];
    const toca = c.marcadores.some((m) => nombres.some((n) => coincideMarcador(m, n)));
    if (!toca) continue;
    const p = f.estado === 'atencion' ? 2 : 1;
    puntos += p;
    if (!mejor || (f.estado === 'atencion' && mejor.estado !== 'atencion')) mejor = f;
  }
  return { c, puntos, marcador: mejor };
}

/**
 * Elige las tres. `candidatos` puede traer duplicados por llave (una fila
 * activa y el mismo key entre las sugeridas): gana la de origen más fuerte.
 * `base` son los hábitos del catálogo para rellenar cuando faltan candidatos.
 * `hechasHoy` son ids de user_interventions ya completadas hoy.
 */
export function elegirQueHacerHoy(
  candidatos: ReadonlyArray<CandidatoHoy>,
  fuera: ReadonlyArray<MarcadorFuera>,
  base: ReadonlyArray<CandidatoHoy>,
  hechasHoy: ReadonlySet<string> = new Set(),
): AccionHoy[] {
  const porKey = new Map<string, CandidatoHoy>();
  for (const c of candidatos) {
    if (!c.key || !c.nombre) continue;
    const prev = porKey.get(c.key);
    if (!prev || RANGO_ORIGEN[c.origen] < RANGO_ORIGEN[prev.origen]) porKey.set(c.key, c);
  }
  const ordenados = [...porKey.values()]
    .map((c) => puntuar(c, fuera))
    .sort((a, b) =>
      b.puntos - a.puntos
      || RANGO_ORIGEN[a.c.origen] - RANGO_ORIGEN[b.c.origen]
      || a.c.prioridad - b.c.prioridad
      || a.c.key.localeCompare(b.c.key),
    );
  const elegidos: Puntuado[] = ordenados.slice(0, ACCIONES_HOY);
  if (elegidos.length < ACCIONES_HOY) {
    const yaEstan = new Set(elegidos.map((p) => p.c.key));
    for (const b of base) {
      if (elegidos.length >= ACCIONES_HOY) break;
      if (yaEstan.has(b.key)) continue;
      yaEstan.add(b.key);
      elegidos.push({ c: b, puntos: 0, marcador: null });
    }
  }
  return elegidos.map(({ c, marcador }) => ({
    key: c.key,
    titulo: c.nombre,
    detalle: c.como,
    origen: c.origen,
    userInterventionId: c.userInterventionId,
    porMarcador: marcador ? marcador.etiqueta : null,
    hecha: c.userInterventionId != null && hechasHoy.has(c.userInterventionId),
  }));
}

/** Marca una acción como hecha en la lista (optimista, sin mutar). */
export function marcarHecha(acciones: ReadonlyArray<AccionHoy>, key: string, hecha: boolean): AccionHoy[] {
  return acciones.map((a) => (a.key === key ? { ...a, hecha } : a));
}
