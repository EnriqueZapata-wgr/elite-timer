/**
 * OLA 4 · Tipos del registry de evaluaciones (Anexo C).
 *
 * Los 4 motores de cuestionario comparten el mismo autómata
 * (intro > pregunta[i] > resultado) y difieren en cinco ejes que son DATOS,
 * no arquitectura: de dónde salen las preguntas (bank), cómo se ramifican
 * (branching), cómo se puntúan (score), dónde se guardan (persist) y qué
 * pasa al terminar (result + onComplete).
 *
 * Este módulo es PURO: no importa supabase, ni react-native, ni expo-router.
 * Los descriptores son datos serializables; la capa de ejecución (el motor de
 * /tests/q/[id]) los resuelve a funciones reales. Así el registry se puede
 * testear en node sin levantar la app.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Ejes de clasificación
// ─────────────────────────────────────────────────────────────────────────────

/** Qué tipo de experiencia es. */
export type AssessmentKind =
  | 'quiz'      // se responde con preguntas: vive en /tests/q/[id]
  | 'physical'  // se mide con el cuerpo: vive en /tests/run/[id]
  | 'special';  // pantalla propia justificada (Braverman)

/** Las 4 secciones colapsables del hub /tests. */
export type AssessmentSection =
  | 'funcional'
  | 'clinico'
  | 'edad'
  | 'fisico';

/**
 * Piezas que no se listan como fila normal del hub.
 * 'hero' es la cabecera editorial (Braverman); 'master' es la card destacada
 * del Cuestionario Maestro.
 */
export type AssessmentHighlight = 'hero' | 'master';

// ─────────────────────────────────────────────────────────────────────────────
// Eje 1 · Banco de preguntas
// ─────────────────────────────────────────────────────────────────────────────

/** Módulos const que ya contienen bancos de preguntas. */
export type ConstBankModule =
  | 'functional-quizzes'      // src/constants/functional-quizzes.ts
  | 'master-quiz-bank'        // src/constants/master-quiz-bank.ts
  | 'braverman-questions'     // src/constants/braverman-questions.ts
  | 'historia-clinica'        // src/constants/historia-clinica-questionnaires.ts
  | 'edad-questionnaires';    // hoy inline en app/edad-atp/questionnaires/*, se mueve en la pieza del runner

export type BankRef =
  /** Banco en un const del repo. `key` identifica el quiz dentro del módulo. */
  | { kind: 'const'; module: ConstBankModule; key?: string }
  /** Banco en base de datos. */
  | { kind: 'db'; table: 'quizzes' | 'quiz_templates'; column: string; value: string }
  /** No tiene preguntas: se mide (tests físicos). */
  | { kind: 'none' };

// ─────────────────────────────────────────────────────────────────────────────
// Eje 2 · Ramificación
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cómo decide el motor qué pregunta sigue.
 * 'linear' recorre el arreglo tal cual. 'visibility' delega en master-quiz-core
 * (género, deep dives, skipWhen), que ya es puro y testeable.
 */
export type BranchingRef =
  | { kind: 'linear' }
  | { kind: 'visibility'; core: 'master-quiz-core' };

// ─────────────────────────────────────────────────────────────────────────────
// Eje 3 · Puntuación
// ─────────────────────────────────────────────────────────────────────────────

export type ScoreRef =
  /** Cada respuesta verdadera suma `weight` a su dominio; los insights se activan por umbral. */
  | { kind: 'weights' }
  /** Promedio de los scores por dominio, redondeado y acotado a 0..100. */
  | { kind: 'avg-clamp'; min: number; max: number }
  /** Reglas por código de pregunta hacia niveles DX, raíces y contraindicaciones. */
  | { kind: 'phenotype' }
  /** Suma por categoría y gana la mayor, con desempate declarado. */
  | { kind: 'sum-max'; tieBreak: string[] }
  /** Cuestionario de dominio de Edad ATP: cada respuesta mapea a un parámetro. */
  | { kind: 'domain-parameters'; domain: string }
  /** Captura de un valor medido. */
  | { kind: 'measure'; unit: string }
  /** No puntúa: solo levanta datos. */
  | { kind: 'none' };

