import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
// Cerebro ARGOS — fallback compilado (sync-brain-app.mjs, SIN domains/dx).
// Solo se usa si el store central (tabla argos_brain) no responde.
import {
  SHARED_BRAIN as BRAIN_FALLBACK,
  BRAIN_VERSION as BRAIN_FALLBACK_VERSION,
} from "./brain.generated.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // x-atp-stream: opt-in de streaming SSE (T2 MAGIA 2.0)
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-atp-stream",
};

// Resilience config (espejo de src/constants/llm-config.ts)
// 2026-06-17: subido Anthropic 25s→55s y Gemini 15s→25s — los PDFs de labs
// con muchas páginas/biomarcadores no caben en 25s. Anthropic responde bien
// pero tarda ~30-40s con visión + JSON estructurado. Cap del Edge Function
// de Supabase es 60s, dejamos 5s de margen para procesamiento post.
const ANTHROPIC_TIMEOUT_MS = 58000;
const GEMINI_TIMEOUT_MS = 25000;
const FALLBACK_MODEL = "gemini-2.5-flash"; // Gemini 2.5 Flash — string confirmado mayo 2026
const PRIMARY_MODEL_DEFAULT = "claude-sonnet-5"; // 2026-07-06: upgrade Sonnet 4.6 → 5 (cost-neutral, mejor razonamiento clínico)

// Pricing en USD por 1M tokens
// Sonnet 5 pricing (Anthropic, lanzado 30-jun-2026):
//   - Intro (hasta 31-ago-2026): $2 in / $10 out / $0.20 cache_read / $2.50 cache_write
//   - Standard (desde 1-sep-2026): $3 in / $15 out / $0.30 cache_read / $3.75 cache_write
// Usamos STANDARD como default en la tabla — durante intro los precios reales son 33% más baratos.
// Al 1-sep-2026 no requiere cambio de config. Actualizar aquí si Anthropic ajusta.
// Gemini 2.5 Flash pricing confirmado mayo 2026: $0.30/M in, $2.50/M out
const PRICING: Record<string, { input: number; output: number; cache_read: number; cache_write: number }> = {
  // Tarifa de INTRODUCCIÓN de Sonnet 5 ($2/M in). Anthropic confirmó por correo
  // que NO sube el 1-sep-2026 (INGENIERIA_DE_CACHE_ATP). La tabla anterior usaba
  // la tarifa estándar y la telemetría de costos mentía +33%. cache_write refleja
  // el multiplicador 2.0x de TTL 1h (el que usa el cerebro desde 12-ago-2026).
  "claude-sonnet-5": { input: 2, output: 10, cache_read: 0.20, cache_write: 4 },
  "claude-sonnet-4-6": { input: 3, output: 15, cache_read: 0.30, cache_write: 3.75 }, // legacy — sigue en tabla para logs históricos
  "claude-sonnet-4-20250514": { input: 3, output: 15, cache_read: 0.30, cache_write: 3.75 }, // legacy
  "gemini-2.5-flash": { input: 0.30, output: 2.50, cache_read: 0, cache_write: 0 },
};

// ─── ROUTER DE MODELOS POR requestType (IMPL-01) ─────────────────
// La regla, en una línea: si el output NO cambiaría con otra persona que
// mande el mismo insumo, es extracción y va con Gemini. Si cambia según
// quién pregunta, qué trae encima o qué dice el cerebro ATP, va con Sonnet.
//
// Vive SERVER-SIDE a propósito, por tres razones:
//  1. Es un archivo contra los 19 call sites del cliente que hoy pasan model.
//  2. La tabla ES la whitelist: un cliente modificado ya no puede pedir un
//     modelo caro declarando una acción barata, porque no pide modelo.
//  3. Se ajusta con un deploy de Edge Function, sin OTA y sin build.
//
// Haiku NO entra en el diseño: un respaldo del mismo proveedor no es
// respaldo. Si Anthropic se cae, se cae completo. Por eso los dos polos son
// Anthropic y Google, y cada uno es la red del otro (respaldo cruzado).
type LlmProvider = "anthropic" | "google";
interface ModelRoute { provider: LlmProvider; model: string }

const ROUTE_SONNET: ModelRoute = { provider: "anthropic", model: PRIMARY_MODEL_DEFAULT };
const ROUTE_GEMINI: ModelRoute = { provider: "google", model: FALLBACK_MODEL };

const MODEL_ROUTING: Record<string, ModelRoute> = {
  // Extracción sin cerebro → Gemini. Medido en producción: 45x más barato
  // en foto de comida contra el mismo trabajo en Sonnet.
  food_estimate_photo: ROUTE_GEMINI,
  food_estimate_text: ROUTE_GEMINI,
  label_scan: ROUTE_GEMINI,
  supplement_scan: ROUTE_GEMINI,
  // nav_intent: "¿a qué pantalla quiere ir?" contra un catálogo de 192 rutas.
  // Es clasificación sobre una lista cerrada, no razonamiento clínico: no toca
  // el cerebro, no lee datos de salud, y su salida es un JSON de una ruta. La
  // mayoría de las peticiones ni llegan aquí porque el resolvedor LOCAL
  // (argos-nav-resolver-core) las contesta sin red; esto es solo la red de
  // seguridad para las frases que el índice no alcanzó. Gemini y no Sonnet
  // porque pagar razonamiento por un lookup es el error que este router existe
  // para evitar.
  nav_intent: ROUTE_GEMINI,

  // Análisis, doctrina y cerebro → Sonnet.
  chat: ROUTE_SONNET,
  voice_turn: ROUTE_SONNET,
  dx_generation: ROUTE_SONNET,
  dx_generation_first: ROUTE_SONNET,
  braverman_premium_report: ROUTE_SONNET,
  intervention_rationale: ROUTE_SONNET,
  lab_interpretation: ROUTE_SONNET,
  insight: ROUTE_SONNET,
  weekly_insight: ROUTE_SONNET,
  // bha_scan emite un veredicto Biohacker Approved, que es doctrina ATP.
  // Partirlo en extracción (Gemini) + veredicto (Sonnet) es trabajo posterior:
  // 1 llamada en 3 meses, optimizarlo hoy sería trabajar en el lugar equivocado.
  bha_scan: ROUTE_SONNET,
  routine: ROUTE_SONNET, // legacy huérfano: 2 llamadas históricas. Si revive, con cerebro.
};

/**
 * Rollout por etapas. El router solo manda en los requestType listados en
 * MODEL_ROUTING_ENABLED_TYPES; el resto conserva EXACTAMENTE la conducta de
 * hoy (modelo del cliente, o el default). Desplegar esto sin la env var no
 * cambia nada en producción.
 *
 * Arranca en 'food_estimate_photo' y sola: la ruta Gemini nunca ha corrido
 * como primaria, solo como fallback de errores (32 veces en 3 meses).
 */
