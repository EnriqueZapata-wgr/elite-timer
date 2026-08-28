/**
 * Paleta oficial ATP — Manual de identidad visual (Patricia Aguilar).
 *
 * ÚNICA FUENTE DE VERDAD de colores en toda la app.
 * Ningún archivo debe hardcodear un color; debe importar de aquí.
 */
import { hoyBgBucket } from '@/src/utils/time-of-day';
import { BRAND_LIME, BRAND_TEAL } from '@/src/constants/brand-palette';
import { ACERO_OSCURO } from '@/src/constants/flags';

// ═══ PALETA PRINCIPAL ═══

// DOCTRINA DE MARCA (Batch 3 · #23): 3 colores — lime + teal PRINCIPALES,
// amarillo (amber) SECUNDARIO. Nada de 4º color de marca. Las superficies
// heroicas usan DEGRADADOS (moleculeGradient / PILLAR_GRADIENTS / brandGradient),
// NUNCA lime plano como fondo — el color plano es solo micro-acento
// (ver ACCENT_ROLES: >3 elementos lima en una pantalla = sobra acento).
export const ATP_BRAND = {
  black: '#000000',
  // MB-20 4.4: lime/teal viven en brand-palette (módulo puro) para que los
  // *-core.ts (orbe) los importen sin arrastrar los require() de imágenes.
  lime: BRAND_LIME,      // Lima ATP — acento primario (CTAs, dato heroico; máx 1-2 por vista)
  green1: '#6DCC48',     // Verde intermedio claro
  green2: '#3DBF6E',     // Verde medio
  teal1: '#2EC28A',      // Teal intermedio
  teal2: BRAND_TEAL,     // Teal profundo
  teal: BRAND_TEAL,      // Teal de acento (= el más bajo del molecule gradient) — acentos auth/UI
  // Amarillo secundario ATP — acento terciario, NUNCA principal (lime+teal mandan).
  // ÚNICO amarillo de marca: SEMANTIC.acceptable y SCORE_COLORS.stable apuntan aquí.
  amber: '#EFD54F',
  white: '#FFFFFF',

  // Gradiente de la molécula (de lima a teal)
  moleculeGradient: ['#A8E02A', '#6DCC48', '#3DBF6E', '#2EC28A', '#1ABC9C'] as const,
} as const;

// ═══ ENLACES EXTERNOS ═══
// Bridge a la comunidad humana (Skool). Único canal de conversación humana —
// in-app NO hay chat privado (doctrina cerrada). Configurable post-launch:
// cambiará a skool.com/tribu-atp (o plan premium) cuando haya presupuesto.
export const SKOOL_URL = 'https://www.skool.com/the-vital-order-7560/about';

// ═══════════════════════════════════════════════════════════════════
// LA RAMPA OSCURA — una sola escalera, y se mueve completa (ACERO, 22-ago-2026)
// ═══════════════════════════════════════════════════════════════════
/**
 * Las doce superficies y bordes del modo oscuro viven AQUÍ y en ningún otro
 * lado. Todo lo que sigue en este archivo (SURFACES, BG, BORDER, PILL, CARD,
 * ELEVATION, THEME_DARK) las consume; nadie vuelve a escribir uno de estos
 * grises a mano.
 *
 * POR QUÉ EXISTE ESTE BLOQUE
 *  El dueño pidió cambiar tres valores: lienzo, card y campo. Cambiar solo
 *  esos tres rompe la app. Con el lienzo en #0F1114 y la card todavía en
 *  #121212, la card queda MÁS OSCURA que el fondo sobre el que flota y el
 *  modelo de elevación se invierte en las 142 pantallas de un golpe. Lo mismo
 *  con cada borde: están calibrados contra negro, y sobre acero unos
 *  desaparecen y otros gritan. La escalera se mueve completa o no se mueve.
 *
 * CÓMO SE DERIVÓ (la regla, no el gusto)
 *  1. Los TRES valores del dueño se respetan al pie de la letra.
 *  2. El tinte de acero que él eligió resultó ser una función limpia:
 *     G = R + 0.12·R, B = R + 0.32·R. Reproduce #0F1114 y #1A1D22 EXACTOS.
 *     Los escalones derivados usan esa misma función, así que la pizca de
 *     azul crece con la luminancia igual que en sus valores.
 *  3. Cada escalón derivado conserva el MISMO salto de contraste WCAG que
 *     tenía sobre negro. Ejemplo: card→flotante era 1.192, queda en 1.238;
 *     flotante→popover era 1.174, queda en 1.194. No se inventó separación.
 *  4. Cada borde conserva el salto que tenía sobre la superficie que
 *     contornea, que es lo que lo hace leerse como contorno y no como halo.
 *
 * LOS DOS ROLES QUE SE DESACOPLARON, Y POR QUÉ
 *  `campo` y `chrome` compartían #0A0A0A por accidente histórico: con el
 *  lienzo en negro puro no había hacia dónde bajar, así que lo hundido y el
 *  chrome tuvieron que subir los dos. Con el lienzo en acero sí se puede
 *  bajar, y el dueño ya lo hizo al dejar el campo en #0A0C0F, por debajo del
 *  lienzo. Eso está bien para el campo, que vive DENTRO de una card: se hunde
 *  el doble que antes (1.057 → 1.159 contra la card) y por fin se lee como
 *  campo. Pero el tab bar y las píldoras de filtro viven SOBRE el lienzo: si
 *  se quedaban en #0A0A0A quedaban más oscuros que el lienzo y se invertía su
 *  lectura. Por eso `chrome` es ahora su propio escalón, calculado para
 *  conservar el mismo 1.061 que tenía sobre negro.
 *
 * VERIFICADO, NO SUPUESTO (contrastRatio de src/utils/contrast)
 *  Blanco sobre lienzo 21.00 → 18.91 · blanco sobre card 18.73 → 16.90,
 *  los dos muy por encima de AAA. La escalera es monótona creciente en los
 *  dos casos y hay un candado en theme-tokens.test.ts que lo exige.
 *
 * SE APAGA CON `ACERO_OSCURO = false` (flags.ts) y vuelve RAMPA_NEGRO, que
 * son los valores de hoy color por color.
 */
