/**
 * CRONOTIPO · árbol de decisión (DEUDA 2026-08-15).
 *
 * Cierra el pendiente de `R and D/reestructura/PENDIENTE_CRONOTIPO_ARBOL_DECISION.md`.
 *
 * EL PROBLEMA QUE RESUELVE
 * El quiz cerraba por dominancia simple sobre diez preguntas. Cuando dos
 * animales quedaban pegados, el ganador salía de una lista de preferencia fija
 * (`tieBreak: ['bear','lion','wolf','dolphin']`). Eso es un volado con buena
 * ortografía, y no es un dato menor: el cronotipo es el ancla de la que cuelgan
 * las horas de TODOS los hábitos (regla ancla+offset) y el tema adaptativo.
 * Resolverlo mal le recorre el día entero a la persona.
 *
 * QUÉ HACE
 * Cuando la diferencia entre los dos primeros cae bajo el umbral, el quiz no
 * cierra: abre una rama corta de preguntas escritas para ESE par (ver
 * `cronotipo-desempate.ts`). Las respuestas de la rama suman solo a los dos
 * animales en disputa y se vuelve a resolver.
 *
 * DOCTRINA DEL DELFÍN (memoria `project_doctrina_cronotipo_delfin_estado_temporal`)
 * El Delfín es REAL pero TEMPORAL: es un estado que se monta encima de otro
 * cronotipo, no un cuarto polo ni una identidad. Por eso este core nunca
 * devuelve "Delfín" a secas: devuelve Delfín MÁS su cronotipo madre, que es el
 * que gobierna los horarios cuando el estado remita. El madre se resuelve con
 * `motherChronotype`, que ya existía y ya usan la agenda, el motor, YO y la
 * pantalla de resultado. NO se reimplementa aquí: una segunda definición de
 * "cuál es tu cronotipo de base" es exactamente el bug que acabamos de pagar
 * con la racha duplicada.
 *
 * LO QUE NO CAMBIA (y es deliberado)
 * Quien contesta claro y sale un animal por goleada obtiene HOY el mismo
 * resultado que ayer. La rama solo se abre donde antes había un volado. Y nada
 * de esto toca a quien ya tiene su cronotipo guardado: `user_chronotype` no se
 * recalcula sola, solo se reescribe si la persona vuelve a hacer el test.
 */
import {
  DESEMPATE_LEON_OSO,
  DESEMPATE_OSO_LOBO,
  type PreguntaDesempate,
} from '@/src/constants/assessments/cronotipo-desempate';
import { motherChronotype, type Chronotype3 } from '@/src/services/interventions/intervention-agenda-core';

export type Animal = 'lion' | 'bear' | 'wolf' | 'dolphin';

/** Los dos pares que se disputan de verdad. León/Lobo no es un par: son polos. */
export type ParDisputa = 'lion_bear' | 'bear_wolf';

/**
 * Diferencia máxima entre los dos primeros para considerarlos en disputa.
 *
 * Por qué 2 y no 1: cada pregunta del banco base reparte hasta 3 puntos, así
 * que una sola respuesta a medias ya mueve 2 o 3. Con umbral 1 se colaban como
 * "decididos" casos que dependían de una única pregunta. Con umbral 2 se abre
 * la rama en el rango donde el resultado todavía no está ganado.
 *
 * Por qué no más alto: la rama son tres preguntas extra. Abrirla de más castiga
 * con fricción a quien ya contestó claro, y la fricción se paga en abandono.
 */
export const UMBRAL_DISPUTA = 2;

/** El orden de desempate declarado que ya usaba el motor. Se conserva. */
export const ORDEN_DESEMPATE: Animal[] = ['bear', 'lion', 'wolf', 'dolphin'];

/** El banco de la rama, por par. */
export function bancoDesempate(par: ParDisputa): PreguntaDesempate[] {
  return par === 'lion_bear' ? DESEMPATE_LEON_OSO : DESEMPATE_OSO_LOBO;
}

/** Todos los códigos de pregunta de desempate, para reconocerlos en answers. */
export function codigosDesempate(): string[] {
  return [...DESEMPATE_LEON_OSO, ...DESEMPATE_OSO_LOBO].map((q) => q.id);
}

/** Gana el mayor; los empates los rompe el orden declarado, nunca el del objeto. */
function ganador(scores: Record<string, number>, entre: Animal[]): Animal {
  let best = entre[0];
  let bestValue = -Infinity;
  for (const a of ORDEN_DESEMPATE) {
    if (!entre.includes(a)) continue;
    const v = scores[a] ?? 0;
    if (v > bestValue) { bestValue = v; best = a; }
  }
  return best;
}

/**
 * ¿Hay un par en disputa entre los tres cronotipos de fase?
 *
 * El Delfín queda FUERA de esta cuenta a propósito: no es una fase del día
 * compitiendo con las otras tres, es un estado montado encima. Meterlo aquí es
 * lo que hacía que "casi Delfín" se comiera un empate León/Oso que sí tenía
 * arreglo.
 *
 * Devuelve null si el primero gana por más del umbral, o si los dos primeros
 * son León y Lobo: quedar pegado entre los dos extremos no es una disputa que
 * tres preguntas más vayan a resolver, es un patrón de respuestas contradictorio.
 * Ese caso cae al orden declarado, igual que antes.
 */