function routingEnabledFor(requestType?: string): boolean {
  if (!requestType) return false;
  const raw = Deno.env.get("MODEL_ROUTING_ENABLED_TYPES") ?? "";
  if (raw.trim() === "*") return true;
  return raw.split(",").map((s) => s.trim()).filter(Boolean).includes(requestType);
}

/** Overrides sin redeploy: {"food_estimate_photo":{"provider":"anthropic","model":"claude-sonnet-5"}} */
function routingOverrides(): Record<string, ModelRoute> {
  try {
    const raw = Deno.env.get("MODEL_ROUTING_OVERRIDES");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("[router] MODEL_ROUTING_OVERRIDES no es JSON válido, se ignora:", e);
    return {};
  }
}

function resolveRoute(requestType: string | undefined, clientModel?: string): ModelRoute {
  if (!routingEnabledFor(requestType)) {
    // Conducta legacy intacta: gana lo que mandó el cliente.
    return { provider: "anthropic", model: clientModel || PRIMARY_MODEL_DEFAULT };
  }
  const override = routingOverrides()[requestType!];
  if (override?.provider && override?.model) return override;
  const route = MODEL_ROUTING[requestType!];
  if (route) return route;
  // requestType desconocido con router activo: default seguro, y se registra
  // para que aparezca en los logs si alguien inventa una acción.
  console.warn("[router] requestType sin ruta, va a Sonnet:", requestType);
  return ROUTE_SONNET;
}

// ─── CEREBRO ARGOS (store central) ──────────────────────────────
// La tabla argos_brain es privada; se lee vía la RPC SECURITY DEFINER
// get_argos_brain(product, read_key) con ANON key + read_key scoped —
// mínimo privilegio, NUNCA service_role (la read_key filtrada solo expone
// el cerebro, jamás la base). La app SOLO pide product='atp'; 'dx' es IP
// clínica que no debe tocar la app.
// ─── QUÉ ACCIONES NO RECIBEN EL CEREBRO (CIERRE-4 · Audit-4) ─────
// El cerebro son 26,296 tokens. La pregunta era si el insight diario lo
// necesita. Se midió contra argos_logs (30 días) y la respuesta es NO:
//
//  · El insight produce 165 tokens de salida en promedio sobre un prompt de
//    ~919. Anteponerle el cerebro multiplica su entrada por 29.
//  · En el mejor escenario imaginable (caché siempre tibia, TTL de 1h) son
//    26,296 × $0.20/M = $0.00526 por llamada, sobre un costo medido de
//    $0.00585: casi DUPLICA la factura del insight sin cambiar el producto.
//  · En el escenario que de verdad mide la telemetría (el insight escribe
//    caché en el 53% de sus llamadas y la lee en el 0.5%) cada llamada fría
//    escribe el cerebro completo: 26,296 × $4/M = $0.105, o sea 18 veces el
//    costo actual. El insight es una acción por persona por día repartida en
//    las horas que la gente está despierta, así que la ráfaga que mantiene
//    tibia la caché del chat NO existe aquí. No se cura con volumen: empeora.
//  · Y sobre todo, el contenido no lo pide. El cerebro es doctrina de
//    CONVERSACIÓN: preguntas en cascada, acelerador y freno, formato canónico,
//    creer en el proceso. Nada de eso tiene superficie en dos oraciones. Los
//    candados que SÍ aplican a un insight ya viajan en su prompt y por usuario:
//    el guard de género (que prohíbe atribuir ciclo menstrual), el de protocolo
//    activo, las reglas de aritmética del ayuno, de vigencia del dato, de labs
//    con fase de ciclo y de semántica de Edad ATP, más la voz del usuario.
//
// QUÉ HARÍA CAMBIAR ESTA DECISIÓN: que aparezcan violaciones de doctrina
// medibles en los insights. La respuesta entonces NO es meterle los 26K, es el
// núcleo de seguridad y lenguaje (~2-3K tokens) de la partición del cerebro,
// que hoy está congelada como trabajo aparte.
//
// El gate es server-side a propósito: hoy ningún cliente manda dynamicSystem en
// el insight, pero esto impide que un bundle futuro lo encienda por accidente y
// multiplique la factura sin que nadie lo note hasta el corte del mes.
// Reversible SIN redeploy: BRAIN_DENY_TYPES="" en las env vars del function.
const BRAIN_DENY_TYPES_DEFAULT = "insight,weekly_insight";
function brainDeniedFor(requestType?: string): boolean {
  if (!requestType) return false;
  const raw = Deno.env.get("BRAIN_DENY_TYPES") ?? BRAIN_DENY_TYPES_DEFAULT;
  return raw.split(",").map((s) => s.trim()).filter(Boolean).includes(requestType);
}

const BRAIN_TTL_MS = 5 * 60 * 1000;
let _brainCache: { text: string; version: string; source: "store" | "embedded"; expires: number } | null = null;

// Cliente anon dedicado a la RPC del cerebro (el handler usa service_role
// para logs/economía — no se comparte aquí a propósito).
const supabaseBrainAnon = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

async function getSharedBrain(): Promise<{ text: string; version: string; source: "store" | "embedded" }> {
  const now = Date.now();
  if (_brainCache && _brainCache.expires > now) return _brainCache;
  try {
    const { data, error } = await supabaseBrainAnon.rpc("get_argos_brain", {
      p_product: "atp",
      p_key: Deno.env.get("ARGOS_BRAIN_READ_KEY"),
      // Canal de lectura (runbook del store): production (default, lo PROMOVIDO)
      // o staging (última publicada) para correr la regresión. Producción NO
      // define esta env → siempre lee lo promovido.
      p_channel: Deno.env.get("BRAIN_CHANNEL") || "production",
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.shared_text) {
      _brainCache = { text: row.shared_text, version: row.version, source: "store", expires: now + BRAIN_TTL_MS };
      return _brainCache;
    }
    console.error("brain store rpc: fila vacía o sin shared_text");
  } catch (e) {
    console.error("brain store rpc:", e);
  }
  // Fallback compilado. Cache corto para reintentar el store pronto.
  _brainCache = { text: BRAIN_FALLBACK, version: BRAIN_FALLBACK_VERSION, source: "embedded", expires: now + 60 * 1000 };
  return _brainCache;
}

function computeCost(model: string, inTok: number, outTok: number, cacheRead = 0, cacheWrite = 0): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (inTok * p.input + outTok * p.output + cacheRead * p.cache_read + cacheWrite * p.cache_write) / 1_000_000;
}

