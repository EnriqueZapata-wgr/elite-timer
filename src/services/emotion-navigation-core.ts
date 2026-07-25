/**
 * Emotion Navigation Core — lógica PURA de la navegación emocional (MB-4 · Bloque 2).
 *
 * El diferenciador: el mapa no es solo para ubicarte, es para MOVERTE.
 * Este núcleo decide, de forma determinista y testeable:
 *  - qué movimientos ofrece cada cuadrante (flujo decidido por Enrique, spec §4),
 *  - la CADENA de emociones vecinas que el usuario ve al desplazarse
 *    (furia → enojo → frustración → …), y
 *  - qué herramientas concretas son el vehículo de cada movimiento (spec §2).
 *
 * Reglas no negociables (spec §3) que este núcleo garantiza:
 *  - Señales de crisis ROMPEN el flujo → acompañamiento, no reframing.
 *  - Baja·agradable y alta·agradable no "se arreglan": se saborean / canalizan.
 *  - Baja·desagradable NO se empuja hacia arriba: solo voltear.
 *
 * Sin imports de react-native/supabase → Vitest node.
 */
import { EMOTIONS, type Emotion, type QuadrantKey } from '../data/emotions-library';
import {
  type EmotionMove, type CognitiveStrategy, type RegulationTool,
  TOOLS_BAJAR_YA, TOOLS_BAJAR_SOSTENER, TOOLS_FUNDIDO, TOOLS_ALTA_DESAGRADABLE,
  TOOLS_VOLTEAR, TOOL_EVIDENCIA, TOOLS_CANALIZAR, TOOLS_SABOREAR, TOOL_CRISIS,
  FRAMING_PHRASES, MOVE_QUESTIONS, MOVE_SUBTEXT,
} from '../data/emotion-navigation';
import { fnv1a } from './emotion-map-core';

const BY_ID = new Map(EMOTIONS.map((e) => [e.id, e]));

/** Emociones cuya selección es señal de crisis: el flujo se rompe. */
const CRISIS_EMOTION_IDS = new Set(['panicked']);

export function isCrisisOrigin(emotionId: string): boolean {
  return CRISIS_EMOTION_IDS.has(emotionId);
}

/** Frase que encuadra — rotación determinista por fecha local (misma frase todo el día). */
export function pickFramingPhrase(dateKey: string): string {
  return FRAMING_PHRASES[fnv1a(dateKey) % FRAMING_PHRASES.length];
}

// ═══ CADENAS DE VECINOS ═══

const isPleasant = (q: QuadrantKey) => q === 'high_pleasant' || q === 'low_pleasant';

/**
 * Cadena de descenso (↓): versiones más manejables de lo mismo. Cada paso baja
 * energía Y baja intensidad, sin cambiar de lado. El usuario LEE el camino:
 * eso — ver que se puede bajar — es el ejercicio.
 */
export function buildDescentChain(originId: string, maxSteps = 3): Emotion[] {
  const origin = BY_ID.get(originId);
  if (!origin) return [];
  const side = isPleasant(origin.quadrant);
  const chain: Emotion[] = [origin];
  let current = origin;
  for (let step = 0; step < maxSteps; step++) {
    const candidates = EMOTIONS.filter((e) =>
      isPleasant(e.quadrant) === side &&
      !chain.some((c) => c.id === e.id) &&
      e.energy < current.energy - 0.2 &&
      e.intensity <= current.intensity - 1,
    );
    if (candidates.length === 0) break;
    // El paso más CERCANO hacia abajo (no saltar al fondo): determinista,
    // desempate alfabético por id.
    candidates.sort((a, b) => {
      const sa = (current.energy - a.energy) + 0.7 * (current.intensity - a.intensity);
      const sb = (current.energy - b.energy) + 0.7 * (current.intensity - b.intensity);
      if (sa !== sb) return sa - sb;
      return a.id < b.id ? -1 : 1;
    });
    current = candidates[0];
    chain.push(current);
    if (current.energy <= 4) break; // ya llegó a zona manejable
  }
  return chain;
}

