/**
 * Routine Generator core — motor generador determinista de rutinas (MB-3 Track B).
 *
 * Satisfacción de restricciones sobre la matriz de ejercicios (SIN LLM):
 * filtros duros (equipo, contraindicaciones, nivel, senior) → escalera de
 * slots → techo de capacidad por nivel → cálculo de tiempo → rotación con
 * seed determinista (día+usuario). $0 runtime, offline, reproducible.
 *
 * Puro (patrón *-core del repo): cero dependencias de RN/Supabase — testeable
 * en Vitest node-only. Reglas: R and D/BRIEF_MB3_FITNESS_MEGA.md Track B y
 * R and D/MATRIZ_FITNESS_DIMENSIONES.md.
 */
import {
  equipoDisponible,
  emomPermitido,
  NIVEL_EJERCICIO_RANK,
  NIVEL_USUARIO_RANK,
  GRUPOS_MUSCULARES,
  type MatrixExercise,
  type NivelUsuario,
  type MetodoATP,
  type Patron,
} from '@/src/constants/exercise-matrix';

// ── Tipos de entrada/salida ──

export type Objetivo = 'fuerza' | 'hipertrofia' | 'metabolico';

export type EnfoquePatron =
  | 'full_body' | 'tren_superior' | 'empuje' | 'traccion'
  | 'pierna_empuje' | 'pierna_traccion';

/** Doctrina guiado-no-prisionero: patrón por default, bro-split (músculos) opt-in. */
export type Enfoque =
  | { kind: 'patron'; enfoque: EnfoquePatron }
  | { kind: 'musculos'; musculos: string[] };

export interface GeneratorInput {
  catalogo: MatrixExercise[];
  objetivo: Objetivo;
  enfoque: Enfoque;
  /** Tokens de equipo del usuario (Peso corporal se asume siempre). */
  equipo: string[];
  nivel: NivelUsuario;
  senior: boolean;
  /** Minutos que el usuario tiene disponibles. */
  tiempoMin: number;
  /** Banderas del usuario (eje 9): 'Rodilla', 'Hombro', 'Lumbar/hernia', ... */
  contraindicaciones: string[];
  /** Seed determinista — mismo seed ⇒ misma rutina. Ej: `${userId}|${fecha}`. */
  seed: string;
  /** Slugs primarios de sesiones recientes (anti-repetición dentro de familia). */
  slugsRecientes?: string[];
  /** Si ayer fue sesión pesada, hoy sesga a metabólico/sarcomérico. */
  ayerFuePesado?: boolean;
}

export type SlotKey =
  | 'multi_pesado' | 'multi_metabolico'
  | 'especifico_fuerza' | 'especifico_metabolico'
  | 'multi_sarcomerico' | 'especifico_sarcomerico'
  | 'unilateral_fuerza' | 'unilateral_metabolico' | 'unilateral_sarcomerico'
  | 'recovery';

export interface RoutineBlock {
  slug: string;
  nombre: string;
  mediaUrl: string | null;
  slot: SlotKey;
  /** Método ejecutable asignado (subset con ejecutor en código). */
  metodo: Extract<MetodoATP, 'Estándar' | '3-5' | 'EMOM Auto' | 'Myo-reps'>;
  series: number;
  /** Reps por serie; si `esIsometrico`, son SEGUNDOS de hold. */
  reps: number;
  esIsometrico: boolean;
  esUnilateral: boolean;
  descansoSeg: number;
  /** Mini-series por serie (clusters sarcoméricos); micro-descanso 1-9 s. */
  miniSeries: number;
  microDescansoSeg: number;
  tiempoSeg: number;
  musculoPrincipal: string;
  patron: Patron;
  familia: string;
}

export interface GeneratedRoutine {
  bloques: RoutineBlock[];
  tiempoTotalSeg: number;
  /** min(tiempo del usuario, techo de capacidad del nivel). */
  tiempoEfectivoMin: number;
  techoMin: number;
  /** Honestidad: lo que el motor decidió decir de frente. */
  avisos: string[];
  /** Excedente sobre el techo, mandado a movilidad/recovery (min). */
  recoveryExtraMin: number;
  seed: string;
}

// ── Constantes de capacidad (brief Track B) ──