export interface RampaOscura {
  /** Campo de captura, hundido DENTRO de una card. */
  campo: string;
  /** El lienzo de la pantalla — el escalón cero de ELEVATION. */
  fondo: string;
  /** Chrome sobre el lienzo: tab bar, sidebar, píldoras de filtro. */
  chrome: string;
  /** Card estándar — ELEVATION[1]. */
  card: string;
  /** Card sobre card, hoja modal — ELEVATION[2]. */
  flotante: string;
  /** Popover, menú flotante — ELEVATION[3]. */
  popover: string;
  /** Separador interno de una card. */
  bordeSutil: string;
  /** Contorno de un campo de captura. */
  bordeCampo: string;
  /** Contorno de una píldora de filtro. */
  bordePildora: string;
  /** Contorno de card — ELEVATION[1].border. */
  bordeCard: string;
  /** Foco y selección — ELEVATION[2].border, y el gris de lo deshabilitado. */
  bordeMarcado: string;
  /** Contorno de popover — ELEVATION[3].border. */
  bordePopover: string;
}

/** Lo que la app fue hasta el 22-ago-2026. Es el camino de vuelta. */
const RAMPA_NEGRO: RampaOscura = {
  campo: '#0a0a0a',
  fondo: '#000000',
  chrome: '#0A0A0A',
  card: '#121212',
  flotante: '#232323',
  popover: '#2F2F2F',
  bordeSutil: '#141414',
  bordeCampo: '#222222',
  bordePildora: '#1a1a1a',
  bordeCard: '#1F1F1F',
  bordeMarcado: '#333333',
  bordePopover: '#3D3D3D',
};

/** El acero. Los tres primeros marcados son decisión del dueño; el resto sale
 *  de la derivación descrita arriba. */
const RAMPA_ACERO: RampaOscura = {
  campo: '#0A0C0F',      // ← dueño
  fondo: '#0F1114',      // ← dueño
  chrome: '#16191D',     // escalón nuevo (antes compartía valor con `campo`)
  card: '#1A1D22',       // ← dueño
  flotante: '#292E36',
  popover: '#343A45',
  bordeSutil: '#1E2228',
  bordeCampo: '#23272E',
  bordePildora: '#242830',
  bordeCard: '#252931',
  bordeMarcado: '#383F4A',
  bordePopover: '#404854',
};

/** La rampa vigente. Único lugar donde se decide. */
export const OSCURO: RampaOscura = ACERO_OSCURO ? RAMPA_ACERO : RAMPA_NEGRO;

/**
 * Las DOS rampas juntas, para los candados de tests. El ratchet de hex a mano
 * deriva su lista negra de los tokens vivos; si mirara solo la rampa vigente,
 * apagar la bandera dejaría de bloquear los doce valores de acero y encenderla
 * dejaría de bloquear los doce del negro. Mirando las dos, el candado no se
 * debilita en ninguna de las dos posiciones.
 */
export const RAMPAS_OSCURAS = [RAMPA_NEGRO, RAMPA_ACERO] as const;

/**
 * El gris secundario del modo oscuro, recalibrado contra el lienzo nuevo.
 *
 * NO es un retoque de gusto: es la MISMA regla de la rampa (conservar el
 * salto que el token tenía contra la superficie que lo sostiene) aplicada al
 * único token de texto que se estaba quedando corto. #888888 daba 5.285
 * contra la card de negro; contra la card de acero da 4.767. Sigue siendo AA,
 * así que a simple vista no había problema.
 *
 * EL PROBLEMA APARECIÓ EN OTRO LADO, Y ES DE SALUD, NO DE ESTÉTICA
 *  El velo nocturno in-app tiene un contrato duro: nunca puede tumbar un par
 *  de texto por debajo de AA, y si lo tumbaría, se recorta a sí mismo
 *  (night-veil-core, clampVeilForTheme). Ese clamp se come la holgura que le
 *  sobre al par más apretado. Con #888888 sobre acero la holgura pasó de
 *  0.785 a 0.267, y el velo se estranguló: el rojo pleno del final de la
 *  curva caía de alpha 0.116 a 0.046, o sea 60% menos filtro justo a la hora
 *  en que el filtro sirve para algo. Legibilidad y sueño no tienen por qué
 *  competir cuando basta con aclarar un gris 8 puntos de canal.
 *
 * #909090 devuelve 5.293 contra la card (era 5.285) y 5.923 contra el lienzo
 * (era 5.924), y con eso el velo vuelve a 0.113. Prácticamente los mismos
 * números de antes del cambio, que era exactamente el objetivo.
 *
 * Con ACERO_OSCURO apagado vuelve #888888 y no se mueve un pixel.
 */
