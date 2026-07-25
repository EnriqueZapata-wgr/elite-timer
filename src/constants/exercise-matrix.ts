/**
 * Exercise Matrix — constantes canónicas y tipos espejo de la tabla
 * `exercise_matrix` (migraciones 220/221, seed generado desde el xlsx por
 * scripts/generate-exercise-matrix-seed.py).
 *
 * FUENTE ÚNICA de los valores de los 11 ejes (R and D/MATRIZ_FITNESS_DIMENSIONES.md).
 * Ni el generador ni la UI usan strings sueltos: todo sale de aquí.
 */

// ── Eje 1 · Patrón de movimiento ──
export const PATRONES = [
  'Empuje', 'Tracción', 'Bisagra', 'Sentadilla', 'Zancada',
  'Anti-rotación/Rotación', 'Anti-extensión (core)', 'Locomoción', 'Estiramiento',
] as const;
export type Patron = (typeof PATRONES)[number];

// ── Eje 2 · Dinámica (tempo) ──
export const DINAMICAS = ['Explosivo', 'Normal', 'Súper-lento', 'Isométrico'] as const;
export type Dinamica = (typeof DINAMICAS)[number];

// ── Eje 3 · Lateralidad ──
export const LATERALIDADES = ['Bilateral', 'Unilateral'] as const;
export type Lateralidad = (typeof LATERALIDADES)[number];

// ── Eje 4 · Musculatura (granularidad intermedia) ──
export const MUSCULOS_PRINCIPALES = [
  'Pecho', 'Dorsal', 'Trapecio', 'Espalda baja',
  'Deltoides anterior', 'Deltoides anterior/medio', 'Deltoides medio', 'Deltoides posterior',
  'Bíceps', 'Tríceps', 'Antebrazo', 'Antebrazo/Grip',
  'Core', 'Glúteo', 'Cuádriceps', 'Isquiotibiales', 'Pantorrilla', 'Cuerpo completo',
] as const;
export type MusculoPrincipal = (typeof MUSCULOS_PRINCIPALES)[number];

/**
 * Músculo principal puede venir compuesto ("Cuádriceps, Glúteo" — broad-jump).
 * Los filtros por grupo deben matchear cualquiera de las partes.
 */
export function musculosPrincipalesDe(musculoPrincipal: string): string[] {
  return musculoPrincipal.split(',').map((m) => m.trim()).filter(Boolean);
}

/** Grupos para pills de filtro y bro-split (multiselect por músculo). */
export const GRUPOS_MUSCULARES: Record<string, string[]> = {
  Pecho: ['Pecho'],
  Espalda: ['Dorsal', 'Trapecio', 'Espalda baja'],
  Hombro: ['Deltoides anterior', 'Deltoides anterior/medio', 'Deltoides medio', 'Deltoides posterior'],
  Bíceps: ['Bíceps'],
  Tríceps: ['Tríceps'],
  Antebrazo: ['Antebrazo', 'Antebrazo/Grip'],
  Core: ['Core'],
  Glúteo: ['Glúteo'],
  Cuádriceps: ['Cuádriceps'],
  Isquiotibiales: ['Isquiotibiales'],
  Pantorrilla: ['Pantorrilla'],
};

// ── Eje 5 · Equipo ──
/**
 * Tokens que el usuario declara tener. `Peso corporal` se asume SIEMPRE
 * disponible (el cuerpo va con uno). `Lastre` agrupa chaleco/mochila/cinturón
 * de lastre — a nivel de acceso son intercambiables.
 */
export const EQUIPO_TOKENS = [
  'Peso corporal', 'Barra', 'Barra EZ', 'Mancuerna', 'Kettlebell', 'Banda',
  'Cable/Polea', 'Máquina', 'Smith', 'Landmine', 'Disco', 'Barra fija',
  'Paralelas', 'Banca', 'Cajón', 'TRX', 'Lastre',
] as const;
export type EquipoToken = (typeof EQUIPO_TOKENS)[number];

/** Alias del xlsx → token canónico de usuario. */
const NORMALIZA_EQUIPO: Record<string, EquipoToken> = {
  Cable: 'Cable/Polea',
  Polea: 'Cable/Polea',
  Chaleco: 'Lastre',
  'Chaleco de lastre': 'Lastre',
  'Mochila de lastre': 'Lastre',
  'Cinturón de lastre': 'Lastre',
  Lastre: 'Lastre',
};

function normalizaEquipoToken(raw: string): EquipoToken | null {
  const t = raw.trim();
  if (NORMALIZA_EQUIPO[t]) return NORMALIZA_EQUIPO[t];
  return (EQUIPO_TOKENS as readonly string[]).includes(t) ? (t as EquipoToken) : null;
}