/** Techo de capacidad (min de sesión con volumen recuperable) por nivel. */
export const TECHO_CAPACIDAD_MIN: Record<NivelUsuario, number> = {
  principiante: 35, intermedio: 55, avanzado: 78, atleta: 110,
};
export const FACTOR_SENIOR = 0.8;

/** Máximo de multiarticulares pesados por nivel. */
export const MAX_MULTI_PESADOS: Record<NivelUsuario, number> = {
  principiante: 1, intermedio: 2, avanzado: 3, atleta: 4,
};

/** Orden de colocación de la escalera (recovery se agrega al final aparte). */
export const ESCALERA: SlotKey[] = [
  'multi_pesado', 'multi_metabolico',
  'especifico_fuerza', 'especifico_metabolico',
  'multi_sarcomerico', 'especifico_sarcomerico',
  'unilateral_fuerza', 'unilateral_metabolico', 'unilateral_sarcomerico',
];

/**
 * Prescripción por slot: series/reps/tiempos. Descanso entre series por
 * objetivo del bloque (fuerza 2-4 min · metabólico 15-45 s); micro-descanso
 * intra-cluster 1-9 s (propiedad del método, eje 10).
 */
const PRESCRIPCION: Record<SlotKey, {
  series: number; reps: number; trabajoSeg: number; descansoSeg: number;
  miniSeries: number; microDescansoSeg: number;
}> = {
  multi_pesado:           { series: 4, reps: 5,  trabajoSeg: 35, descansoSeg: 180, miniSeries: 0, microDescansoSeg: 0 },
  multi_metabolico:       { series: 4, reps: 12, trabajoSeg: 40, descansoSeg: 30,  miniSeries: 0, microDescansoSeg: 0 },
  especifico_fuerza:      { series: 3, reps: 6,  trabajoSeg: 30, descansoSeg: 150, miniSeries: 0, microDescansoSeg: 0 },
  especifico_metabolico:  { series: 3, reps: 15, trabajoSeg: 45, descansoSeg: 30,  miniSeries: 0, microDescansoSeg: 0 },
  multi_sarcomerico:      { series: 3, reps: 10, trabajoSeg: 40, descansoSeg: 90,  miniSeries: 3, microDescansoSeg: 5 },
  especifico_sarcomerico: { series: 3, reps: 10, trabajoSeg: 35, descansoSeg: 90,  miniSeries: 3, microDescansoSeg: 5 },
  unilateral_fuerza:      { series: 3, reps: 6,  trabajoSeg: 30, descansoSeg: 150, miniSeries: 0, microDescansoSeg: 0 },
  unilateral_metabolico:  { series: 3, reps: 12, trabajoSeg: 40, descansoSeg: 30,  miniSeries: 0, microDescansoSeg: 0 },
  unilateral_sarcomerico: { series: 3, reps: 10, trabajoSeg: 35, descansoSeg: 90,  miniSeries: 3, microDescansoSeg: 5 },
  recovery:               { series: 1, reps: 60, trabajoSeg: 60, descansoSeg: 15,  miniSeries: 0, microDescansoSeg: 0 },
};

// ── PRNG determinista (mulberry32 sobre hash del seed) ──

function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Filtros (Akinator) ──

const PATRONES_ENFOQUE: Record<EnfoquePatron, Patron[]> = {
  full_body: ['Empuje', 'Tracción', 'Bisagra', 'Sentadilla', 'Zancada', 'Anti-rotación/Rotación', 'Anti-extensión (core)', 'Locomoción'],
  tren_superior: ['Empuje', 'Tracción'],
  empuje: ['Empuje'],
  traccion: ['Tracción'],
  pierna_empuje: ['Sentadilla', 'Zancada'],
  pierna_traccion: ['Bisagra'],
};

function matchEnfoque(ex: MatrixExercise, enfoque: Enfoque): boolean {
  if (enfoque.kind === 'patron') {
    return PATRONES_ENFOQUE[enfoque.enfoque].includes(ex.patron);
  }
  // Bro-split: el ejercicio impacta alguno de los músculos elegidos
  // (principal o secundarios, vía grupos del eje 4).
  return enfoque.musculos.some((grupo) => {
    const miembros = GRUPOS_MUSCULARES[grupo] ?? [grupo];
    if (miembros.includes(ex.musculoPrincipal)) return true;
    return ex.secundarios.some((sec) => miembros.some((m) => sec.startsWith(m)));
  });
}