/**
 * Cadena de volteo (→): cruzar hacia el lado agradable con energía similar,
 * y de ahí un paso más hacia algo sostenible (menor intensidad).
 * frustración → determinación → foco.
 */
export function buildFlipChain(originId: string): Emotion[] {
  const origin = BY_ID.get(originId);
  if (!origin || isPleasant(origin.quadrant)) return origin ? [origin] : [];
  const chain: Emotion[] = [origin];

  const pleasant = EMOTIONS.filter((e) => isPleasant(e.quadrant));
  const score1 = (e: Emotion) =>
    Math.abs(e.energy - origin.energy) + 0.5 * Math.abs(e.intensity - origin.intensity);
  const bridge = [...pleasant].sort((a, b) => {
    const d = score1(a) - score1(b);
    if (d !== 0) return d;
    return a.id < b.id ? -1 : 1;
  })[0];
  if (!bridge) return chain;
  chain.push(bridge);

  // Paso 2: algo sostenible — parecido en energía al puente, menos intenso.
  const settle = pleasant
    .filter((e) => e.id !== bridge.id && e.intensity < bridge.intensity)
    .sort((a, b) => {
      const sa = Math.abs(a.energy - bridge.energy) + 0.4 * a.intensity;
      const sb = Math.abs(b.energy - bridge.energy) + 0.4 * b.intensity;
      if (sa !== sb) return sa - sb;
      return a.id < b.id ? -1 : 1;
    })[0];
  if (settle) chain.push(settle);
  return chain;
}

// ═══ HERRAMIENTAS POR MOVIMIENTO ═══

/**
 * Estrategia cognitiva para VOLTEAR según la emoción de origen (spec §2,
 * columna "cuándo sirve"). Fallback: distanciamiento temporal.
 */
const STRATEGY_SETS: [CognitiveStrategy, string[]][] = [
  ['autocompasion', ['guilty', 'ashamed', 'humiliated', 'regretful', 'insecure', 'insecure_low']],
  ['aceptacion', ['resentful', 'bitter', 'jealous', 'envious', 'hostile', 'defensive', 'angry', 'enraged', 'irritated', 'annoyed', 'disgusted', 'exasperated']],
  ['proceso', ['frustrated', 'impatient', 'stuck', 'conflicted', 'trapped']],
  ['agencia', ['hopeless', 'helpless', 'powerless', 'defeated', 'unmotivated', 'lost', 'apathetic', 'numb', 'empty', 'bored', 'indifferent', 'afraid', 'terrified', 'desperate', 'out_of_control', 'burned_out']],
  ['presencia', ['worried', 'anxious', 'nervous', 'restless', 'agitated', 'overwhelmed', 'stressed', 'pressured', 'tense', 'shocked', 'hyper', 'confused']],
  ['distanciamiento', ['sad', 'melancholic', 'homesick', 'lonely', 'abandoned', 'rejected', 'excluded', 'misunderstood', 'invisible', 'disappointed', 'let_down', 'depressed', 'fragile', 'vulnerable', 'disconnected', 'withdrawn', 'tired', 'exhausted', 'drained', 'pessimistic']],
];

export function strategyForEmotion(emotionId: string): CognitiveStrategy {
  for (const [strategy, ids] of STRATEGY_SETS) {
    if (ids.includes(emotionId)) return strategy;
  }
  return 'distanciamiento';
}

/** ¿"Fundido" y no solo activado? → recuperación real, no relajación. */
const DEPLETED_IDS = new Set(['exhausted', 'drained', 'burned_out', 'tired', 'depleted', 'numb', 'empty', 'apathetic']);