const SECUNDARIO_OSCURO = ACERO_OSCURO ? '#909090' : '#888888';

// ═══ SUPERFICIES ═══

export const SURFACES = {
  base: OSCURO.chrome,     // Tab bar, sidebar (chrome sobre el lienzo)
  card: OSCURO.card,       // Cards = ELEVATION[1] (unificado viejo+nuevo, se despega del lienzo)
  cardLight: OSCURO.flotante, // Bordes, separadores, pista del timer (= ELEVATION[2].bg, MB-17 4.3)
  border: OSCURO.bordeCard,   // Bordes sutiles de cards = ELEVATION[1].border
  disabled: OSCURO.bordeMarcado, // Elementos deshabilitados
} as const;

// ═══ TEXTO ═══

export const TEXT_COLORS = {
  primary: '#FFFFFF',    // Texto principal sobre el lienzo oscuro
  secondary: SECUNDARIO_OSCURO, // Texto secundario, hints, labels inactivos
  muted: '#555555',      // Tab inactivo, texto muy tenue
  onAccent: '#000000',   // Texto sobre fondo lima (botones primarios)
} as const;

// ═══ COLORES POR CATEGORÍA ═══

export const CATEGORY_COLORS = {
  fitness: '#8CBF24',    // Lima desaturado (MB-17 4.2): el lima puro queda
                         // reservado a acción primaria y dato heroico
  nutrition: '#5B9BD5',  // Azul
  mind: '#7F77DD',       // Morado
  optimization: '#EF9F27', // Amber
  metrics: '#1D9E75',    // Teal
  rest: '#E0E0E0',       // Gris
  cycle: '#D4537E',      // Rosa ciclo (P3.12: antes hardcodeado en PillarHeader/pantallas)
} as const;

/**
 * 19.1 · Pieza 4 — el color de cada sección de la sala ATP. Cinco bloques de
 * color se leen como sistema; veinticinco serían confeti. Todo sale de
 * CATEGORY_COLORS (nunca un hex escrito a mano en un componente) y se aplica
 * en capas: fondo del mosaico al 10%, borde al 22%, icono y encabezado de
 * sección al 100%; la etiqueta se queda gris (TEXT.secondary).
 * Contraste remedido el 22-ago-2026 (ACERO). Sobre el chrome del mosaico
 * (OSCURO.chrome, antes #0A0A0A y ahora #16191D): mind 5.27 → 4.69, fitness
 * 9.04 → 8.06, nutrition 6.69 → 5.96, metrics 5.85 → 5.21, sistema 5.58 →
 * 4.97. Los cinco siguen ≥ 4.5:1 (WCAG AA).
 *
 * ⚠️ Los mismos colores como TEXTO sobre una CARD de acero (#1A1D22) caen un
 * pelo por debajo de AA en tres casos: mind 4.49, ciclo 4.30, cardio 4.42.
 * NO se recalibran: son señal de dominio, no decoración, y cambiarlos rompe
 * la identidad de sección que el manual fija en el cap. 3.3. Se usan al 100%
 * para icono y encabezado (texto grande, donde el mínimo es 3:1) y al 10%/22%
 * como fondo y borde del mosaico, que es donde de verdad viven.
 */
export const APP_SECTION_COLORS = {
  mente: CATEGORY_COLORS.mind,
  cuerpo: CATEGORY_COLORS.fitness,
  diario: CATEGORY_COLORS.nutrition,
  salud: CATEGORY_COLORS.metrics,
  sistema: TEXT_COLORS.secondary,
  // MB-20.1: el ciclo pinta con su propio rosa (manual), no con el teal de
  // salud — las cards de TAREAS lo necesitan como sección propia.
  ciclo: CATEGORY_COLORS.cycle,
} as const;

// ═══ COLORES SEMÁNTICOS ═══

/**
 * SELLO DE ADVERTENCIA NOM-051 — marca regulada, no estilo nuestro.
 *
 * El octágono es negro con tinta blanca porque así lo manda la norma de
 * etiquetado frontal. Por eso NO conmuta con el tema de la app: reproducir un
 * sello oficial en gris claro sería reproducirlo mal. Vive aquí, junto a los
 * demás valores de marca, y no como dos literales sueltos en una hoja de
 * estilos, para que el ratchet de color duro siga significando algo.
 */
export const SELLO_NOM = {
  fondo: '#0B0B0B',
  tinta: '#FFFFFF',
} as const;

