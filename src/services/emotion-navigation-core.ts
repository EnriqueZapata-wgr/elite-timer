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
import {
  EMOTIONS, NO_DESCENT_TARGET_IDS, type Emotion, type QuadrantKey, type EmotionFamily,
} from '../data/emotions-library';
import {
  type EmotionMove, type CognitiveStrategy, type RegulationTool,
  TOOLS_BAJAR_YA, TOOLS_BAJAR_SOSTENER, TOOLS_FUNDIDO, TOOLS_ALTA_DESAGRADABLE,
  TOOLS_VOLTEAR, TOOL_EVIDENCIA, TOOLS_CANALIZAR, TOOLS_SABOREAR, TOOL_CRISIS,
  TOOLS_REENCUADRAR, TOOLS_SUBIR,
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
 * Cadena de descenso (↓): versiones más manejables de LO MISMO. Cada paso baja
 * energía Y baja intensidad, SIN cambiar de familia emocional (MB-4.1 · Bloque A):
 * enojo baja a fastidio, nunca salta a miedo ni navega hacia la zona depresiva.
 * El usuario LEE el camino: eso — ver que se puede bajar — es el ejercicio.
 *
 * Si tras los filtros no hay siguiente paso, la cadena se detiene (mejor 2 pasos
 * honestos que 4 que mienten). Nunca termina en una emoción de anhedonia
 * (NO_DESCENT_TARGET_IDS): esas se pueden nombrar, pero no las ofrecemos como meta.
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
      e.family === origin.family &&           // A.2 · el descenso NO cambia de familia
      !NO_DESCENT_TARGET_IDS.has(e.id) &&      // A.3 · nunca guiar hacia la zona depresiva
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
 * Puente de volteo por FAMILIA DE DESTINO curada (MB-4.1 · Bloque A.5). Antes el
 * puente se elegía por mera cercanía numérica y salían saltos arbitrarios
 * (frustración → asombro, ansiedad → asombro). Ahora cada familia desagradable
 * apunta a una familia agradable coherente:
 *   ira / agobio → foco (canaliza el fuego en determinación y claridad)
 *   miedo → calma (seguridad y presencia frente a la amenaza)
 *   tristeza / vergüenza / rechazo → afecto (calidez y conexión, no juicio)
 *   desconexión → calma (volver a la presencia frente al piloto automático)
 * (Las familias agradables no son origen de volteo; se mapean a sí mismas para
 * que el Record sea total.)
 */
const FLIP_TARGET_FAMILY: Record<EmotionFamily, EmotionFamily> = {
  ira: 'foco',
  agobio: 'foco',
  miedo: 'calma',
  desconexion: 'calma',
  tristeza: 'afecto',
  verguenza: 'afecto',
  rechazo: 'afecto',
  energia: 'energia',
  foco: 'foco',
  afecto: 'afecto',
  calma: 'calma',
  gratitud: 'gratitud',
  curiosidad: 'curiosidad',
};

/**
 * Cadena de volteo (→): cruzar hacia el lado agradable, pero SOLO dentro de la
 * familia de destino curada del origen. Puente = el miembro de esa familia más
 * cercano en energía; luego un paso más a algo sostenible (menor intensidad,
 * misma familia). frustración → foco (Valiente → Con enfoque), no al azar.
 */
export function buildFlipChain(originId: string): Emotion[] {
  const origin = BY_ID.get(originId);
  if (!origin || isPleasant(origin.quadrant)) return origin ? [origin] : [];

  const targetFamily = FLIP_TARGET_FAMILY[origin.family];
  const pool = EMOTIONS.filter((e) => isPleasant(e.quadrant) && e.family === targetFamily);
  if (pool.length === 0) return [origin];
  const chain: Emotion[] = [origin];

  const score1 = (e: Emotion) =>
    Math.abs(e.energy - origin.energy) + 0.5 * Math.abs(e.intensity - origin.intensity);
  const bridge = [...pool].sort((a, b) => {
    const d = score1(a) - score1(b);
    if (d !== 0) return d;
    return a.id < b.id ? -1 : 1;
  })[0];
  chain.push(bridge);

  // Paso 2: algo sostenible — parecido en energía al puente, menos intenso,
  // misma familia de destino (no se dispersa la intención).
  const settle = pool
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

// ═══ REENCUADRE (⇄) — el arco corto de misma activación ═══

/**
 * Familia agradable ENERGIZADA hacia la que se relee una activación desagradable
 * SIN pedir calmarse (análisis v2 §4). Solo para las familias cuya energía es
 * genuinamente re-leíble en positivo:
 *   miedo → energia   (nervios/ansiedad ↔ ganas/emoción: misma activación)
 *   agobio → foco     (la presión ↔ determinación con dirección)
 * La ira NO entra: la furia no se relee como entusiasmo; su camino es bajar.
 */
const REFRAME_TARGET_FAMILY: Partial<Record<EmotionFamily, EmotionFamily>> = {
  miedo: 'energia',
  agobio: 'foco',
};

/** Umbral de activación alta: el reencuadre corto vive arriba, no en la calma. */
const HIGH_AROUSAL = 6;

/**
 * TRACK C (MB-10) · Umbral de salida única: emoción desagradable de ALTA
 * activación con intensidad ≥ este valor → UNA sola salida, y es del cuerpo
 * (bajar). Nada de reencuadrar ni cruzar: con la activación arriba las
 * herramientas cognitivas casi no sirven, y ofrecerlas ahí es preparar a la
 * persona para fallar (ventana de tolerancia · análisis v2 §2).
 *
 * ⚠️ Honestidad: la ventana de tolerancia es un constructo clínico de diseño,
 * NO una medida validada con puntos de corte universales. Este umbral es
 * editable y su calibración final es criterio clínico (Mariana).
 */
export const SINGLE_EXIT_INTENSITY = 6;
/** Máxima diferencia de energía para que el par cuente como "misma activación". */
const REFRAME_ENERGY_TOLERANCE = 3;

/**
 * ¿La emoción tiene un gemelo energético agradable de casi la misma activación?
 * Devuelve el gemelo (la lectura positiva de la misma energía) o null.
 */
export function reframeTwin(originId: string): Emotion | null {
  const origin = BY_ID.get(originId);
  if (!origin || origin.quadrant !== 'high_unpleasant' || origin.energy < HIGH_AROUSAL) return null;
  const targetFamily = REFRAME_TARGET_FAMILY[origin.family];
  if (!targetFamily) return null;
  const twins = EMOTIONS
    .filter((e) => e.quadrant === 'high_pleasant' && e.family === targetFamily &&
      e.energy >= HIGH_AROUSAL && Math.abs(e.energy - origin.energy) <= REFRAME_ENERGY_TOLERANCE)
    .sort((a, b) => {
      const d = Math.abs(a.energy - origin.energy) - Math.abs(b.energy - origin.energy);
      if (d !== 0) return d;
      return a.id < b.id ? -1 : 1;
    });
  return twins[0] ?? null;
}

/**
 * Cadena de reencuadre (⇄): arco CORTO entre vecinas de activación parecida. No
 * baja energía y no cruza medio plano: relee la misma activación en su gemelo
 * agradable. "Estoy nervioso" → "estoy encendido". Dos nodos: origen y gemelo.
 */
export function buildReframeChain(originId: string): Emotion[] {
  const origin = BY_ID.get(originId);
  if (!origin) return [];
  const twin = reframeTwin(originId);
  return twin ? [origin, twin] : [origin];
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

/** Intensidad desde la cual la respiración de arranque es el suspiro
 *  fisiológico (la vía más rápida); debajo, la 4-7-8 (la lenta) va primero.
 *  Track F (MB-10): "la lenta / 4-7-8 según intensidad". */
export const SIGH_FIRST_INTENSITY = 8;

/** Herramientas para BAJAR según el estado de origen. Máx 4, sin relleno.
 *  Es la salida crítica del módulo: la única que se ofrece en activación alta,
 *  y SIEMPRE lleva a una sesión real de respiración del pilar Mente. */
export function toolsForBajar(originId: string): RegulationTool[] {
  const origin = BY_ID.get(originId);
  const [suspiro, resp478] = TOOLS_BAJAR_YA;
  const tools: RegulationTool[] =
    origin && origin.intensity < SIGH_FIRST_INTENSITY ? [resp478, suspiro] : [suspiro, resp478];
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

/** Herramientas para CRUZAR: la estrategia cognitiva que aplica + ARGOS (tu
 *  evidencia). Solo se ofrece dentro de la ventana (ver buildNavigationPlan). */
export function toolsForCruzar(originId: string): RegulationTool[] {
  const origin = BY_ID.get(originId);
  // Fundido de verdad → antes de cualquier reframing, recuperación.
  if (origin && DEPLETED_IDS.has(originId)) {
    return [...TOOLS_FUNDIDO, TOOL_EVIDENCIA];
  }
  const strategy = strategyForEmotion(originId);
  return [...TOOLS_VOLTEAR[strategy], TOOL_EVIDENCIA].slice(0, 4);
}

/** Herramientas para REENCUADRAR (⇄): releer la energía, sin pedir calmarse. */
export function toolsForReencuadrar(): RegulationTool[] {
  return [...TOOLS_REENCUADRAR];
}

/** Herramientas para SUBIR/CANALIZAR (↑): activar la base agradable. Desde la
 *  calma (low_pleasant) se activa suave; desde la energía alta se canaliza. */
export function toolsForSubir(originId: string): RegulationTool[] {
  const origin = BY_ID.get(originId);
  if (origin?.quadrant === 'high_pleasant') return [...TOOLS_CANALIZAR];
  return [...TOOLS_SUBIR];
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
 * Plan de navegación con DISPONIBILIDAD CONDICIONAL (MB-9 · Track B · análisis
 * v2). La geometría DIBUJA la decisión; este núcleo la TOMA, con las reglas de
 * familia y la lista de exclusión intactas. La disponibilidad depende de dónde
 * estás — eso no es una limitación, es el modelo siendo honesto:
 *
 *  - alta·desagradable con intensidad ≥ SINGLE_EXIT_INTENSITY (Track C · MB-10)
 *    → **UNA sola salida: bajar** (fisiológica, del cuerpo). Fuera de la
 *    ventana, menos opciones es más cuidado.
 *  - alta·desagradable dentro de la ventana → **bajar** primero. Si la energía
 *    es re-leíble (miedo/agobio con gemelo agradable), se ofrece **reencuadrar**
 *    (⇄): el único cruce de valencia legítimo estando arriba. Si no lo es, se
 *    ofrece **cruzar** (→) pero SOLO tras el descenso — cruzar está bloqueado
 *    en activación alta.
 *  - baja·desagradable → **cruzar** (dentro de la ventana). Subirla a la fuerza
 *    sería empujar: la prohibición dura no ofrece subir desde desagradable.
 *  - alta·agradable → **canalizar** la energía (no se arregla, se usa).
 *  - baja·agradable → **subir** (activar desde la calma, la mitad olvidada) y
 *    **saborear** (sostenerla, destino legítimo).
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
      // TRACK C (MB-10): fuera de la ventana (intensidad ≥ umbral) hay UNA
      // sola salida y es del cuerpo. La cadena puede ser corta o no existir;
      // las herramientas fisiológicas son la salida real de todas formas.
      if (origin.intensity >= SINGLE_EXIT_INTENSITY) {
        moves.push(mk('bajar', descent.map((e) => e.id), toolsForBajar(originId)));
        break;
      }
      // Bajar primero: baja la activación hacia la ventana. Si hay descenso real
      // (su copy promete "versiones más manejables" y ahora existen), se ofrece.
      if (descent.length > 1) {
        moves.push(mk('bajar', descent.map((e) => e.id), toolsForBajar(originId)));
      }
      if (reframeTwin(originId)) {
        // Energía re-leíble → reencuadrar: releer la misma activación en su gemelo
        // agradable, sin pedir calmarse. El único cruce de valencia válido arriba.
        moves.push(mk('reencuadrar', buildReframeChain(originId).map((e) => e.id), toolsForReencuadrar()));
      } else {
        // Cruzar SOLO tras bajar (ya en la ventana): parte de donde terminó el
        // descenso; sin descenso posible, se cruza desde el origen.
        const crossStart = descent[descent.length - 1] ?? origin;
        const flip = buildFlipChain(crossStart.id);
        moves.push(mk('cruzar', flip.map((e) => e.id), toolsForCruzar(originId)));
      }
      break;
    }
    case 'low_unpleasant': {
      // Baja activación = ya en la ventana → cruzar. NUNCA subir (empujaría).
      const flip = buildFlipChain(originId);
      moves.push(mk('cruzar', flip.map((e) => e.id), toolsForCruzar(originId)));
      break;
    }
    case 'high_pleasant':
      moves.push(mk('canalizar', [originId], TOOLS_CANALIZAR));
      break;
    case 'low_pleasant':
      // La mitad olvidada de la regulación: desde la calma también se puede subir.
      moves.push(mk('subir', [originId], toolsForSubir(originId)));
      moves.push(mk('saborear', [originId], TOOLS_SABOREAR));
      break;
  }

  return { originId, quadrant: origin.quadrant, crisis: false, moves };
}