async function logArgosCall(supabase: any, params: {
  user_id?: string,
  tier?: string,
  provider: string,
  model: string,
  request_type?: string,
  input_tokens?: number,
  output_tokens?: number,
  cache_read_tokens?: number,
  cache_write_tokens?: number,
  latency_ms: number,
  success: boolean,
  error_message?: string,
  fallback_used?: boolean,
  target_user_id?: string | null,
  target_profile_id?: string | null,
  brain_version?: string | null,
}) {
  try {
    const cost = computeCost(
      params.model,
      params.input_tokens || 0,
      params.output_tokens || 0,
      params.cache_read_tokens || 0,
      params.cache_write_tokens || 0,
    );
    await supabase.from("argos_logs").insert({
      user_id: params.user_id || null,
      tier: params.tier || "unknown",
      provider: params.provider,
      model: params.model,
      request_type: params.request_type || "chat",
      input_tokens: params.input_tokens || 0,
      output_tokens: params.output_tokens || 0,
      cache_read_tokens: params.cache_read_tokens || 0,
      cache_write_tokens: params.cache_write_tokens || 0,
      latency_ms: params.latency_ms,
      success: params.success,
      error_message: params.error_message,
      fallback_used: params.fallback_used || false,
      estimated_cost_usd: cost,
      target_user_id: params.target_user_id ?? null,
      target_profile_id: params.target_profile_id ?? null,
      brain_version: params.brain_version ?? null,
    });
  } catch (e) {
    console.error("argos_logs insert failed:", e);
  }
}

// ─── PROVIDERS ──────────────────────────────────────────────────

// ─── CACHÉ DE LOS LLAMADORES QUE NO SON CHAT (CIERRE-4 · IMPL-02) ─
// Aquí el diagnóstico salió al revés de lo que se esperaba, así que vale la
// pena dejarlo escrito: los llamadores no-chat no es que "no aprovechen" la
// caché, es que NO PUEDEN aprovecharla, y mientras tanto la estaban pagando.
//
// El código anterior envolvía TODO `system` string en un bloque con
// cache_control. Escribir caché cuesta 1.25x lo que cuesta la entrada normal;
// solo sale a cuenta si alguien vuelve a leer ese bloque idéntico antes de que
// expire (5 minutos). Lo medido en argos_logs (30 días), sumando todos los
// tipos que no son chat: 108 escrituras de caché y 2 lecturas. 1.8% de acierto.
// El insight solo: 103 escrituras, 1 lectura.
//
// Y no es mala suerte, es estructural, por dos razones distintas:
//  · El system del insight lleva el nombre y los datos de UNA persona. Dos
//    usuarios nunca generan el mismo bloque, así que jamás habrá una segunda
//    lectura. Pagar la escritura es tirar el 25% del costo de entrada.
//  · Los que sí tienen system constante entre usuarios (dx_generation,
//    bha_scan, intervention_rationale, braverman_premium_report) miden entre 1
//    y 5 llamadas al MES. Con una ventana de 5 minutos, la segunda lectura no
//    llega nunca. A ese volumen, cachear también es pérdida pura.
//
// Por eso el default se invierte: un `system` string NO se cachea. El cerebro
// (que llega como array de bloques y sí es idéntico para todos, con 84% de
// acierto medido en chat) no se toca en absoluto.
//
// EFECTO SECUNDARIO QUE IMPORTA: la tabla PRICING cobra cache_write a $4/M,
// que es el multiplicador 2.0x del TTL de 1 hora que usa el cerebro. Las
// escrituras legacy eran de 5 minutos (1.25x = $2.50/M), así que la telemetría
// de costos venía inflando esas llamadas ~60%. Al dejar de existir, PRICING
// pasa a describir la realidad: el único que escribe caché es el cerebro, a 1h.
//
// CUÁNDO REVISAR ESTO: cuando algún tipo de system constante pase de ~1 llamada
// cada 5 minutos sostenida. Entonces se enciende por tipo, sin redeploy:
// NONCHAT_PROMPT_CACHE="bha_scan,dx_generation" (o "*" para todos).
function shouldCacheStringSystem(requestType?: string): boolean {
  const raw = (Deno.env.get("NONCHAT_PROMPT_CACHE") ?? "").trim();
  if (!raw) return false;
  if (raw === "*") return true;
  if (!requestType) return false;
  return raw.split(",").map((s) => s.trim()).filter(Boolean).includes(requestType);
}

// 🟡 Anthropic prompt caching ya es GA en mayo 2026 — sin header beta requerido.
// Si Anthropic vuelve a exigir beta, agregar: "anthropic-beta": "prompt-caching-2024-07-31".
//
// T2 MAGIA 2.0: helper compartido entre el modo no-stream (callAnthropicProvider)
// y el modo SSE (rama streaming del handler) — mismo body/headers en ambos.
function buildAnthropicHttp(args: {
  model: string;
  messages: any[];
  system?: string | any[];
  max_tokens: number;
  stream?: boolean;
  /** Ver shouldCacheStringSystem: por default un `system` string NO se cachea. */
  cacheSystem?: boolean;
}): { requestBody: Record<string, unknown>; headers: Record<string, string> } {
  const requestBody: Record<string, unknown> = {
    model: args.model,
    max_tokens: args.max_tokens,
    messages: args.messages,
  };
  if (args.stream) requestBody.stream = true;
  if (args.system) {
    // Array = bloques ya armados (cerebro cacheado + dinámico sin cache) →
    // passthrough con sus cache_control (máx 4 breakpoints; usamos 1).
    // String = un solo bloque. El cache_control ya NO va por default: ver
    // shouldCacheStringSystem para el porqué (medido, no supuesto).
    requestBody.system = Array.isArray(args.system)
      ? args.system
      : [args.cacheSystem
        ? { type: "text", text: args.system, cache_control: { type: "ephemeral" } }
        : { type: "text", text: args.system }];
  }

  // Capa 5: si el documento referencia un file_id (Files API), añadir su beta header.
  const serialized = JSON.stringify(args.messages);
  const hasFileSource = serialized.includes('"file_id"');

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
    "anthropic-version": "2023-06-01",
  };
  // 2026-06-18: PDFs ya son GA en Sonnet 4.x (no requieren beta header).
  // Pasar el header viejo `pdfs-2024-09-25` causa que Anthropic cuelgue el
  // request sin procesar (input_tokens=0, timeout silencioso). Files API SÍ
  // requiere beta pero por ahora está desactivada (no se manda type:"file").
  const betas: string[] = [];
  if (hasFileSource) betas.push("files-api-2025-04-14");
  if (betas.length > 0) headers["anthropic-beta"] = betas.join(",");

  return { requestBody, headers };
}