/** Rank de nivel de usuario acotado al rank máximo de ejercicio (Avanzado=2). */
function rankUsuarioComoEjercicio(nivel: NivelUsuario): number {
  return Math.min(NIVEL_USUARIO_RANK[nivel], 2);
}

/**
 * Filtros duros del Akinator: enfoque → equipo → contraindicaciones → nivel →
 * senior. La sustitución por contraindicación/equipo emerge sola: al excluir
 * una variante, sobrevive otra de la MISMA familia que sí pasa los filtros.
 */
export function filtrarPool(input: GeneratorInput): MatrixExercise[] {
  const equipoSet = new Set(input.equipo);
  const flags = new Set(input.contraindicaciones);
  const rankMax = rankUsuarioComoEjercicio(input.nivel);
  return input.catalogo.filter((ex) => {
    if (ex.patron !== 'Estiramiento' && !matchEnfoque(ex, input.enfoque)) return false;
    if (!equipoDisponible(ex.equipo, equipoSet)) return false;
    if (ex.contraindicaciones.some((c) => flags.has(c))) return false;
    if (NIVEL_EJERCICIO_RANK[ex.nivel] > rankMax) return false;
    if (input.senior && !ex.seniorApto) return false;
    return true;
  });
}

// ── Elegibilidad por slot (un ejercicio entra SOLO si sus pills lo declaran) ──

function elegibleParaSlot(ex: MatrixExercise, slot: SlotKey): boolean {
  const q = ex.cualidades;
  const esMulti = ex.tipo === 'Multiarticular';
  const esUni = ex.lateralidad === 'Unilateral';
  const metabolico = q.includes('metabólico') || q.includes('resistencia');
  switch (slot) {
    // "multiarticular pesado" exige además cargable = Sí (flexiones NO son fuerza pesada).
    case 'multi_pesado': return esMulti && ex.cargable && q.includes('fuerza');
    case 'multi_metabolico': return esMulti && metabolico;
    case 'especifico_fuerza': return !esMulti && ex.cargable && q.includes('fuerza');
    case 'especifico_metabolico': return !esMulti && metabolico;
    case 'multi_sarcomerico': return esMulti && q.includes('hipertrofia');
    case 'especifico_sarcomerico': return !esMulti && q.includes('hipertrofia');
    case 'unilateral_fuerza': return esUni && ex.cargable && q.includes('fuerza');
    case 'unilateral_metabolico': return esUni && metabolico;
    case 'unilateral_sarcomerico': return esUni && q.includes('hipertrofia');
    case 'recovery':
      return ex.patron === 'Estiramiento' || q.includes('movilidad') || q.includes('recovery') || q.includes('estabilidad');
  }
}

// ── Tiempo (eje 10) ──

/**
 * `Σ series × (trabajo + descanso_entre_series)` + `mini-series × micro-descanso`.
 * Unilateral dobla el tiempo de trabajo (ambos lados).
 */
export function tiempoBloqueSeg(slot: SlotKey, esUnilateral: boolean, esIsometrico: boolean): number {
  const p = PRESCRIPCION[slot];
  const trabajo = (esUnilateral ? 2 : 1) * (esIsometrico ? p.reps : p.trabajoSeg);
  const minisTotales = p.series * p.miniSeries;
  return p.series * (trabajo + p.descansoSeg) + minisTotales * p.microDescansoSeg;
}

// ── Método ejecutable por slot (conecta con el runner unificado, Track E) ──