export const SEMANTIC = {
  success: '#A8E02A',    // Éxito, óptimo
  acceptable: ATP_BRAND.amber, // Aceptable, en rango (el único amarillo de marca)
  warning: '#EF9F27',    // Advertencia, riesgo
  error: '#E8877F',      // Error de UI (formularios) — coral apagado: NO debe
                         // gritar más que un biomarcador crítico (manual v3,
                         // MB-17 4.1: los dos rojos se separan)
  info: '#5B9BD5',       // Información
  noData: '#444444',     // Sin datos
} as const;

// ═══ COLORES POR TIPO DE BLOQUE (TIMER) ═══

export const BLOCK_COLORS = {
  exercise: '#A8E02A',   // Verde neón — acción principal
  rest: '#4A90D9',       // Azul calmante — descanso
  transition: '#F5A623', // Naranja — transición / atención
  final: '#E74C3C',      // Rojo — bloque final
} as const;

// ═══ ESTILOS DE CARDS ═══

export const CARD_STYLE = {
  background: SURFACES.card,
  borderColor: SURFACES.border,
  borderWidth: 0.5,
  borderRadius: 12,
  categoryBorderWidth: 3, // Borde izquierdo en cards con categoría
} as const;

// ═══ ESTILOS DE BOTONES ═══

export const BUTTON_STYLES = {
  // primary = ACCENT_ROLES.primary: MÁXIMO 1 CTA heroico lima por pantalla.
  // Para superficies grandes, preferir brandGradient() (LinearGradient) sobre
  // el lime plano — el sólido es para botones compactos, no fondos.
  primary: {
    background: ATP_BRAND.lime,
    text: TEXT_COLORS.onAccent,
    borderRadius: 8,
  },
  secondary: {
    background: 'transparent',
    borderColor: ATP_BRAND.lime,
    borderWidth: 1,
    text: ATP_BRAND.lime,
    borderRadius: 8,
  },
  danger: {
    background: 'transparent',
    borderColor: SEMANTIC.error,
    borderWidth: 1,
    text: SEMANTIC.error,
    borderRadius: 8,
  },
} as const;

// ═══ UTILIDADES ═══

/** Helper para aplicar opacidad a un color hex sin string concat */
export function withOpacity(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hex + alpha;
}

// ═══════════════════════════════════════════════════════════════════
// TOKENS CANONICOS DEL DESIGN SYSTEM (unica fuente de verdad)
// ═══════════════════════════════════════════════════════════════════
// Estos son los tokens nuevos. Los SURFACES/TEXT_COLORS de arriba se
// mantienen como aliases pero todo codigo nuevo debe usar BG/BORDER/TEXT.

/** Backgrounds canonicos */
export const BG = {
  screen: OSCURO.fondo,        // fondo de TODA pantalla = ELEVATION[0]
  card: OSCURO.card,           // fondo de TODA card = ELEVATION[1] (se despega del lienzo)
  cardElevated: OSCURO.flotante, // card sobre card = ELEVATION[2] (MB-17 4.3)
  input: OSCURO.campo,         // fondo de inputs (recedido, contrasta con la card)
} as const;

/** Bordes canonicos */
export const BORDER = {
  card: OSCURO.bordeCard,   // borde de cards = ELEVATION[1].border — NUNCA usar como bg
  input: OSCURO.bordeCampo, // borde de inputs
  subtle: OSCURO.bordeSutil, // separadores internos
} as const;

/** Texto canonico */
export const TEXT = {
  primary: '#fff',
  secondary: SECUNDARIO_OSCURO,
  tertiary: '#555',
  muted: '#444',
  accent: '#a8e02a',
} as const;

/** Estilo unico de Section Title */
export const SECTION_TITLE = {
  fontSize: 11,
  letterSpacing: 2,
  fontWeight: '600' as const,
  color: SECUNDARIO_OSCURO,
  textTransform: 'uppercase' as const,
  marginBottom: 12,
} as const;

/** Estilo unico de Filter/Tab Pill */
export const PILL = {
  height: 34,
  paddingHorizontal: 16,
  borderRadius: 17,
  borderWidth: 0.5,
  // ACERO: la píldora vive SOBRE el lienzo, no dentro de una card — por eso
  // toma `chrome` y no `campo`. Con el lienzo en acero, quedarse en `campo`
  // la dejaría más oscura que el fondo e invertiría su lectura.
  bg: OSCURO.chrome,
  borderColor: OSCURO.bordePildora,
  activeBg: '#a8e02a',
  activeBorderColor: '#a8e02a',
  textColor: '#666',
  activeTextColor: '#000',
  fontSize: 11,
  fontWeight: '600' as const,
  letterSpacing: 1,
} as const;

/** Estilo unico de Card */
export const CARD = {
  bg: OSCURO.card,         // = ELEVATION[1] (se despega del lienzo)
  borderColor: OSCURO.bordeCard,
  borderWidth: 0.5,
  borderRadius: 16,
  padding: 16,
} as const;

/** Spacing entre secciones */
export const SECTION_SPACING = {
  sm: 16,    // entre cards del mismo grupo
  md: 24,    // entre secciones
  lg: 32,    // entre grupos grandes
} as const;