/** Herramientas para BAJAR según el estado de origen. Máx 4, sin relleno. */
export function toolsForBajar(originId: string): RegulationTool[] {
  const origin = BY_ID.get(originId);
  const tools: RegulationTool[] = [...TOOLS_BAJAR_YA];
  if (origin && ['anxious', 'stressed', 'overwhelmed', 'panicked', 'nervous', 'worried', 'agitated'].includes(originId)) {
    tools.push(TOOLS_ALTA_DESAGRADABLE[1]); // gestión de ansiedad
  } else if (origin && ['angry', 'enraged', 'frustrated', 'tense', 'pressured', 'exasperated'].includes(originId)) {
    tools.push(TOOLS_ALTA_DESAGRADABLE[0]); // descarga de estrés
  } else {
    tools.push(TOOLS_BAJAR_SOSTENER[0]); // escaneo corporal
  }
  tools.push(TOOLS_BAJAR_SOSTENER[1]); // respiración coherente
  return tools.slice(0, 4);
}

/** Herramientas para VOLTEAR: la estrategia que aplica + ARGOS (tu evidencia). */
export function toolsForVoltear(originId: string): RegulationTool[] {
  const origin = BY_ID.get(originId);
  // Fundido de verdad → antes de cualquier reframing, recuperación.
  if (origin && DEPLETED_IDS.has(originId)) {
    return [...TOOLS_FUNDIDO, TOOL_EVIDENCIA];
  }
  const strategy = strategyForEmotion(originId);
  return [...TOOLS_VOLTEAR[strategy], TOOL_EVIDENCIA].slice(0, 4);
}

// ═══ EL PLAN COMPLETO ═══

export interface PlannedMove {
  move: EmotionMove;
  question: string;
  subtext: string;
  /** Ids de la cadena que la cámara recorre (incluye el punto de partida). */
  chainIds: string[];
  tools: RegulationTool[];
}

export interface NavigationPlan {
  originId: string;
  quadrant: QuadrantKey;
  /** true → el flujo se rompe: acompañamiento, no reframing. */
  crisis: boolean;
  moves: PlannedMove[];
  crisisTool?: RegulationTool;
}

/**
 * Plan de navegación por cuadrante (flujo §4, decidido por Enrique):
 *  - alta·desagradable → DOS movimientos: bajar (↓) y luego voltear (→)
 *    (el volteo parte de donde terminó el descenso).
 *  - baja·desagradable → UNO: solo voltear. Subirla a la fuerza sería empujar.
 *  - alta·agradable → canalizar. baja·agradable → saborear.
 */
export function buildNavigationPlan(originId: string): NavigationPlan | null {
  const origin = BY_ID.get(originId);
  if (!origin) return null;

  if (isCrisisOrigin(originId)) {
    return { originId, quadrant: origin.quadrant, crisis: true, moves: [], crisisTool: TOOL_CRISIS };
  }

  const moves: PlannedMove[] = [];
  const mk = (move: EmotionMove, chainIds: string[], tools: RegulationTool[]): PlannedMove => ({
    move, question: MOVE_QUESTIONS[move], subtext: MOVE_SUBTEXT[move], chainIds, tools,
  });

  switch (origin.quadrant) {
    case 'high_unpleasant': {
      const descent = buildDescentChain(originId);
      moves.push(mk('bajar', descent.map((e) => e.id), toolsForBajar(originId)));
      const flipStart = descent[descent.length - 1] ?? origin;
      const flip = buildFlipChain(flipStart.id);
      moves.push(mk('voltear', flip.map((e) => e.id), toolsForVoltear(originId)));
      break;
    }
    case 'low_unpleasant': {
      const flip = buildFlipChain(originId);
      moves.push(mk('voltear', flip.map((e) => e.id), toolsForVoltear(originId)));
      break;
    }
    case 'high_pleasant':
      moves.push(mk('canalizar', [originId], TOOLS_CANALIZAR));
      break;
    case 'low_pleasant':
      moves.push(mk('saborear', [originId], TOOLS_SABOREAR));
      break;
  }

  return { originId, quadrant: origin.quadrant, crisis: false, moves };
}