function asignarMetodo(ex: MatrixExercise, slot: SlotKey, nivel: NivelUsuario): RoutineBlock['metodo'] {
  const tiene = (m: MetodoATP) => ex.metodos.includes(m);
  if (slot === 'multi_pesado' || slot === 'especifico_fuerza' || slot === 'unilateral_fuerza') {
    return tiene('3-5') ? '3-5' : 'Estándar';
  }
  if (slot === 'multi_metabolico' || slot === 'especifico_metabolico' || slot === 'unilateral_metabolico') {
    return tiene('EMOM Auto') && emomPermitido(ex.emomApto, nivel) ? 'EMOM Auto' : 'Estándar';
  }
  if (slot === 'multi_sarcomerico' || slot === 'especifico_sarcomerico' || slot === 'unilateral_sarcomerico') {
    return tiene('Myo-reps') && ex.dinamica !== 'Isométrico' ? 'Myo-reps' : 'Estándar';
  }
  return 'Estándar';
}

// ── Generador ──

function construirBloque(ex: MatrixExercise, slot: SlotKey, nivel: NivelUsuario): RoutineBlock {
  const p = PRESCRIPCION[slot];
  const esIso = ex.dinamica === 'Isométrico';
  const esUni = ex.lateralidad === 'Unilateral';
  return {
    slug: ex.slug,
    nombre: ex.nombre,
    mediaUrl: ex.mediaUrl,
    slot,
    metodo: asignarMetodo(ex, slot, nivel),
    series: p.series,
    reps: esIso ? p.trabajoSeg : p.reps,
    esIsometrico: esIso,
    esUnilateral: esUni,
    descansoSeg: p.descansoSeg,
    miniSeries: p.miniSeries,
    microDescansoSeg: p.microDescansoSeg,
    tiempoSeg: tiempoBloqueSeg(slot, esUni, esIso),
    musculoPrincipal: ex.musculoPrincipal,
    patron: ex.patron,
    familia: ex.familia,
  };
}

/**
 * Genera la rutina del día. Determinista: mismo input (incluido seed) ⇒
 * misma rutina, byte a byte.
 */
