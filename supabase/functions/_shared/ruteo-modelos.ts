// ruteo-modelos: logica PURA del ruteo de modelos de ARGOS (sin Deno/Node/red).
// La importan la Edge Function argos-proxy (Deno) y los tests (vitest), para
// que haya una sola verdad.
//
// DECISION DEL DUENO (21-sep-2026), la calidad antes que el ahorro:
//
//   Clase        Principal                Respaldo          Para que
//   ----------   ----------------------   ---------------   ---------------------------------
//   extraccion   Gemini 2.5 Pro           Sonnet 5          fotos de comida, etiquetas, suplementos
//   clinico      Sonnet 5                 Gemini 2.5 Pro    chat, voz, labs, evaluacion, insights,
//                                                           TODAS las recomendaciones (default)
//   navegacion   Gemini 3.5 Flash-Lite    Haiku 4.5         navegar la app y titular conversaciones
//
// Cada clase tiene un principal y un respaldo de OTRO proveedor: si Anthropic
// o Google se cae completo, la otra mitad responde. Lo que no esta en la tabla
// es clinico: ante la duda, el modelo fuerte.
//
// Precios por millon de tokens (entrada / salida), verificados el 21-sep-2026:
//   Sonnet 5 $2/$10 · Haiku 4.5 $1/$5 · Gemini 2.5 Pro $1.25/$10 ·
//   Gemini 3.5 Flash-Lite $0.30/$2.50 · Gemini 2.5 Flash $0.30/$2.50.

export type LlmProvider = "anthropic" | "google";
export interface ModelRoute { provider: LlmProvider; model: string }
export type ClaseDeRuta = "extraccion" | "clinico" | "navegacion";
export interface RutaCompleta { clase: ClaseDeRuta; principal: ModelRoute; respaldo: ModelRoute }

export const MODELO_SONNET = "claude-sonnet-5";
export const MODELO_HAIKU = "claude-haiku-4-5-20251001";
export const MODELO_GEMINI_PRO = "gemini-2.5-pro";
export const MODELO_GEMINI_LITE = "gemini-3.5-flash-lite";
/** El respaldo de siempre (antes del 21-sep) y el modelo de las automaticas de free. */
export const MODELO_GEMINI_FLASH = "gemini-2.5-flash";

export const R_SONNET: ModelRoute = { provider: "anthropic", model: MODELO_SONNET };
export const R_HAIKU: ModelRoute = { provider: "anthropic", model: MODELO_HAIKU };
export const R_GEMINI_PRO: ModelRoute = { provider: "google", model: MODELO_GEMINI_PRO };
export const R_GEMINI_LITE: ModelRoute = { provider: "google", model: MODELO_GEMINI_LITE };
export const R_GEMINI_FLASH: ModelRoute = { provider: "google", model: MODELO_GEMINI_FLASH };

export const RUTAS: Record<ClaseDeRuta, RutaCompleta> = {
  extraccion: { clase: "extraccion", principal: R_GEMINI_PRO, respaldo: R_SONNET },
  clinico: { clase: "clinico", principal: R_SONNET, respaldo: R_GEMINI_PRO },
  navegacion: { clase: "navegacion", principal: R_GEMINI_LITE, respaldo: R_HAIKU },
};

/**
 * requestType -> clase. Solo se listan extraccion y navegacion; todo lo demas
 * (chat, voice_turn, dx_generation*, lab_interpretation, clinical_interpretation,
 * insight, weekly_insight, daily_summary, meal_suggestion, recipe,
 * goal_decomposition, food_reanalysis, bha_scan, routine, ...) es clinico.
 */
export const CLASE_POR_TIPO: Record<string, ClaseDeRuta> = {
  // Extraccion: leer lo que hay en la foto o el texto y devolverlo en estructura.
  food_estimate_photo: "extraccion",
  food_estimate_text: "extraccion",
  label_scan: "extraccion",
  supplement_scan: "extraccion",
  etiqueta_super: "extraccion",
  // Navegacion: a que pantalla quiere ir (lista cerrada) y el titulo de una
  // conversacion (seis palabras). Ninguna lee ni juzga datos de salud.
  nav_intent: "navegacion",
  title: "navegacion",
};

export function claseDe(requestType?: string): ClaseDeRuta {
  return (requestType && CLASE_POR_TIPO[requestType]) || "clinico";
}

/**
 * Ruta de una peticion.
 * - `desactivado` (env MODEL_ROUTING=off): conducta legacy exacta de antes del
 *   ruteo: el modelo que mando el cliente (o Sonnet) y Gemini 2.5 Flash de respaldo.
 * - `overrides` (env MODEL_ROUTING_OVERRIDES, JSON por requestType): cambia
 *   principal y/o respaldo sin redeploy.
 * - Los PDFs no pueden ir a Google (el bloque type:"document" de Anthropic no
 *   se traduce): con PDF el principal es siempre el de Anthropic de la ruta y
 *   no hay respaldo.
 */