/** Escala de letterSpacing */
export const LETTER_SPACING = {
  tight: 0.5,    // textos de parrafo
  normal: 1,     // labels normales
  wide: 2,       // section titles, headers
  xwide: 3,      // solo "ATP" en logo
} as const;

// ═══════════════════════════════════════════════════════════════════
// ELEVACION + GLOW + ROLES DE ACENTO  (Fase 1 — rediseño UI/UX)
// ═══════════════════════════════════════════════════════════════════
// Objetivo: dar PROFUNDIDAD real (las cards a #0a0a0a casi no se separan
// del fondo negro) y RESTRICCION de acento. Codigo nuevo debe elegir un
// nivel de ELEVATION en vez de hardcodear bg/borde, y reservar GLOW para
// UN solo elemento heroico por pantalla.

/**
 * Escala de superficies por nivel de elevacion (dark mode).
 * Cada nivel sube luminancia + borde para que el ojo lea profundidad.
 *   0 = fondo de pantalla   1 = card estandar
 *   2 = card sobre card / sheet / modal   3 = popover / menu flotante
 */
export const ELEVATION = {
  // MB-17 4.3: los niveles estaban a 1.08-1.12 entre sí (imperceptible) — se
  // abren para que un modal sobre una card se distinga de la card.
  // ACERO: los cuatro escalones salen de OSCURO, la rampa única. Cada nivel
  // conserva el salto de contraste que tenía sobre negro (0→1 1.121→1.101,
  // 1→2 1.192→1.238, 2→3 1.174→1.194) y la escalera sigue siendo monótona
  // creciente en las dos posiciones de la bandera. Hay test que lo exige.
  0: { bg: OSCURO.fondo, border: 'transparent' },
  1: { bg: OSCURO.card, border: OSCURO.bordeCard }, // card estandar — se despega del lienzo
  2: { bg: OSCURO.flotante, border: OSCURO.bordeMarcado }, // card sobre card / sheet / modal
  3: { bg: OSCURO.popover, border: OSCURO.bordePopover }, // popover / menu flotante
} as const;

/**
 * Glow para el elemento HEROICO de cada pantalla (dato/CTA protagonista).
 * Regla: maximo 1 uso por vista. Lima por defecto; usar `withGlow(color)`
 * para halos por categoria.
 */
export const GLOW = {
  accent: {
    shadowColor: ATP_BRAND.lime,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12, // Android
  },
} as const;

/** Halo a partir de un color de categoria (mismo perfil que GLOW.accent). */
export function withGlow(color: string) {
  return {
    shadowColor: color,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  } as const;
}

/**
 * ROLES DE ACENTO — disciplina de color (causa raiz del "no wow": el lima
 * esta en TODO). Heuristica: si en una pantalla cuentas >3 elementos lima,
 * sobra acento.
 *   primary  → accion primaria + dato heroico (max 1-2 por vista) → lima
 *   neutral  → todo lo tactil secundario → TEXT.secondary / BORDER.card
 *   category → tinte/icono por pilar, SIEMPRE desaturado (no a tope)
 */
export const ACCENT_ROLES = {
  primary: ATP_BRAND.lime,
  neutral: TEXT_COLORS.secondary,
} as const;

// ═══════════════════════════════════════════════════════════════════
// PREMIUM DESIGN TOKENS — colores semanticos, gradients, mensajes
// ═══════════════════════════════════════════════════════════════════

/** Colores semanticos por nivel de score (0-100) */
export const SCORE_COLORS = {
  optimal:  '#4ade80',   // 85+ verde brillante
  charged:  '#a8e02a',   // 70-84 lime ATP
  stable:   ATP_BRAND.amber, // 55-69 amarillo (único amarillo de marca)
  low:      '#f97316',   // 40-54 naranja
  critical: '#FF3B30',   // 0-39 rojo pleno — el dato crítico de salud grita MÁS
                         // que un error de formulario (manual v3, MB-17 4.1)
} as const;

/** Devuelve el color asociado a un score (0-100). */
export function getScoreColor(score: number): string {
  if (score >= 85) return SCORE_COLORS.optimal;
  if (score >= 70) return SCORE_COLORS.charged;
  if (score >= 55) return SCORE_COLORS.stable;
  if (score >= 40) return SCORE_COLORS.low;
  return SCORE_COLORS.critical;
}

/** Devuelve la etiqueta de nivel para un score. */
export function getScoreLabel(score: number): string {
  if (score >= 85) return 'ÓPTIMO';
  if (score >= 70) return 'CARGADO';
  if (score >= 55) return 'ESTABLE';
  if (score >= 40) return 'BAJO';
  return 'CRÍTICO';
}