/**
 * Parsea el campo `equipo` crudo a requisitos: AND de grupos-OR.
 * "Barra fija + Cinturón de lastre" → [['Barra fija'], ['Lastre']]
 * "Banca / Cajón"                   → [['Banca', 'Cajón']]
 * "Cable/Polea" (token con slash)   → [['Cable/Polea']]
 */
export function parseEquipoRequisitos(equipoRaw: string): EquipoToken[][] {
  const grupos: EquipoToken[][] = [];
  for (const parte of equipoRaw.split('+')) {
    const alternativas = new Set<EquipoToken>();
    // El token canónico entero primero (cubre 'Cable/Polea'); si no, alternativas por '/'.
    const entero = normalizaEquipoToken(parte);
    if (entero) {
      alternativas.add(entero);
    } else {
      for (const alt of parte.split('/')) {
        const tok = normalizaEquipoToken(alt);
        if (tok) alternativas.add(tok);
      }
    }
    if (alternativas.size > 0) grupos.push([...alternativas]);
  }
  return grupos;
}

/** ¿El ejercicio es ejecutable con el equipo del usuario? (filtro DURO). */
export function equipoDisponible(equipoRaw: string, delUsuario: ReadonlySet<string>): boolean {
  const requisitos = parseEquipoRequisitos(equipoRaw);
  return requisitos.every((grupo) =>
    grupo.some((tok) => tok === 'Peso corporal' || delUsuario.has(tok)),
  );
}

// ── Eje 6 · Cualidades (pills — manejan el slotting) ──
export const CUALIDADES = [
  'fuerza', 'hipertrofia', 'potencia', 'resistencia',
  'metabólico', 'movilidad', 'estabilidad', 'recovery',
] as const;
export type Cualidad = (typeof CUALIDADES)[number];

// ── Eje 7 · Nivel ──
/** Nivel del EJERCICIO (xlsx re-taggeado MB-3.5: ahora sí hay filas Atleta). */
export const NIVELES_EJERCICIO = ['Principiante', 'Intermedio', 'Avanzado', 'Atleta'] as const;
export type NivelEjercicio = (typeof NIVELES_EJERCICIO)[number];

/** Nivel del USUARIO (4 niveles — atleta existe para usar sesiones largas). */
export const NIVELES_USUARIO = ['principiante', 'intermedio', 'avanzado', 'atleta'] as const;
export type NivelUsuario = (typeof NIVELES_USUARIO)[number];

export const NIVEL_EJERCICIO_RANK: Record<NivelEjercicio, number> = {
  Principiante: 0, Intermedio: 1, Avanzado: 2, Atleta: 3,
};
export const NIVEL_USUARIO_RANK: Record<NivelUsuario, number> = {
  principiante: 0, intermedio: 1, avanzado: 2, atleta: 3,
};

// ── Eje 8 · Método ATP ──
export const METODOS_ATP = [
  'Estándar', '3-5', 'EMOM Auto', 'Myo-reps', 'Rest-pause', 'Cluster', 'Dropset', 'Superserie',
] as const;
export type MetodoATP = (typeof METODOS_ATP)[number];

export const EMOM_APTO = ['Todos', 'Intermedio+', 'Avanzado', 'No'] as const;
export type EmomApto = (typeof EMOM_APTO)[number];

/** ¿EMOM permitido para este ejercicio dado el nivel del usuario? */
export function emomPermitido(emomApto: EmomApto, nivel: NivelUsuario): boolean {
  switch (emomApto) {
    case 'Todos': return true;
    case 'Intermedio+': return NIVEL_USUARIO_RANK[nivel] >= 1;
    case 'Avanzado': return NIVEL_USUARIO_RANK[nivel] >= 2;
    default: return false;
  }
}

// ── Eje 9 · Contraindicaciones (capa Mariana) ──
export const CONTRAINDICACIONES = [
  'Rodilla', 'Hombro', 'Lumbar/hernia', 'Muñeca', 'Hipertensión (isométrico largo)', 'Aquiles',
] as const;
export type Contraindicacion = (typeof CONTRAINDICACIONES)[number];

// ── Unidades de equipo (candado de cantidad — MB-3.5 #11) ──
/** '1' = basta una pieza · 'par' = requiere par (mancuernas/KB) · 'n/a' = no aplica. */
export const UNIDADES_EQUIPO = ['1', 'par', 'n/a'] as const;
export type UnidadesEquipo = (typeof UNIDADES_EQUIPO)[number];

/** Tokens de equipo donde la cantidad importa (se pregunta 1 vs par). */
export const EQUIPO_CON_UNIDADES = ['Mancuerna', 'Kettlebell'] as const;

// ── Eje 11 · Benchmark de edad ──
export type BenchmarkTier = 'A' | 'B' | null;
export interface BenchmarkEdad {
  tier: BenchmarkTier;
  /** Variante cruda del tag: 'push-ups' | 'plank' | 'max' | 'max lastrado' | '×BW' | 'carry' | 'wall-sit' */
  variante: string | null;
}

