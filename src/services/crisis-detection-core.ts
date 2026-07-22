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

/**
 * Número OFICIAL de la Línea de la Vida (CONASAMA / Secretaría de Salud,
 * México), 24 h, gratuito. Verificado contra gob.mx en auditoría S1 (B1):
 * el 800-290-0024 que circulaba en los briefs internos era INCORRECTO.
 * Si este número cambia, el test lo fija como assertion — actualizar ambos
 * solo con fuente oficial a la vista.
 */
export const LINEA_DE_LA_VIDA_PHONE = '800-911-2000';
export const LINEA_DE_LA_VIDA_TEL_URL = 'tel:8009112000';

export const CRISIS_BANNER_TEXT =
  'Si estás en crisis o pensando en hacerte daño, llama a la Línea de la Vida: 800-911-2000 (24 h, gratuito).';

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
  /hacerme dano/,                    // "hacerme daño" ya normalizado (ñ→n)
  /lastimarme/,
  /autolesion/,
  /cortarme/,
  /desaparecer para siempre/,
  /ya no puedo mas con mi vida/,
  // ── Ampliación auditoría S1 (B2): formas comunes MX que fallaban ──
  /(ya )?no quiero (estar|seguir) aqui/,
  /para que (sigo|seguir|vivir|vivo)/,
  /no vale la pena (seguir|vivir|nada)/,   // ya no exige "vivir" completo
  // Reflexivo obligatorio: "voy a cortar el ayuno" / "matar el hambre" son
  // frases normales en esta app — sin "me" serían falsos positivos absurdos.
  /me (voy a|quiero) (matar|cortar)/,
  /(prefiero|quiero) (morir|estar muert)/,
  /(quiero|ganas de) desaparecer/,
  /estarian mejor sin mi/,
  /mejor estarian sin mi/,                  // ambos órdenes
  /(acabar|terminar) con (mi vida|todo)/,
  /ojala (no despertar|me murier)/,
  /no le veo sentido a (la vida|nada)/,
  /nada tiene sentido/,
  // ── Refuerzo B2 (fix final S1): variantes reflexivas que se escapaban ──
  /me matare/,                              // futuro sin "voy a" ("me mataré")
  /me cort\w* las venas/,                   // me corto/corté/cortaré las venas
  /(acabar|terminar) conmigo/,
  /me (quiero hacer|voy a hacer|hare) dano/,
  // "no aguanto mas" a secas disparaba con habla de gimnasio ("no aguanto
  // más con estas sentadillas") — se exige contexto de crisis explícito.
  /no aguanto mas (con (la|mi|esta) vida|de esto|seguir asi|esta vida)/,
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