/** Devuelve un mensaje contextual según score y hora del día. */
export function getScoreMessage(score: number, hour: number): string {
  if (score >= 85) {
    if (hour < 12) return 'Tu ATP está al máximo. Hoy es día de rendir.';
    if (hour < 18) return 'Nivel de energía excepcional. Aprovecha la tarde.';
    return 'Gran día. Tu cuerpo agradece la consistencia.';
  }
  if (score >= 70) {
    if (hour < 12) return 'Buen nivel de energía. Arranca con todo.';
    if (hour < 18) return 'Mantén el ritmo. Vas bien.';
    return 'Día sólido. Prepárate para un buen descanso.';
  }
  if (score >= 55) {
    if (hour < 12) return 'Energía moderada. Entrena inteligente, no fuerte.';
    if (hour < 18) return 'Escucha a tu cuerpo. Ajusta la intensidad.';
    return 'Tu sistema pide equilibrio. No exijas de más.';
  }
  if (score >= 40) {
    if (hour < 12) return 'Tu ATP está bajo. Prioriza recuperación hoy.';
    if (hour < 18) return 'Movilidad y descanso activo hoy.';
    return 'Modo recuperación. Medita y duerme temprano.';
  }
  if (hour < 12) return 'Estado crítico. Descanso absoluto hoy.';
  if (hour < 18) return 'Tu cuerpo necesita reset. Nada de entrenar.';
  return 'Prioriza sueño profundo. Mañana será otro día.';
}

/**
 * Degradado de marca correcto para una superficie heroica (Batch 3 · #23):
 * con pilar → PILLAR_GRADIENTS[pilar] como tupla [start, end] lista para
 * LinearGradient; sin pilar → la molécula lime→teal. Fondos/cards heroicas
 * usan ESTO; el lime plano queda solo para micro-acentos (ACCENT_ROLES).
 */
export function brandGradient(pillar?: keyof typeof PILLAR_GRADIENTS): readonly [string, string, ...string[]] {
  if (pillar && PILLAR_GRADIENTS[pillar]) {
    const g = PILLAR_GRADIENTS[pillar];
    return [g.start, g.end] as const;
  }
  return ATP_BRAND.moleculeGradient;
}

/** Gradientes por pilar/categoria — start (color tinted) -> end (oscuro). */
export const PILLAR_GRADIENTS = {
  fitness:    { start: 'rgba(140,191,36,0.25)', end: 'rgba(10,10,10,0.95)' }, // = CATEGORY_COLORS.fitness (MB-17 4.2)
  nutrition:  { start: 'rgba(91,155,213,0.25)', end: 'rgba(10,10,10,0.95)' },
  mind:       { start: 'rgba(127,119,221,0.25)', end: 'rgba(10,10,10,0.95)' },
  health:     { start: 'rgba(29,158,117,0.25)', end: 'rgba(10,10,10,0.95)' },
  cycle:      { start: 'rgba(212,83,126,0.25)', end: 'rgba(10,10,10,0.95)' },
  metrics:    { start: 'rgba(29,158,117,0.25)', end: 'rgba(10,10,10,0.95)' },
  sleep:      { start: 'rgba(91,155,213,0.20)', end: 'rgba(10,10,10,0.95)' },
  recovery:   { start: 'rgba(78,170,128,0.20)', end: 'rgba(10,10,10,0.95)' },
  stress:     { start: 'rgba(239,159,39,0.20)', end: 'rgba(10,10,10,0.95)' },
  activity:   { start: 'rgba(140,191,36,0.20)', end: 'rgba(10,10,10,0.95)' }, // = CATEGORY_COLORS.fitness (MB-17 4.2)
  protocol:   { start: 'rgba(239,159,39,0.20)', end: 'rgba(10,10,10,0.95)' },
} as const;

// ═══════════════════════════════════════════════════════════════════
// CAPA SEMÁNTICA (MB-0a — habilita LIGHT en v2.1 sin repintar)
// ═══════════════════════════════════════════════════════════════════
// Alias sobre los tokens canónicos dark (BG/BORDER/TEXT/SURFACES/ATP_BRAND).
// NO cambia ningún valor; da el punto único de indirección donde v2.1
// introducirá el set light. Los consumidores migran a esta capa en v2.1;
// en V2 basta con que exista.

export const SEMANTIC_THEME = {
  bg: {
    screen: BG.screen,
    card: BG.card,
    elevated: BG.cardElevated,
    input: BG.input,
  },
  surface: {
    base: SURFACES.base,
    card: SURFACES.card,
    border: BORDER.card,
    borderInput: BORDER.input,
    borderSubtle: BORDER.subtle,
    disabled: SURFACES.disabled,
  },
  text: {
    primary: TEXT.primary,
    secondary: TEXT.secondary,
    tertiary: TEXT.tertiary,
    muted: TEXT.muted,
    onAccent: TEXT_COLORS.onAccent,
  },
  accent: {
    primary: ATP_BRAND.lime,
    teal: ATP_BRAND.teal,
    amber: ATP_BRAND.amber,
  },
} as const;

export type SemanticTheme = typeof SEMANTIC_THEME;