export function parEnDisputa(scores: Record<string, number>): ParDisputa | null {
  const fases: Animal[] = ['bear', 'lion', 'wolf'];
  const ordenados = [...fases].sort((a, b) => {
    const d = (scores[b] ?? 0) - (scores[a] ?? 0);
    if (d !== 0) return d;
    // Empate exacto: manda el orden declarado, para que esto sea determinista.
    return ORDEN_DESEMPATE.indexOf(a) - ORDEN_DESEMPATE.indexOf(b);
  });

  const [primero, segundo] = ordenados;
  if ((scores[primero] ?? 0) - (scores[segundo] ?? 0) > UMBRAL_DISPUTA) return null;

  const par = new Set([primero, segundo]);
  if (par.has('lion') && par.has('bear')) return 'lion_bear';
  if (par.has('bear') && par.has('wolf')) return 'bear_wolf';
  return null; // León / Lobo: polos opuestos, no se rama.
}

/**
 * Suma los puntos de la rama a los scores base. Puro: no muta la entrada.
 * Una respuesta a una pregunta que no es de este par se ignora, para que un
 * borrador viejo no contamine el resultado.
 */
export function aplicarDesempate(
  scores: Record<string, number>,
  par: ParDisputa,
  respuestas: Record<string, unknown>,
): Record<string, number> {
  const out = { ...scores };
  for (const q of bancoDesempate(par)) {
    const elegida = respuestas[q.id];
    if (typeof elegida !== 'string') continue;
    const opcion = q.options.find((o) => o.id === elegida);
    if (!opcion) continue;
    for (const [animal, puntos] of Object.entries(opcion.scores)) {
      out[animal] = (out[animal] ?? 0) + puntos;
    }
  }
  return out;
}

/** ¿Ya está contestada toda la rama de este par? */
export function desempateCompleto(par: ParDisputa, respuestas: Record<string, unknown>): boolean {
  return bancoDesempate(par).every((q) => typeof respuestas[q.id] === 'string');
}

export interface ResultadoCronotipo {
  /** El animal que se le muestra a la persona. */
  cronotipo: Animal;
  /**
   * El cronotipo madre. Para León, Oso y Lobo es él mismo. Para Delfín es la
   * tendencia de fase más fuerte por debajo del estado: el ancla real de sus
   * horarios.
   */
  madre: Chronotype3;
  /** Delfín es un estado, no una identidad. Solo aquí es true. */
  esEstadoTemporal: boolean;
  /** El par que se desempató, o null si no hubo disputa. */
  par: ParDisputa | null;
  /** Los scores finales, ya con la rama sumada si la hubo. */
  scores: Record<string, number>;
  /** Falta contestar la rama: el quiz todavía NO puede cerrar. */
  requiereDesempate: boolean;
}

/**
 * El árbol completo.
 *
 * 1 · Si el Delfín domina, gana el estado. El madre sale de las otras tres
 *     tendencias y viaja SIEMPRE junto al resultado: nunca se dice "eres
 *     Delfín" a secas.
 * 2 · Si no, se mira si los dos primeros de fase están pegados.
 * 3 · Si están pegados y la rama no está contestada, se pide la rama
 *     (`requiereDesempate`). El motor la muestra y vuelve a llamar aquí.
 * 4 · Con la rama contestada, se resuelve con los scores ya sumados.
 */
export function resolverCronotipo(
  scoresBase: Record<string, number>,
  respuestas: Record<string, unknown> = {},
): ResultadoCronotipo {
  const todos: Animal[] = ['bear', 'lion', 'wolf', 'dolphin'];

  // 1 · El estado gana antes que la fase.
  if (ganador(scoresBase, todos) === 'dolphin') {
    return {
      cronotipo: 'dolphin',
      madre: motherChronotype(scoresBase),
      esEstadoTemporal: true,
      par: null,
      scores: scoresBase,
      requiereDesempate: false,
    };
  }

  // 2 · ¿Disputa entre fases?
  const par = parEnDisputa(scoresBase);
  if (par === null) {
    const cronotipo = ganador(scoresBase, todos);
    return {
      cronotipo,
      madre: cronotipo === 'dolphin' ? motherChronotype(scoresBase) : (cronotipo as Chronotype3),
      esEstadoTemporal: false,
      par: null,
      scores: scoresBase,
      requiereDesempate: false,
    };
  }

  // 3 · Hay disputa y la rama sigue sin contestar.
  if (!desempateCompleto(par, respuestas)) {
    return {
      cronotipo: ganador(scoresBase, todos),
      madre: motherChronotype(scoresBase),
      esEstadoTemporal: false,
      par,
      scores: scoresBase,
      requiereDesempate: true,
    };
  }

  // 4 · Rama contestada: se resuelve con los puntos sumados.
  const scores = aplicarDesempate(scoresBase, par, respuestas);
  const cronotipo = ganador(scores, todos);
  return {
    cronotipo,
    madre: cronotipo === 'dolphin' ? motherChronotype(scores) : (cronotipo as Chronotype3),
    esEstadoTemporal: cronotipo === 'dolphin',
    par,
    scores,
    requiereDesempate: false,
  };
}