async function callAnthropicProvider(args: {
  model: string;
  messages: any[];
  system?: string | any[];
  max_tokens: number;
  cacheSystem?: boolean;
}): Promise<{
  ok: boolean;
  data: any;
  status: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}> {
  const { requestBody, headers } = buildAnthropicHttp({ ...args, cacheSystem: args.cacheSystem });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json();
  return {
    ok: response.ok,
    data,
    status: response.status,
    input_tokens: data?.usage?.input_tokens || 0,
    output_tokens: data?.usage?.output_tokens || 0,
    cache_read_tokens: data?.usage?.cache_read_input_tokens || 0,
    cache_write_tokens: data?.usage?.cache_creation_input_tokens || 0,
  };
}

// Adapta messages estilo Anthropic (con content como string o array de blocks) a OpenAI plain text.
function flattenContentForOpenAI(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b?.type === "text" || typeof b?.text === "string")
      .map((b: any) => b.text || "")
      .join("\n");
  }
  return String(content || "");
}

async function callGeminiProvider(args: {
  model: string;
  messages: any[];
  system?: string | any[];
  max_tokens: number;
}): Promise<{
  ok: boolean;
  data: any;
  status: number;
  text: string;
  input_tokens: number;
  output_tokens: number;
}> {
  const openaiMessages: any[] = [];
  // system puede venir como array de bloques (cerebro activo) → aplanar a texto.
  if (args.system) openaiMessages.push({ role: "system", content: flattenContentForOpenAI(args.system) });
  for (const m of args.messages) {
    openaiMessages.push({ role: m.role, content: flattenContentForOpenAI(m.content) });
  }

  const requestBody = {
    model: args.model,
    messages: openaiMessages,
    max_tokens: args.max_tokens,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("GEMINI_API_KEY")!}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";
  return {
    ok: response.ok,
    data,
    status: response.status,
    text,
    input_tokens: data?.usage?.prompt_tokens || 0,
    output_tokens: data?.usage?.completion_tokens || 0,
  };
}

// ─── CIRCUIT BREAKER ────────────────────────────────────────────

// PREMIUM (16-ago-2026): aquí vivía TIER_DAILY_LIMITS (free 5, base 25, pro
// 150, clinician 100). Se fue completo. Con una sola membresía no hay tope
// diario que corte el acceso a nadie: quien pagó pregunta lo que quiera.
//
// El razonamiento, para que no vuelva por la puerta de atrás: el activo más
// valioso de ATP es la IA. Racionarla hace que se use menos, y quien la usa
// menos desinstala. Un usuario que registró 20 comidas y se quedó sin poder
// preguntar nada habiendo gastado siete centavos de dólar es el modo de falla
// que mata la app, y ya pasó.
//
// El conteo diario NO se quita, solo deja de bloquear. Se sigue registrando en
// argos_daily_usage porque es el insumo de los LÍMITES SUAVES que vienen
// después: cuando alguien pase cierto volumen, se le baja el NIVEL DE MODELO
// (Gemini en vez de Sonnet), nunca se le corta. Ese cambio va en `routeModel`,
// que ya decide proveedor por requestType, no aquí.
//
// ⚠️ TECHO ANTIABUSO — esto NO es un límite de producto, es una defensa contra
// una llave filtrada o un script. Está deliberadamente absurdo: 13 veces el
// tope que tenía el plan más caro. Ninguna persona real lo toca; un bucle
// automatizado lo revienta en minutos. Sin esto, un solo token robado puede
// facturar miles de dólares en una noche y no hay forma de enterarse hasta el
// corte. Si se decide que ni esto va, se pone en Infinity y se acepta el
// riesgo a ojos abiertos.
const TECHO_ANTIABUSO_DIARIO = 2000;

// ─── CUOTA PONDERADA POR COSTO REAL (CIERRE-4 · Audit-5) ─────────
// El circuit breaker cobraba UNA unidad por petición sin mirar el requestType.
// Medido en argos_logs (30 días), el costo por llamada NO se parece entre sí:
//
//   chat                  $0.03837   ← la referencia, peso 1
//   dx_generation         $0.07196
//   insight               $0.00585
//   food_estimate_text    $0.00338   ← 11 veces más barata que un chat
//   weekly_insight        $0.00278
//
// Y eso todavía con food_estimate corriendo en Sonnet. Con el router mandándolo
// a Gemini la brecha se abre otro orden de magnitud.
//
// PREMIUM: los pesos siguen vivos aunque ya nadie se bloquee, y no es
// contradicción. El conteo ponderado es la MEDICIÓN sobre la que se van a
// decidir los límites suaves (bajar el modelo, no cortar). Contar una foto de
// comida como si fuera una consulta a ARGOS deformaría esa medición desde el
// primer día.
//
// EL CANDADO: todos los pesos son <= 1, y la saturación está también dentro de
// consume_argos_usage_weighted. La cuota ponderada NUNCA puede ser más estricta
// que la de hoy, solo más holgada.
// Un requestType desconocido pesa 1: nunca se abarata algo que no medimos.
const QUOTA_WEIGHTS: Record<string, number> = {
  // Extracción: el usuario está registrando su vida, no consultando a ARGOS.
  // Cobrarle su cuota de consultas por fotografiar su comida es cobrarle por
  // usar la app.
  food_estimate_photo: 0.1,
  food_estimate_text: 0.1,
  food_reanalysis: 0.1,
  label_scan: 0.1,
  supplement_scan: 0.1,
  // Navegación: un lookup contra un catálogo de rutas, y la mayoría ni llega
  // aquí porque el resolvedor local las contesta sin red.
  nav_intent: 0.05,
  // Automáticas: las dispara la app, no la persona. Que un insight que el
  // usuario no pidió le coma la cuota de lo que sí quiere preguntar es
  // cobrarle por algo que no hizo.
  insight: 0.25,
  weekly_insight: 0.25,
  daily_summary: 0.25,
  title: 0.1,
  // Conversación y análisis: la referencia.
  chat: 1,
  voice_turn: 1,
  dx_generation: 1,
  dx_generation_first: 1,
  braverman_premium_report: 1,
  lab_interpretation: 1,
  clinical_interpretation: 1,
  intervention_rationale: 1,
  bha_scan: 1,
  recipe: 1,
  routine: 1,
  meal_suggestion: 1,
  goal_decomposition: 1,
};

/** Overrides sin redeploy: {"food_estimate_photo":0.2}. Saturado a [0,1]. */
function quotaWeightFor(requestType?: string): number {
  if (!requestType) return 1;
  let w = QUOTA_WEIGHTS[requestType] ?? 1;
  try {
    const raw = Deno.env.get("QUOTA_WEIGHT_OVERRIDES");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.[requestType] === "number") w = parsed[requestType];
    }
  } catch (e) {
    console.error("[quota] QUOTA_WEIGHT_OVERRIDES no es JSON válido, se ignora:", e);
  }
  return Math.min(Math.max(w, 0), 1);
}