export function resolverRuta(args: {
  requestType?: string;
  clientModel?: string;
  desactivado?: boolean;
  overrides?: Record<string, Partial<{ principal: ModelRoute; respaldo: ModelRoute }>>;
  tienePdf?: boolean;
}): RutaCompleta {
  const clase = claseDe(args.requestType);
  let ruta: RutaCompleta;
  if (args.desactivado) {
    ruta = {
      clase,
      principal: { provider: "anthropic", model: args.clientModel || MODELO_SONNET },
      respaldo: R_GEMINI_FLASH,
    };
  } else {
    ruta = { ...RUTAS[clase] };
    const o = args.requestType ? args.overrides?.[args.requestType] : undefined;
    if (o?.principal && esRuta(o.principal)) ruta.principal = o.principal;
    if (o?.respaldo && esRuta(o.respaldo)) ruta.respaldo = o.respaldo;
    // Un override que deja principal y respaldo del MISMO proveedor rompe el
    // respaldo cruzado (si ese proveedor se cae, no hay red). Se corrige solo:
    // el respaldo pasa al modelo de la tabla que es del otro proveedor.
    if (ruta.respaldo.provider === ruta.principal.provider) {
      const base = RUTAS[clase];
      ruta.respaldo = base.principal.provider !== ruta.principal.provider ? base.principal : base.respaldo;
    }
  }
  if (args.tienePdf) {
    const anth = ruta.principal.provider === "anthropic" ? ruta.principal
      : ruta.respaldo.provider === "anthropic" ? ruta.respaldo : R_SONNET;
    return { clase, principal: anth, respaldo: anth };
  }
  return ruta;
}

function esRuta(r: unknown): r is ModelRoute {
  const x = r as ModelRoute;
  return !!x && (x.provider === "anthropic" || x.provider === "google") && typeof x.model === "string" && x.model.length > 0;
}

/** Hay respaldo real si es un modelo distinto del principal. */
export function hayRespaldo(r: RutaCompleta): boolean {
  return r.respaldo.provider !== r.principal.provider || r.respaldo.model !== r.principal.model;
}

// --- Tiempo -------------------------------------------------------------------
// Reglas (ronda de arreglos del 21-sep):
// - Anthropic como PRINCIPAL conserva sus 58 s de siempre y no deja reserva:
//   los reportes largos (dx_generation, braverman con 8000 tokens) tardan
//   40-58 s y recortarlos seria empeorar lo clinico por un respaldo que casi
//   nunca corre.
// - Google como PRINCIPAL (extraccion, navegacion) tiene tope de 30 s y deja
//   reserva para que su respaldo de Anthropic alcance a correr.
// - El respaldo usa lo que quede del limite total.
// El limite total es 110 s. Documentacion de Supabase (verificada el 21-sep):
// sin respuesta en 150 s la peticion da 504 (idle timeout), y el reloj maximo
// es 150 s en free y 400 s en pago. El "techo de 60 s" de los comentarios
// viejos de argos-proxy no es real; 110 s deja 40 s de margen al 504.
export const LIMITE_TOTAL_MS = 110000;
export const TOPE_ANTHROPIC_MS = 58000;
export const TOPE_GEMINI_MS = 30000;
/** Lo que un principal Google le deja a su respaldo de Anthropic. */
export const RESERVA_RESPALDO_MS = 30000;
const MINIMO_MS = 4000;

/** Timeout del intento actual, a partir de lo que queda del limite total. */
export function timeoutPara(args: {
  proveedor: LlmProvider;
  transcurridoMs: number;
  dejarReserva: boolean;
}): number {
  const tope = args.proveedor === "anthropic" ? TOPE_ANTHROPIC_MS : TOPE_GEMINI_MS;
  const restante = LIMITE_TOTAL_MS - args.transcurridoMs - (args.dejarReserva ? RESERVA_RESPALDO_MS : 0);
  return Math.max(MINIMO_MS, Math.min(tope, restante));
}

// --- Gemini (endpoint compatible con OpenAI) ------------------------------------

/**
 * Mensajes estilo Anthropic -> OpenAI, SIN perder imagenes. Antes se aplanaba
 * todo a texto y las fotos se tiraban: una foto de comida que caia a Gemini se
 * estimaba sin foto. Un mensaje con imagen va como arreglo de partes
 * (text + image_url con data URI); uno de solo texto va como string.
 */
export function mensajesParaOpenAI(messages: any[], system?: string | any[]): any[] {
  const out: any[] = [];
  if (system) out.push({ role: "system", content: aplanarTexto(system) });
  for (const m of messages ?? []) {
    out.push({ role: m?.role, content: contenidoParaOpenAI(m?.content) });
  }
  return out;
}

export function aplanarTexto(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b?.type === "text" || typeof b?.text === "string")
      .map((b: any) => b.text || "")
      .join("\n");
  }
  return String(content ?? "");
}

function contenidoParaOpenAI(content: any): any {
  if (!Array.isArray(content)) return aplanarTexto(content);
  const partes: any[] = [];
  let hayImagen = false;
  for (const b of content) {
    if (b?.type === "image" && b.source) {
      const url = b.source.type === "base64"
        ? `data:${b.source.media_type || "image/jpeg"};base64,${b.source.data}`
        : b.source.type === "url" ? b.source.url : null;
      if (url) { partes.push({ type: "image_url", image_url: { url } }); hayImagen = true; }
    } else if (b?.type === "text" || typeof b?.text === "string") {
      partes.push({ type: "text", text: b.text || "" });
    }
  }
  if (!hayImagen) return aplanarTexto(content);
  return partes;
}

/**
 * Parametros extra de Gemini por modelo. 2.5 Pro y los 3.x piensan siempre
 * (no se puede apagar); se deja en "low" para no gastar tiempo, y se suma un
 * margen a max_tokens porque la documentacion no aclara si el pensamiento
 * cuenta contra ese tope: sin margen, una respuesta corta podia salir vacia.
 * 2.5 Flash conserva exactamente la conducta de antes (sin parametros extra).
 */
export const MARGEN_PENSAMIENTO_TOKENS = 2048;
export function extrasGemini(model: string, maxTokens: number): { max_tokens: number; reasoning_effort?: string } {
  if (model === MODELO_GEMINI_FLASH) return { max_tokens: maxTokens };
  return { max_tokens: maxTokens + MARGEN_PENSAMIENTO_TOKENS, reasoning_effort: "low" };
}