// ═══════════════════════════════════════════════════════════════════
// TEMAS (MB-31A — Manual de marca cap. 3.5/3.6, aprobado 9-ago-2026)
// ═══════════════════════════════════════════════════════════════════
// Un token nombra un ROL, no un color. Los nombres son los del brief para
// que el audit los coteje 1:1 contra el manual. El oscuro son los valores
// que la app YA usa (no se tocan); el claro es el acero del cap. 3.6.
//
// ⚠️ Nota de fidelidad, REAPUNTADA el 22-ago-2026 (ACERO). Hasta hoy este
// comentario decía que el lienzo de quien no elige tema era #000000 y que así
// se quedaba. Esa decisión la cambió el dueño: el negro puro se lee demasiado
// profundo. El lienzo del modo oscuro es ahora OSCURO.fondo — #0F1114 con la
// bandera ACERO_OSCURO encendida, #000000 con ella apagada.
//
// Lo que el candado protegía y SIGUE protegiendo es la otra mitad: que quien
// no elige nada reciba el modo OSCURO, no el claro y no el del sistema. Eso
// no se movió ni un milímetro y vive en theme-mode-core (THEME_MODE_DEFAULT
// = 'oscuro', con su test). Lo que se reapuntó es CUÁL es el oscuro.
//
// Lo que este archivo NO puede alcanzar: el splash NATIVO de app.json sigue
// en #000000 y es recurso compilado, así que el arranque en frío pasa del
// negro del splash al acero de la app hasta el próximo build nativo.

export interface AppThemeTokens {
  kind: 'dark' | 'light';
  /** El lienzo de la pantalla. */
  fondo: string;
  /** Superficie de card (más clara que el fondo, en los dos modos). */
  card: string;
  /** Dato dentro de una card, campo de captura (en claro se oscurece). */
  hundido: string;
  /** Hoja modal, menú emergente. */
  flotante: string;
  /** Separadores, contorno de card. */
  borde: string;
  /** Campo con foco, selección. */
  bordeMarcado: string;
  /** Texto principal. */
  texto: string;
  /** Texto secundario. */
  textoSecundario: string;
  /** Texto tenue — solo etiquetas grandes o deshabilitadas (3.19 en claro). */
  textoTenue: string;
  /** Texto sobre relleno lima (negro en los dos modos). */
  textoSobreLima: string;
  /** Acento de texto/enlace: el teal, calibrado por fondo como una tinta
   *  según el papel. En claro JAMÁS #1ABC9C (2.06) ni lima (1.34). */
  tealTexto: string;
  /** Error de interfaz. Coral apagado en oscuro; #B03A2E en claro (el coral
   *  no se lee). Nunca grita más que un biomarcador crítico. */
  error: string;
  // Los tres estados como TINTA, calibrados por tema. El `error` de
  // arriba es el error de INTERFAZ (un campo mal llenado); `critico` es
  // el estado CLÍNICO, y son colores distintos a propósito.
  //
  // AVISO medido: en tema claro los tres se separan por TONO, no por
  // luminancia (contraste mutuo de 1.03 a 1.40, porque los tres están
  // oscurecidos para sentarse sobre la misma superficie clara). Por eso
  // el color NUNCA puede ser el único portador de la señal en claro:
  // siempre va con etiqueta de texto o icono (WCAG 1.4.1).
  /** Éxito / óptimo como TINTA. En oscuro es el lima de marca (10.75);
   *  en claro el lima es invisible (1.34), así que baja a lima
   *  oscurecido #4F6B0D (5.22 card · 4.66 fondo · AA). */
  exito: string;
  /** Advertencia como TINTA. #EF9F27 en oscuro (7.77); en claro ese
   *  ámbar da 1.86 y no se lee, así que baja a #8A5A00 (5.07 card ·
   *  4.53 fondo · AA). */
  advertencia: string;
  /** Crítico CLÍNICO como TINTA. #FF3B30 en oscuro (4.76); en claro da
   *  3.03, que no alcanza AA para letra chica, así que baja a #991B1B
   *  (7.11 card · 6.35 fondo · AA). */
  critico: string;
  /** Sin datos. */
  sinDatos: string;
  /** Información como texto. */
  info: string;
  /** Borde de la card editorial: la card queda OSCURA en los dos modos
   *  (es la ventana, no el marco); solo su borde cambia para despegarse. */
  bordeEditorial: string;
}

/** Modo oscuro — el canónico, los valores que la app ya es. */
export const THEME_DARK: AppThemeTokens = {
  kind: 'dark',
  fondo: OSCURO.fondo,          // acero #0F1114 · negro #000000
  card: SURFACES.card,          // acero #1A1D22 · negro #121212
  hundido: OSCURO.campo,        // campo de captura (BG.input)
  flotante: OSCURO.flotante,    // ELEVATION[2] / "elevado" del manual 3.5
  borde: SURFACES.border,       // ELEVATION[1].border
  bordeMarcado: OSCURO.bordeMarcado, // ELEVATION[2].border (foco/selección)
  texto: TEXT_COLORS.primary,   // #FFFFFF
  textoSecundario: TEXT_COLORS.secondary, // #888888
  textoTenue: TEXT_COLORS.muted,          // #555555
  textoSobreLima: TEXT_COLORS.onAccent,   // #000000
  tealTexto: '#1ABC9C',
  error: SEMANTIC.error,        // #E8877F coral apagado
  exito: ATP_BRAND.lime,        // #A8E02A · 10.75 sobre card
  advertencia: SEMANTIC.warning, // #EF9F27 · 7.77 sobre card
  critico: SCORE_COLORS.critical, // #FF3B30 · 4.76 sobre card
  sinDatos: SEMANTIC.noData,    // #444444
  info: SEMANTIC.info,          // #5B9BD5
  bordeEditorial: 'transparent',
} as const;