// PREMIUM: la membresía ya NO abre ni cierra funciones, así que esto dejó de
// ser un portero. Se conserva porque `argos_logs.tier` alimenta la telemetría
// de costo por tipo de usuario, que sigue siendo cómo se decide el ruteo de
// modelos. Se fue la consulta a pro_boosts: los boosts ya no existen.
// Cache 30s in-memory sencillo — evita golpear DB en cada request.
const tierCache = new Map<string, { effectiveTier: string; expiresAt: number }>();

/** Valores de profiles.tier que significan "pagó" (espejo de tier-logic.ts). */
const VALORES_PAGADOS = new Set(["base", "pro", "clinician", "premium", "founder"]);

async function detectEffectiveTier(supabase: any, userId: string): Promise<string> {
  const cached = tierCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.effectiveTier;

  try {
    // ECO-6: MISMO árbitro que el cliente. get_effective_tier (mig 262)
    // resuelve tier_grants + profiles honrando tier_expires_at.
    // PREMIUM: cualquier etiqueta pagada histórica se traduce a 'premium'.
    let crudo = "free";
    let venceEn: string | null = null;
    const { data: resolved, error: tierErr } = await supabase
      .rpc("get_effective_tier", { p_user_id: userId });
    if (!tierErr && resolved && typeof resolved === "object" && typeof resolved.tier === "string") {
      crudo = resolved.tier;
      venceEn = typeof resolved.expires_at === "string" ? resolved.expires_at : null;
    } else {
      if (tierErr) console.error("get_effective_tier rpc error (fallback a profiles):", tierErr);
      const { data: profile } = await supabase
        .from("profiles").select("tier, tier_expires_at").eq("id", userId).maybeSingle();
      crudo = profile?.tier ?? "free";
      venceEn = profile?.tier_expires_at ?? null;
    }
    const vencido = venceEn && new Date(venceEn).getTime() <= Date.now();
    const tier = !vencido && VALORES_PAGADOS.has(String(crudo).toLowerCase()) ? "premium" : "free";

    tierCache.set(userId, { effectiveTier: tier, expiresAt: Date.now() + 30000 });
    return tier;
  } catch (e) {
    console.error("detectEffectiveTier error:", e);
    // PREMIUM: el fail-safe cambió de bando. Antes caía a 'free' porque 'free'
    // era el más restringido; hoy la etiqueta no restringe nada, así que en
    // duda se registra como miembro y jamás se le niega nada a quien pagó por
    // culpa de un error nuestro de lectura.
    return "premium";
  }
}

async function checkAndIncrementUsage(supabase: any, userId: string | undefined, requestType?: string): Promise<{
  blocked: boolean;
  count: number;
  limit: number;
}> {
  const limit = TECHO_ANTIABUSO_DIARIO;
  if (!userId) return { blocked: false, count: 0, limit };
  try {
    // CIERRE-4: cuota ponderada por costo real, gated. Sin la env var el
    // proxy usa la ruta de siempre y se comporta EXACTAMENTE igual que hoy.
    if (Deno.env.get("QUOTA_WEIGHTS_ENABLED") === "true") {
      const weight = quotaWeightFor(requestType);
      const { data: w, error: wErr } = await supabase.rpc("consume_argos_usage_weighted", {
        p_user_id: userId, p_limit: limit, p_weight: weight,
      });
      if (!wErr && w && typeof w === "object") {
        return { blocked: w.blocked === true, count: Number(w.count ?? 0), limit };
      }
      // La 275 aún no está en el remoto (o falló): se cae a la cuota plana de
      // hoy, que es más estricta pero es la que el usuario ya conocía. Nunca
      // se deja pasar sin contar.
      console.error("consume_argos_usage_weighted no disponible, cae a plana:", wErr);
    }
    // ECO-2: el contador SOLO cuenta acciones servidas. consume_argos_usage
    // (mig 262) bloquea SIN incrementar cuando count >= limit — antes cada
    // intento bloqueado sumaba, y quien insistió 200 veces compraba boost y
    // seguía bloqueado (200 > 150).
    const { data, error } = await supabase.rpc("consume_argos_usage", {
      p_user_id: userId, p_limit: limit,
    });
    if (!error && data && typeof data === "object") {
      return { blocked: data.blocked === true, count: Number(data.count ?? 0), limit };
    }
    if (error) console.error("consume_argos_usage error (fallback legacy):", error);
    // Fallback (RPC aún no en el remoto): comportamiento legacy incrementa-y-checa.
    const { data: legacy, error: legacyErr } = await supabase
      .rpc("increment_argos_usage", { p_user_id: userId });
    if (legacyErr) {
      console.error("increment_argos_usage error:", legacyErr);
      return { blocked: false, count: 0, limit }; // fail-open
    }
    const count = typeof legacy === "number" ? legacy : 0;
    return { blocked: count > limit, count, limit };
  } catch (e) {
    console.error("consume_argos_usage exception:", e);
    return { blocked: false, count: 0, limit };
  }
}