// ─────────────────────────────────────────────────────────────────────────────
// Eje 4 · Persistencia y estado de completado
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cómo se sabe, leyendo la tabla, que la persona ya terminó.
 * useAssessmentCompletion() agrupa por tabla y consulta todo de una vez.
 */
export type CompletionRule =
  /** Columna booleana en true. */
  | { rule: 'flag'; column: string }
  /** Columna de fecha no nula. */
  | { rule: 'not-null'; column: string }
  /** Basta con que exista el renglón del usuario. */
  | { rule: 'row-exists' }
  /** Existe al menos un renglón con matchColumn = matchValue. */
  | { rule: 'match-exists' }
  /** La llave existe dentro de una columna JSONB. */
  | { rule: 'json-key'; column: string; key: string }
  /** Se calcula en memoria con el core puro (el Maestro). */
  | { rule: 'pure' };

export interface PersistRef {
  /** Tabla principal donde aterriza el resultado. */
  table: string;
  /** Columna que distingue este assessment dentro de la tabla. */
  matchColumn?: string;
  /** Valor de esa columna para este assessment. */
  matchValue?: string;
  /** Tablas espejo que también reciben el dato (mejor esfuerzo). */
  mirrors?: { table: string; matchColumn?: string; matchValue?: string }[];
  /**
   * Columna de fecha que el hub muestra junto a la palomita.
   * Se declara explícita porque no todas las tablas la nombran igual:
   * completed_at, measured_at y updated_at conviven en el esquema.
   */
  dateColumn?: string;
  /** Cómo se detecta el completado al leer. */
  completion: CompletionRule;
  /** Si el motor puede guardar avance parcial y retomar. */
  resumable: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Eje 5 · Resultado y efectos
// ─────────────────────────────────────────────────────────────────────────────

export type ResultRef =
  /** El resultado se pinta al terminar, dentro del propio motor. */
  | { kind: 'inline' }
  /** El resultado vive en su propia ruta persistente. */
  | { kind: 'route'; route: string };

/** Qué dispara la app cuando alguien termina. */
export type CompletionEffect =
  | { effect: 'electron'; source: string }
  | { effect: 'emit'; event: string }
  | { effect: 'protocols' }
  | { effect: 'profile-flag'; column: string };

// ─────────────────────────────────────────────────────────────────────────────
// Modos del runner físico
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 'stopwatch': la app cronometra. 'capture': la persona mide afuera y captura.
 * 'reactive': el teléfono ES el instrumento.
 */
export type PhysicalMode = 'stopwatch' | 'capture' | 'reactive';

// ─────────────────────────────────────────────────────────────────────────────
// La entrada del registry
// ─────────────────────────────────────────────────────────────────────────────

export interface Assessment {
  /** Identificador estable. Es el [id] de la ruta. */
  id: string;
  kind: AssessmentKind;
  title: string;
  subtitle?: string;
  section: AssessmentSection;
  /** Fuera de la lista normal: cabecera o card destacada. */
  highlight?: AssessmentHighlight;
  /** Ionicons. */
  icon?: string;
  /** Acento hex del catálogo original. */
  color?: string;
  estimatedMinutes?: number;
  /** Modo del runner, solo para kind 'physical'. */
  mode?: PhysicalMode;

  bank: BankRef;
  branching?: BranchingRef;
  score: ScoreRef;
  persist: PersistRef;
  result: ResultRef;
  onComplete?: CompletionEffect[];

  /** Ruta destino en la arquitectura nueva. */
  route: string;
  /**
   * true cuando la ruta nueva YA existe y recibe gente.
   * Mientras es false, el hub manda a la primera de legacyRoutes: así el hub
   * sirve desde el primer commit y ninguna fila queda muerta mientras el motor
   * y el runner se van construyendo. Cada pieza que aterriza prende su bandera.
   */
  live?: boolean;
  /** Rutas viejas que deben redirigir aquí (alimenta LEGACY_ROUTES). */
  legacyRoutes?: string[];
}
