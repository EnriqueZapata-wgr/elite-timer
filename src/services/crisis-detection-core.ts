/**
 * Detección determinística de temas de crisis / ideación suicida (C5-002).
 *
 * Guardarraíl que NO depende del LLM: si el texto del usuario matchea,
 * la UI muestra el banner Línea de la Vida (CrisisSupportBanner) de forma
 * fija, independientemente de lo que responda ARGOS.
 *
 * Sesgo intencional a falsos positivos: mostrar el banner de más es
 * inocuo; no mostrarlo cuando hacía falta es el riesgo real.
 */

/** Número oficial de la Línea de la Vida (México), 24 h, gratuito. */
export const LINEA_DE_LA_VIDA_PHONE = '800-290-0024';
export const LINEA_DE_LA_VIDA_TEL_URL = 'tel:8002900024';

export const CRISIS_BANNER_TEXT =
  'Si estás en crisis o pensando en hacerte daño, llama a la Línea de la Vida: 800-290-0024 (24 h, gratuito).';

/**
 * Patrones sobre texto normalizado (minúsculas, sin acentos, ñ→n).
 * Cubren ideación suicida, autolesión y desesperanza aguda explícita.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /suicid/,                          // suicidio, suicidarme, suicida...
  /quitarme la vida/,
  /matarme/,
  /\bme quiero morir\b/,
  /quiero morirme/,
  /no quiero (seguir )?vivi/,        // no quiero vivir / seguir viviendo
  /no vale la pena (seguir )?vivi/,
  /hacerme dano/,                    // "hacerme daño" ya normalizado (ñ→n)
  /lastimarme/,
  /autolesion/,
  /cortarme/,
  /acabar con todo/,
  /desaparecer para siempre/,
  /mejor estarian sin mi/,
  /ya no puedo mas con mi vida/,
];

/** Normaliza para matching robusto: minúsculas, sin acentos (NFD), ñ→n. */
export function normalizeCrisisText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** true si el texto contiene señales explícitas de crisis/autolesión. */
export function detectCrisisContent(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = normalizeCrisisText(text);
  return CRISIS_PATTERNS.some((p) => p.test(normalized));
}
