/**
 * Coach — clasificador del principio invocado (pendiente 13.4, 31-ago-2026).
 *
 * EL BUG: `detectPrincipleInResponse` recorría la lista de principios en
 * orden y devolvía el PRIMERO con un patrón que pegara. Una respuesta que
 * mencionaba "postura" una vez y "mitocondria", "AMPK" y "autofagia" tres
 * veces quedaba auditada como 'biomecanica' solo porque biomecánica va
 * antes en la lista. La auditoría del coach describía el orden del array,
 * no la respuesta.
 *
 * LA REGLA NUEVA: se puntúa. Cada principio suma las OCURRENCIAS de todos
 * sus patrones en el texto (no "pegó o no pegó"); gana el de mayor puntaje.
 * Empate: gana el más ESPECÍFICO, medido como el largo total del texto que
 * sus patrones cubrieron (una frase larga como "cadena de transporte" pesa
 * más que "postura"). Si aún empatan, el que aparece primero EN EL TEXTO,
 * que es una propiedad de la respuesta y no de esta lista. Cero patrones
 * pegando → null, como antes.
 *
 * Sigue siendo heurística de frases (TODO Mariana: clasificador semántico).
 * Puro, sin supabase: se prueba en node.
 */
import type { Principle } from '@/src/lib/coach-engine/types';

export const PRINCIPLE_PATTERNS: { principle: Principle; patterns: RegExp[] }[] = [
  {
    principle: 'identidad',
    patterns: [
      /\b(qui[eé]n\s+eres|qui[eé]n\s+crees\s+ser|tu\s+identidad|c[oó]mo\s+te\s+ves)\b/gi,
      /\b(no\s+es\s+lo\s+que\s+haces|es\s+lo\s+que\s+eres)\b/gi,
    ],
  },
  {
    principle: 'estandar',
    patterns: [
      /\b(tu\s+est[aá]ndar|sube\s+(el|tu)\s+est[aá]ndar|nivel\s+de\s+exigencia)\b/gi,
      /\b(piso\s+no\s+negociable|m[ií]nimo\s+no\s+negociable)\b/gi,
    ],
  },
  {
    principle: 'proposito',
    patterns: [/\b(tu\s+prop[oó]sito|para\s+qu[eé]\s+lo\s+haces|motivaci[oó]n\s+ra[ií]z)\b/gi],
  },
  {
    principle: 'filosofia',
    patterns: [
      /\b(tu\s+(filosof[ií]a|cosmovisi[oó]n)|c[oó]mo\s+ves\s+(el|tu)\s+mundo)\b/gi,
      /\b(el\s+lenguaje\s+construye|c[oó]mo\s+lo\s+nombras)\b/gi,
    ],
  },
  {
    principle: 'fisiologia',
    patterns: [
      /\b(eje\s+(hormonal|HHG|HHS|HHT)|ritmo\s+circadiano|regulaci[oó]n\s+gluc[eé]mica)\b/gi,
      /\b(sistema\s+inmune|sistema\s+nervioso\s+aut[oó]nomo)\b/gi,
    ],
  },
  {
    principle: 'biomecanica',
    patterns: [/\b(biomec[aá]nica|palanca|vector\s+de\s+fuerza|integridad\s+articular|postura)\b/gi],
  },
  {
    principle: 'mecanismos_biologicos',
    patterns: [
      /\b(mitocondria|aut[oó]fagia|AMPK|mTOR|v[ií]a\s+metab[oó]lica|cadena\s+de\s+transporte)\b/gi,
      /\b(se[nñ]alizaci[oó]n\s+celular|metilaci[oó]n|HOMA-?IR)\b/gi,
    ],
  },
];

export interface PuntajePrincipio {
  principle: Principle;
  /** Ocurrencias totales de todos los patrones. */
  ocurrencias: number;
  /** Largo total del texto cubierto (especificidad). */
  cobertura: number;
  /** Índice de la primera ocurrencia en el texto (desempate final). */
  primera: number;
}

/** Puntúa TODOS los principios. Los que no pegan no aparecen. */
export function puntuarPrincipios(text: string): PuntajePrincipio[] {
  const out: PuntajePrincipio[] = [];
  for (const { principle, patterns } of PRINCIPLE_PATTERNS) {
    let ocurrencias = 0;
    let cobertura = 0;
    let primera = Number.POSITIVE_INFINITY;
    for (const pattern of patterns) {
      // Regex global compartida: se reinicia antes de usarla. matchAll exige
      // la bandera g y no muta lastIndex, pero por si alguien la usa con test().
      pattern.lastIndex = 0;
      for (const m of text.matchAll(pattern)) {
        ocurrencias += 1;
        cobertura += m[0].length;
        if (m.index != null && m.index < primera) primera = m.index;
      }
    }
    if (ocurrencias > 0) out.push({ principle, ocurrencias, cobertura, primera });
  }
  return out;
}

/** Orden: más ocurrencias, luego más cobertura, luego primero en el texto. */
export function compararPuntajes(a: PuntajePrincipio, b: PuntajePrincipio): number {
  if (b.ocurrencias !== a.ocurrencias) return b.ocurrencias - a.ocurrencias;
  if (b.cobertura !== a.cobertura) return b.cobertura - a.cobertura;
  return a.primera - b.primera;
}

export function detectPrincipleInResponse(text: string): Principle | null {
  if (!text) return null;
  const puntajes = puntuarPrincipios(text).sort(compararPuntajes);
  return puntajes[0]?.principle ?? null;
}