/** 'Tier A (push-ups)' → { tier: 'A', variante: 'push-ups' } · 'No' → { tier: null, variante: null } */
export function parseBenchmarkEdad(raw: string | null | undefined): BenchmarkEdad {
  if (!raw || raw === 'No') return { tier: null, variante: null };
  const m = /^Tier ([AB])(?:\s*\(([^)]*)\))?$/.exec(raw.trim());
  if (!m) return { tier: null, variante: null };
  return { tier: m[1] as 'A' | 'B', variante: m[2]?.trim() ?? null };
}

// ── Tipo de la fila + mapeo desde DB ──

export type TipoEjercicio = 'Multiarticular' | 'Aislado';
export type OrigenEjercicio = 'movekit' | 'atp';

export interface MatrixExercise {
  slug: string;
  nombre: string;
  equipo: string;                    // crudo ("Barra fija + Cinturón de lastre")
  equipoRequisitos: EquipoToken[][]; // parseado (AND de grupos-OR)
  cargable: boolean;
  tipo: TipoEjercicio;
  patron: Patron;
  dinamica: Dinamica;
  lateralidad: Lateralidad;
  musculoPrincipal: string;
  secundarios: string[];
  cualidades: Cualidad[];
  nivel: NivelEjercicio;
  seniorApto: boolean;
  metodos: MetodoATP[];
  emomApto: EmomApto;
  benchmark: BenchmarkEdad;
  contraindicaciones: string[];
  familia: string;
  /** Clip mp4 en loop (bucket fitness-clips) tras el seed 223; null sin clip. */
  mediaUrl: string | null;
  /** Poster estático — placeholder mientras carga el clip (y fallback sin video). */
  posterUrl: string | null;
  unidadesEquipo: UnidadesEquipo;
  origen: OrigenEjercicio;
}

/** Fila cruda de `exercise_matrix` (shape de Supabase). */
export interface ExerciseMatrixRow {
  slug: string;
  nombre: string;
  equipo: string;
  cargable: boolean;
  tipo: string;
  patron: string;
  dinamica: string;
  lateralidad: string;
  musculo_principal: string;
  secundarios: string | null;
  cualidades: string[];
  nivel: string;
  senior_apto: boolean;
  metodos: string[];
  emom_apto: string;
  benchmark_edad: string;
  contraindicaciones: string[];
  familia: string;
  media_url: string | null;
  /** Columnas 223 — pueden faltar si la migración aún no corre (fail-soft). */
  poster_url?: string | null;
  unidades_equipo?: string | null;
  origen: string;
}

export function mapMatrixRow(row: ExerciseMatrixRow): MatrixExercise {
  return {
    slug: row.slug,
    nombre: row.nombre,
    equipo: row.equipo,
    equipoRequisitos: parseEquipoRequisitos(row.equipo),
    cargable: row.cargable,
    tipo: row.tipo as TipoEjercicio,
    patron: row.patron as Patron,
    dinamica: row.dinamica as Dinamica,
    lateralidad: row.lateralidad as Lateralidad,
    musculoPrincipal: row.musculo_principal,
    secundarios: row.secundarios
      ? row.secundarios.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    cualidades: (row.cualidades ?? []) as Cualidad[],
    nivel: row.nivel as NivelEjercicio,
    seniorApto: row.senior_apto,
    metodos: (row.metodos ?? []) as MetodoATP[],
    emomApto: row.emom_apto as EmomApto,
    benchmark: parseBenchmarkEdad(row.benchmark_edad),
    contraindicaciones: row.contraindicaciones ?? [],
    familia: row.familia,
    mediaUrl: row.media_url,
    posterUrl: row.poster_url ?? null,
    unidadesEquipo: (UNIDADES_EQUIPO as readonly string[]).includes(row.unidades_equipo ?? '')
      ? (row.unidades_equipo as UnidadesEquipo)
      : 'n/a',
    origen: row.origen as OrigenEjercicio,
  };
}

/**
 * URL de imagen estática segura para cards/posters: poster_url si existe;
 * si media_url aún es imagen (DB pre-223) la usa; nunca devuelve un mp4.
 */
export function posterDe(ex: Pick<MatrixExercise, 'mediaUrl' | 'posterUrl'>): string | null {
  if (ex.posterUrl) return ex.posterUrl;
  if (ex.mediaUrl && !ex.mediaUrl.endsWith('.mp4')) return ex.mediaUrl;
  return null;
}

/** URL de clip mp4 (loop) — null si el catálogo aún no tiene el swap 223. */
export function clipDe(ex: Pick<MatrixExercise, 'mediaUrl'>): string | null {
  return ex.mediaUrl?.endsWith('.mp4') ? ex.mediaUrl : null;
}