/** Modo claro · ACERO — manual 3.6, contrastes verificados por test. */
export const THEME_LIGHT: AppThemeTokens = {
  kind: 'light',
  fondo: '#DBE2E7',
  card: '#E9EEF1',
  hundido: '#D3DBE1',
  flotante: '#F2F5F7',
  borde: '#CBD5DC',
  bordeMarcado: '#B4C1CA',
  texto: '#0F1518',             // 15.75 sobre card · AAA
  textoSecundario: '#4A555C',   // 6.54 sobre card · AA
  textoTenue: '#7A868E',        // 3.19 — solo texto grande
  textoSobreLima: '#000000',    // 13.36 · AAA
  tealTexto: '#086A5E',         // 5.56 sobre card · 4.96 sobre fondo · AA
  error: '#B03A2E',
  exito: '#4F6B0D',             // lima oscurecido · 5.22 card · 4.66 fondo · AA
  advertencia: '#8A5A00',       // 5.07 card · 4.53 fondo · AA
  critico: '#991B1B',           // 7.11 card · 6.35 fondo · AA
  sinDatos: '#A9B4BC',
  info: '#2E6DA4',
  bordeEditorial: '#CBD5DC',
} as const;

export const APP_THEMES = { dark: THEME_DARK, light: THEME_LIGHT } as const;

/**
 * ESCALA_NIVEL — la rampa de CINCO pasos para escalas de grado (índice UV,
 * grado de deficiencia, nivel de riesgo). No es lo mismo que los tres
 * tokens de estado: aquí el dato tiene grados, no estados.
 *
 * Por qué existe: la rampa que la app traía es la familia por defecto de
 * Tailwind (#22c55e #fbbf24 #fb923c #ef4444 #dc2626), y sobre superficie
 * CLARA da de 1.19 a 3.45 de contraste, o sea que la barra desaparece.
 * Medido con contrast.ts, no estimado. El lado oscuro se queda tal cual
 * porque ahí sí funciona (3.50 a 11.73).
 *
 * Los pasos 0, 1 y 3 del lado claro son exactamente THEME_LIGHT.exito,
 * .advertencia y .critico; los pasos 2 y 4 son los dos intermedios que
 * una escala de cinco necesita y un juego de tres estados no tiene.
 *
 * REGLA que sale de la medición: en claro los tres primeros pasos se
 * separan por TONO, no por luminancia (1.03 y 1.04 entre vecinos). Así
 * que una barra de esta rampa en tema claro SIEMPRE va acompañada de su
 * cifra o su etiqueta. El color solo NO comunica el grado (WCAG 1.4.1).
 */
export const ESCALA_NIVEL = {
  //        0 bajo     1 moderado 2 alto     3 muy alto 4 extremo
  dark:  ['#22c55e', '#fbbf24', '#fb923c', '#ef4444', '#dc2626'],
  light: ['#4F6B0D', '#8A5A00', '#A34500', '#991B1B', '#6B0F0F'],
} as const;

/** Contrastes del lado claro sobre card · fondo · hundido · borde:
 *  paso 0  5.22 · 4.66 · 4.36 · 4.09
 *  paso 1  5.07 · 4.53 · 4.23 · 3.98
 *  paso 2  5.27 · 4.71 · 4.40 · 4.13
 *  paso 3  7.11 · 6.35 · 5.93 · 5.58
 *  paso 4 10.57 · 9.44 · 8.82 · 8.29
 *  Los cinco pasan AA sobre card y sobre fondo, y 3:1 sobre borde. */
export function colorNivel(paso: number, kind: 'dark' | 'light'): string {
  const rampa = kind === 'light' ? ESCALA_NIVEL.light : ESCALA_NIVEL.dark;
  const i = Math.max(0, Math.min(rampa.length - 1, Math.round(paso)));
  return rampa[i];
}

// ═══════════════════════════════════════════════════════════════════
// HOY BACKGROUNDS — Imagenes de fondo dinamicas por hora
// ═══════════════════════════════════════════════════════════════════
// requires estaticos (Metro bundler los analiza en tiempo de compilacion).
// 4 imagenes en assets/backgrounds/ cubren los 4 momentos del dia.

/** Devuelve la imagen de fondo apropiada segun la hora (franja pura en time-of-day).
 * requires LAZY dentro de la funcion (Batch 3): Metro los sigue resolviendo estatico,
 * pero importar brand.ts en tests node ya no toca assets binarios. */
export function getHoyBackgroundRequire(hour: number, _score: number) {
  switch (hoyBgBucket(hour)) {
    case 'sleep': return require('../../assets/backgrounds/bg-sleep.jpg');
    case 'morning': return require('../../assets/backgrounds/bg-morning.jpg');
    case 'midday': return require('../../assets/backgrounds/bg-midday-medium.jpg');
    default: return require('../../assets/backgrounds/bg-night-low.jpg');
  }
}