// ─── MAIN HANDLER ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startTime = Date.now();
  let body: any = {};

  // PREMIUM (16-ago-2026): se fue el bloque de economía H+ (cobro, idempotencia
  // del cobro y reembolso por fallo del LLM). Sin cobro no hay nada que
  // devolver, así que refundEconomy tampoco tiene sentido. Los RPC siguen
  // existiendo en la base con todo el historial; ya nadie los llama desde aquí.

  try {
    body = await req.json();

    // ─── ECO-3: invalidar tierCache por userId (el cliente lo llama tras
    // activate_pro_boost). Best-effort: con varios isolates solo se limpia el
    // que atiende este request; el TTL de 30s es el backstop. Inofensivo si
    // alguien lo abusa: solo fuerza una lectura fresca de DB. ───
    if (body.action === "invalidate_tier_cache") {
      if (typeof body.userId === "string" && body.userId) tierCache.delete(body.userId);
      return new Response(JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Capa 5 (Files API): subir un archivo a Anthropic y devolver file_id ───
    // El cliente lo cachea en lab_uploads.anthropic_file_id y lo referencia en mensajes.
    // ⚠️ Beta header 'files-api-2025-04-14' — verificar versión vigente antes de prod.
    if (body.action === "upload_file") {
      try {
        const bin = atob(body.fileBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const form = new FormData();
        form.append("file", new Blob([bytes], { type: body.mimeType || "application/pdf" }), body.fileName || "lab.pdf");
        const res = await fetch("https://api.anthropic.com/v1/files", {
          method: "POST",
          headers: {
            "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "files-api-2025-04-14",
          },
          body: form,
        });
        const data = await res.json();
        if (!res.ok) {
          // Track F (MB-7): el detalle upstream va al log del function, no al cliente.
          console.error("[argos-proxy] files_upload_failed:", res.status, JSON.stringify(data?.error));
          return new Response(JSON.stringify({ error: { type: "files_upload_failed", message: "No se pudo subir el archivo." } }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ file_id: data.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        console.error("[argos-proxy] files_upload_exception:", e?.message || String(e));
        return new Response(JSON.stringify({ error: { type: "files_upload_exception", message: "No se pudo subir el archivo." } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { messages, max_tokens, model, system, userId, tier: clientTier, targetUserId, targetProfileId, idempotency_key } = body;
    let requestType: string | undefined = body.requestType;
    const finalMaxTokens = max_tokens || 4000;

    // ─── HARDENING 1.1 (task #23): validar 'dx_generation_first' server-side ───
    // El cliente elige el requestType, y 'dx_generation_first' cuesta 0 H+
    // (regalo del 1er DX, migración 186). Un cliente malicioso/buggy podría
    // mandarlo siempre y saltarse el cobro de 1000 H+. Regla server-side:
    // el regalo solo aplica si el user NUNCA ha generado un functional_dx
    // (append-only → CUALQUIER versión cuenta, misma semántica que el
    // cliente en resolveDxGenerationAction). Si ya hay versiones → se fuerza
    // 'dx_generation' regular para el cobro y el log.
    // Fail-open ante error del query: el circuit breaker per-tier (más abajo,
    // siempre corre antes del LLM) ya acota el abuso, y no queremos cobrarle
    // 1000 H+ a un 1er DX legítimo por un hiccup de DB.
    if (requestType === "dx_generation_first" && userId) {
      try {
        const { count, error: dxErr } = await supabase
          .from("functional_dx")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        if (!dxErr && (count ?? 0) > 0) {
          console.warn("[hardening] dx_generation_first con DX previo → forzado a dx_generation. user:", userId);
          requestType = "dx_generation";
        } else if (dxErr) {
          console.error("[hardening] verify functional_dx falló (fail-open, queda _first):", dxErr);
        }
      } catch (e) {
        console.error("[hardening] verify functional_dx exception (fail-open):", e);
      }
    }

    // ─── Ruteo de modelo (IMPL-01) ───────────────────────────────
    // Se resuelve DESPUÉS del hardening de dx_generation_first, porque ese
    // bloque puede reescribir el requestType y la ruta debe seguir al tipo real.
    const route = resolveRoute(requestType, model);
    // Todo el camino Anthropic de abajo sigue usando finalModel sin cambios.
    // Si la ruta es Google, Anthropic queda como su respaldo cruzado.
    const finalModel = route.provider === "anthropic" ? route.model : PRIMARY_MODEL_DEFAULT;

    // Detectar tier real server-side (task #40 + task #133 boost H+).
    // El clientTier es informativo — el server es la fuente de verdad.
    const effectiveTier = userId ? await detectEffectiveTier(supabase, userId) : (clientTier ?? "free");

    // PREMIUM (16-ago-2026): aquí estaba el gate ECO-8, que reservaba el insight
    // diario a Pro y Clínico. Se fue. Reservar la IA para el plan caro es
    // exactamente lo que este cambio deja de hacer: es el activo más valioso
    // del producto y ahora viene completo con la membresía.

    // Conteo diario. PREMIUM: cuenta, ya no corta. El único caso en que
    // `blocked` puede volver true es el techo antiabuso (2000/día), que ninguna
    // persona real toca y que existe contra llaves filtradas, no contra usuarios.
    const usage = await checkAndIncrementUsage(supabase, userId, requestType);
    if (usage.blocked) {
      const latencyMs = Date.now() - startTime;
      await logArgosCall(supabase, {
        user_id: userId,
        tier: effectiveTier,
        provider: "anthropic",
        model: finalModel,
        request_type: requestType,
        latency_ms: latencyMs,
        success: false,
        error_message: `abuso_sospechado:limite=${usage.limit}`,
        fallback_used: false,
        target_user_id: targetUserId ?? null,
        target_profile_id: targetProfileId ?? null,
      });
      // Se conserva `_rate_limited` en el payload por los binarios viejos que
      // todavía lo leen: sin él, un bundle sin OTA mostraría "problema de red".
      return new Response(JSON.stringify({
        content: [{
          type: "text",
          text: "Detectamos un volumen de uso fuera de lo normal en esta cuenta y pausamos ARGOS por hoy. Si fuiste tú y necesitas seguir, escríbenos y lo destrabamos.",
        }],
        model: finalModel,
        _rate_limited: true,
        _limit: usage.limit,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // PREMIUM (16-ago-2026): aquí se descontaban H+ antes de llamar al LLM y se
    // devolvía un 402 "insufficient_protons" que dejaba la acción sin hacer.
    // Todo ese bloque se fue: ninguna función se paga por transacción.
    //
    // Vale registrar el defecto que se lleva consigo, porque explica por qué
    // no se "arregló" en vez de retirarse: cuando un action_key no tenía fila
    // en proton_action_costs, el proxy le cobraba el precio de 'chat' mientras
    // el cliente lo cotizaba en cero. La app decía "gratis" y el servidor
    // cobraba. Ese desfase no se puede tapar, solo eliminar.
    //
    // Los RPC spend_protons y award_protons NO se tocaron: siguen en la base
    // con el saldo y el historial de todos. Solo dejaron de llamarse.

    // ─── Cerebro ARGOS servido (gated por BRAIN_ENABLED) ─────────────
    // Split estático/dinámico para que el prompt-cache de Anthropic pegue:
    // [ cerebro (cacheado) ][ dinámico: guards+contexto (sin cache) ].
    // Solo se activa si el cliente mandó dynamicSystem (bundle nuevo, turno
    // de chat). Bundles viejos sin OTA y callers no-chat (insight diario,
    // DX, nutrición — system propio que NO empieza con ARGOS_SYSTEM_PROMPT)
    // siguen por la ruta legacy idéntica a hoy; compartirles el bloque
    // cacheado es Fase 2. Rollback: BRAIN_ENABLED=false + redeploy.
    const BRAIN_ON = Deno.env.get("BRAIN_ENABLED") === "true";
    let systemForCall: string | any[] | undefined = system;
    let brainVersion: string | null = null;
    let brainSource: "store" | "embedded" | null = null;
    if (BRAIN_ON && !brainDeniedFor(requestType)
        && typeof body.dynamicSystem === "string" && body.dynamicSystem.length > 0) {
      const brain = await getSharedBrain();
      brainVersion = brain.version;
      brainSource = brain.source;
      systemForCall = [
        // ESTÁTICO → cacheado con TTL de 1 HORA (INGENIERIA_DE_CACHE_ATP, 11-ago-2026):
        // el cerebro son ~26K tokens; escribirlo cuesta 12-20x más que leerlo. Con
        // TTL de 5 min, cada llamada fuera de ráfaga paga escritura completa. Con 1h
        // son ~14 escrituras/día en vez de una por usuario: $364K/año a 1,000 users.
        // La caché es compartida por workspace y el bloque es idéntico para todos.
        { type: "text", text: brain.text, cache_control: { type: "ephemeral", ttl: "1h" } },
        { type: "text", text: body.dynamicSystem },                               // DINÁMICO → sin cache
      ];
    } else if (typeof body.dynamicSystem === "string" && body.dynamicSystem.length > 0 && !system) {
      // Red de seguridad del gate de arriba: un cliente que mande SOLO
      // dynamicSystem (esperando que el proxy le anteponga el cerebro) se
      // quedaría sin system entero si su acción está en la lista de negados.
      // Perder los guards de género y protocolo es un problema de doctrina, no
      // de costo, así que el dinámico se usa tal cual.
      systemForCall = body.dynamicSystem;
    }
    const brainEcho = brainVersion ? { _brain: brainVersion, _brain_source: brainSource } : {};

    // CIERRE-4: solo aplica cuando systemForCall quedó como STRING (ruta
    // legacy). Si es array, los cache_control ya vienen puestos por el bloque
    // del cerebro y esto no lo toca.
    const cacheStringSystem = shouldCacheStringSystem(requestType);

    // Detectar si el request incluye PDFs. Para PDFs grandes evitamos el
    // fallback Gemini porque (a) Gemini no soporta type:"document" tipo Anthropic
    // y (b) consume tiempo del Edge Function (60s cap) que Anthropic puede usar.
    const hasPdfRequest = JSON.stringify(messages).includes('"type":"document"');

    // ─── T2 MAGIA 2.0: STREAMING SSE ─────────────────────────────────
    // Opt-in por body.stream o header X-ATP-Stream (callers legacy intactos).
    // El rate limit ya se contó arriba (al INICIO, coherente con no-stream).
    // Si el POST inicial a Anthropic falla, se cae al flujo no-stream de abajo
    // (Anthropic no-stream → Gemini) y el cliente recibe JSON normal.
    // El streaming es de Anthropic: una ruta a Google no debe entrar aquí o
    // se saltaría el ruteo. Hoy ninguna acción ruteada a Gemini pide stream,
    // pero el gate evita que una futura lo haga por accidente.
    const wantsStream = body.stream === true || req.headers.get("x-atp-stream") === "true";
    if (wantsStream && !hasPdfRequest && route.provider === "anthropic") {
      try {
        const { requestBody, headers } = buildAnthropicHttp({
          model: finalModel, messages, system: systemForCall, max_tokens: finalMaxTokens, stream: true,
          cacheSystem: cacheStringSystem,
        });
        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers, body: JSON.stringify(requestBody),
        });
        if (upstream.ok && upstream.body) {
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          const reader = upstream.body.getReader();
          let sseBuffer = "";
          let inputTokens = 0, outputTokens = 0, cacheRead = 0, cacheWrite = 0;
          const outStream = new ReadableStream({
            async start(controller) {
              const send = (obj: unknown) =>
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
              // Metadata en el primer evento (idempotency key del turno).
              send({ type: "start", model: finalModel, idempotency_key: idempotency_key ?? null, ...brainEcho });
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  sseBuffer += decoder.decode(value, { stream: true });
                  const events = sseBuffer.split("\n\n");
                  sseBuffer = events.pop() ?? "";
                  for (const raw of events) {
                    const dataLine = raw.split("\n").find((l) => l.startsWith("data:"));
                    if (!dataLine) continue;
                    let payload: any;
                    try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
                    if (payload.type === "message_start") {
                      inputTokens = payload.message?.usage?.input_tokens || 0;
                      cacheRead = payload.message?.usage?.cache_read_input_tokens || 0;
                      cacheWrite = payload.message?.usage?.cache_creation_input_tokens || 0;
                    } else if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta" && payload.delta.text) {
                      send({ type: "chunk", text: payload.delta.text });
                    } else if (payload.type === "message_delta") {
                      outputTokens = payload.usage?.output_tokens || outputTokens;
                    } else if (payload.type === "error") {
                      throw new Error(payload.error?.message || "anthropic_stream_error");
                    }
                  }
                }
                send({ type: "done" });
                await logArgosCall(supabase, {
                  user_id: userId, tier: effectiveTier, provider: "anthropic", model: finalModel,
                  request_type: requestType, input_tokens: inputTokens, output_tokens: outputTokens,
                  cache_read_tokens: cacheRead, cache_write_tokens: cacheWrite,
                  latency_ms: Date.now() - startTime, success: true, fallback_used: false,
                  target_user_id: targetUserId ?? null, target_profile_id: targetProfileId ?? null,
                  brain_version: brainVersion,
                });
              } catch (e: any) {
                // Murió a mitad del stream → evento de error + refund H+.
                // El cliente descarta el parcial y reintenta no-stream.
                send({ type: "error", message: e?.message || String(e) });
                await logArgosCall(supabase, {
                  user_id: userId, tier: effectiveTier, provider: "anthropic", model: finalModel,
                  request_type: requestType, input_tokens: inputTokens, output_tokens: outputTokens,
                  latency_ms: Date.now() - startTime, success: false,
                  error_message: `stream_failed:${e?.message || String(e)}`,
                  target_user_id: targetUserId ?? null, target_profile_id: targetProfileId ?? null,
                });
              } finally {
                controller.close();
              }
            },
          });
          return new Response(outStream, {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            },
          });
        }
        console.warn("anthropic stream POST failed:", upstream.status, "→ fallback no-stream");
        try { await upstream.body?.cancel(); } catch (_) { /* noop */ }
      } catch (e) {
        console.warn("anthropic stream setup failed:", e, "→ fallback no-stream");
      }
    }

    // ─── 0) Ruta Gemini primaria (IMPL-01) ───────────────────────────
    // Solo para las acciones de extracción ruteadas a Google. Si Gemini falla,
    // NO devolvemos error: caemos al camino Anthropic de abajo. Ese es el
    // respaldo cruzado — cada proveedor es la red del otro, ninguno es punto
    // único. Los PDFs jamás entran aquí (Gemini devuelve basura en bloques
    // type:"document", ver comentario de la sección de fallback).
    let geminiPrimaryErr: string | null = null;
    if (route.provider === "google" && !hasPdfRequest) {
      try {
        const gem = await callGeminiProvider({
          model: route.model,
          messages,
          system: systemForCall,
          max_tokens: finalMaxTokens,
        });
        if (gem.ok && gem.text) {
          await logArgosCall(supabase, {
            user_id: userId,
            tier: effectiveTier,
            provider: "google",
            model: route.model,
            request_type: requestType,
            input_tokens: gem.input_tokens,
            output_tokens: gem.output_tokens,
            latency_ms: Date.now() - startTime,
            success: true,
            fallback_used: false, // ruteo intencional, no rescate de un error
            target_user_id: targetUserId ?? null,
            target_profile_id: targetProfileId ?? null,
          });
          return new Response(JSON.stringify({
            content: [{ type: "text", text: gem.text }],
            model: route.model,
            _routed: true,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        geminiPrimaryErr = `gemini_status:${gem.status}`;
      } catch (e: any) {
        geminiPrimaryErr = e?.name === "AbortError" ? "gemini_timeout" : (e?.message || String(e));
      }
      console.warn("[router] Gemini primario falló, cae a Anthropic:", geminiPrimaryErr);
    }

    // 1) Anthropic primero
    let anthropicErr: string | null = null;
    try {
      const ant = await callAnthropicProvider({
        model: finalModel,
        messages,
        system: systemForCall,
        max_tokens: finalMaxTokens,
        cacheSystem: cacheStringSystem,
      });
      const latencyMs = Date.now() - startTime;

      if (ant.ok) {
        await logArgosCall(supabase, {
          user_id: userId,
          tier: effectiveTier,
          provider: "anthropic",
          model: finalModel,
          request_type: requestType,
          input_tokens: ant.input_tokens,
          output_tokens: ant.output_tokens,
          cache_read_tokens: ant.cache_read_tokens,
          cache_write_tokens: ant.cache_write_tokens,
          latency_ms: latencyMs,
          success: true,
          // Si veníamos de una ruta Google que falló, esto ES un rescate:
          // queda marcado para poder medir cuántas veces se activa la red.
          fallback_used: geminiPrimaryErr !== null,
          error_message: geminiPrimaryErr ? `gemini_primary_failed:${geminiPrimaryErr}` : undefined,
          target_user_id: targetUserId ?? null,
          target_profile_id: targetProfileId ?? null,
          brain_version: brainVersion,
        });
        return new Response(JSON.stringify({ ...ant.data, ...brainEcho }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      anthropicErr = JSON.stringify(ant.data?.error) || `status ${ant.status}`;
    } catch (e: any) {
      anthropicErr = e?.name === "AbortError" ? "anthropic_timeout" : (e?.message || String(e));
    }

    // Para PDFs: NO usar Gemini fallback. Reportar el timeout/error de Anthropic directo.
    // Gemini no procesa el bloque type:"document" igual y devuelve basura.
    if (hasPdfRequest) {
      const latencyMs = Date.now() - startTime;
      await logArgosCall(supabase, {
        user_id: userId, tier: effectiveTier, provider: "anthropic", model: finalModel,
        request_type: requestType, latency_ms: latencyMs, success: false,
        error_message: `pdf_no_fallback:${anthropicErr}`,
        fallback_used: false,
        target_user_id: targetUserId ?? null,
        target_profile_id: targetProfileId ?? null,
      });
      return new Response(JSON.stringify({
        error: { type: "anthropic_pdf_error", message: anthropicErr || "anthropic_timeout" },
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) Fallback a Gemini (solo para texto/imagen, no para PDFs)
    try {
      const gem = await callGeminiProvider({
        model: FALLBACK_MODEL,
        messages,
        system: systemForCall,
        max_tokens: finalMaxTokens,
      });
      const latencyMs = Date.now() - startTime;

      if (gem.ok && gem.text) {
        await logArgosCall(supabase, {
          user_id: userId,
          tier: effectiveTier,
          provider: "google",
          model: FALLBACK_MODEL,
          request_type: requestType,
          input_tokens: gem.input_tokens,
          output_tokens: gem.output_tokens,
          latency_ms: latencyMs,
          success: true,
          error_message: `anthropic_failed:${anthropicErr}`,
          fallback_used: true,
          target_user_id: targetUserId ?? null,
          target_profile_id: targetProfileId ?? null,
          brain_version: brainVersion,
        });
        return new Response(JSON.stringify({
          content: [{ type: "text", text: gem.text }],
          model: FALLBACK_MODEL,
          _fallback: true,
          ...brainEcho,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Gemini respondió pero sin texto / no-ok → degradado
      const latencyMsDeg = Date.now() - startTime;
      await logArgosCall(supabase, {
        user_id: userId,
        tier: effectiveTier,
        provider: "google",
        model: FALLBACK_MODEL,
        request_type: requestType,
        latency_ms: latencyMsDeg,
        success: false,
        error_message: `both_failed | anthropic:${anthropicErr} | gemini_status:${gem.status}`,
        fallback_used: true,
        target_user_id: targetUserId ?? null,
        target_profile_id: targetProfileId ?? null,
      });
    } catch (e: any) {
      const latencyMs = Date.now() - startTime;
      const gemErr = e?.name === "AbortError" ? "gemini_timeout" : (e?.message || String(e));
      await logArgosCall(supabase, {
        user_id: userId,
        tier: effectiveTier,
        provider: "google",
        model: FALLBACK_MODEL,
        request_type: requestType,
        latency_ms: latencyMs,
        success: false,
        error_message: `both_failed | anthropic:${anthropicErr} | gemini:${gemErr}`,
        fallback_used: true,
        target_user_id: targetUserId ?? null,
        target_profile_id: targetProfileId ?? null,
      });
    }

    // 3) Respuesta degradada (status 200 — el cliente lee _degraded)
    return new Response(JSON.stringify({
      content: [{
        type: "text",
        text: "ARGOS no está disponible en este momento. Intenta de nuevo en un par de minutos.",
      }],
      model: finalModel,
      _degraded: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    await logArgosCall(supabase, {
      user_id: body.userId,
      tier: body.tier,
      provider: "anthropic",
      model: body.model || "unknown",
      request_type: body.requestType,
      latency_ms: latencyMs,
      success: false,
      error_message: error?.message || String(error),
      target_user_id: body.targetUserId ?? null,
      target_profile_id: body.targetProfileId ?? null,
    });
    // MB-SEC-1 §6: el detalle ya quedó en logArgosCall (error_message). Al
    // cliente, mensaje genérico — nada de rutas/tablas/stack.
    return new Response(JSON.stringify({ error: "Error interno del servicio." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