export function generarRutina(input: GeneratorInput): GeneratedRoutine {
  const avisos: string[] = [];
  const rand = mulberry32(hashString(input.seed));
  const recientes = new Set(input.slugsRecientes ?? []);

  // Techo de capacidad: el tiempo LLENA hasta el techo, nunca más.
  const techoMin = Math.round(TECHO_CAPACIDAD_MIN[input.nivel] * (input.senior ? FACTOR_SENIOR : 1));
  const tiempoEfectivoMin = Math.min(input.tiempoMin, techoMin);
  if (input.tiempoMin > techoMin) {
    avisos.push(
      `Tu techo de volumen recuperable hoy es ~${techoMin} min. Más volumen no es más progreso: ` +
      `el excedente va a movilidad y recovery.`,
    );
  }
  const presupuestoSeg = tiempoEfectivoMin * 60;

  const pool = filtrarPool(input);

  // Honestidad: sin equipo cargable y objetivo fuerza → sesga y lo dice.
  let objetivo = input.objetivo;
  const hayPesado = pool.some((ex) => elegibleParaSlot(ex, 'multi_pesado') || elegibleParaSlot(ex, 'especifico_fuerza'));
  if (objetivo === 'fuerza' && !hayPesado) {
    avisos.push(
      'Sin equipo cargable no hay estímulo real de fuerza pesada. Hoy la sesión trabaja ' +
      'resistencia e hipertrofia — cuando tengas carga externa, volvemos a fuerza.',
    );
    objetivo = 'hipertrofia';
  }

  // Máximo de multiarticulares pesados por nivel; si ayer fue pesado, hoy 0.
  let pesadosRestantes = MAX_MULTI_PESADOS[input.nivel];
  if (objetivo === 'metabolico') pesadosRestantes = Math.min(pesadosRestantes, 1);
  if (input.ayerFuePesado) {
    pesadosRestantes = 0;
    avisos.push('Ayer fue sesión pesada: hoy el estímulo va a metabólico y sarcomérico.');
  }

  const bloques: RoutineBlock[] = [];
  const usados = new Set<string>();
  const familiasUsadas = new Set<string>();
  const patronesUsados = new Map<string, number>();
  const musculosUsados = new Map<string, number>();
  let tiempoAcum = 0;

  // Reserva para 1-2 recovery al final (siempre caben si hay presupuesto).
  const pRec = PRESCRIPCION.recovery;
  const recoverySeg = pRec.series * (pRec.trabajoSeg + pRec.descansoSeg);
  const reservaRecovery = Math.min(2 * recoverySeg, Math.max(recoverySeg, presupuestoSeg * 0.08));

  const elegirCandidato = (slot: SlotKey): MatrixExercise | null => {
    const candidatos = pool.filter((ex) =>
      elegibleParaSlot(ex, slot) && !usados.has(ex.slug) &&
      (slot === 'recovery' || ex.patron !== 'Estiramiento'),
    );
    if (candidatos.length === 0) return null;
    // Rank de preferencia: rota primario dentro de su familia (anti-repetición),
    // balancea patrones y músculos, y acerca el nivel del ejercicio al del usuario.
    const prefRank = rankUsuarioComoEjercicio(input.nivel);
    const score = (ex: MatrixExercise): number => {
      let s = 0;
      if (recientes.has(ex.slug)) s += 100;           // ayer NO se repite el primario
      if (familiasUsadas.has(ex.familia)) s += 40;    // diversidad de familias hoy
      s += (patronesUsados.get(ex.patron) ?? 0) * 12; // no 3 empujes seguidos
      s += (musculosUsados.get(ex.musculoPrincipal) ?? 0) * 8;
      s += Math.abs(NIVEL_EJERCICIO_RANK[ex.nivel] - prefRank) * 6; // progresa/regresa en familia
      return s;
    };
    const ordenados = [...candidatos].sort((a, b) => {
      const d = score(a) - score(b);
      return d !== 0 ? d : a.slug.localeCompare(b.slug); // desempate estable
    });
    // Rotación: elección seeded dentro del mejor bucket de score.
    const mejorScore = score(ordenados[0]);
    const bucket = ordenados.filter((ex) => score(ex) === mejorScore);
    return bucket[Math.floor(rand() * bucket.length)];
  };

  const colocar = (ex: MatrixExercise, slot: SlotKey): boolean => {
    const bloque = construirBloque(ex, slot, input.nivel);
    if (tiempoAcum + bloque.tiempoSeg > presupuestoSeg - reservaRecovery) return false;
    bloques.push(bloque);
    usados.add(ex.slug);
    familiasUsadas.add(ex.familia);
    patronesUsados.set(ex.patron, (patronesUsados.get(ex.patron) ?? 0) + 1);
    musculosUsados.set(ex.musculoPrincipal, (musculosUsados.get(ex.musculoPrincipal) ?? 0) + 1);
    tiempoAcum += bloque.tiempoSeg;
    return true;
  };

  // Escalera de slots: pasadas completas en orden hasta agotar presupuesto.
  const MAX_PASADAS = 4;
  for (let pasada = 0; pasada < MAX_PASADAS; pasada++) {
    let colocoAlgo = false;
    for (const slot of ESCALERA) {
      if (slot === 'multi_pesado' && pesadosRestantes <= 0) continue;
      // Con objetivo metabólico los slots de fuerza específica ceden su lugar.
      if (objetivo === 'metabolico' && (slot === 'especifico_fuerza' || slot === 'unilateral_fuerza')) continue;
      const ex = elegirCandidato(slot);
      if (!ex) continue;
      if (colocar(ex, slot)) {
        colocoAlgo = true;
        if (slot === 'multi_pesado') pesadosRestantes--;
      }
    }
    if (!colocoAlgo) break;
  }

  // +1-2 recovery/prehab al cierre de la escalera.
  for (let i = 0; i < 2; i++) {
    if (tiempoAcum + recoverySeg > presupuestoSeg) break;
    const ex = elegirCandidato('recovery');
    if (!ex) break;
    const bloque = construirBloque(ex, 'recovery', input.nivel);
    bloques.push(bloque);
    usados.add(ex.slug);
    tiempoAcum += bloque.tiempoSeg;
  }

  const recoveryExtraMin = Math.max(0, input.tiempoMin - techoMin);

  if (bloques.length === 0) {
    avisos.push('Con esos filtros no queda ningún ejercicio ejecutable. Suelta un filtro (equipo o enfoque) y vuelve a generar.');
  }

  return {
    bloques,
    tiempoTotalSeg: tiempoAcum,
    tiempoEfectivoMin,
    techoMin,
    avisos,
    recoveryExtraMin,
    seed: input.seed,
  };
}
