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
const HARD_CAP_DAILY = 50;
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
    // String = legacy: un solo bloque con cache_control ephemeral.
    requestBody.system = Array.isArray(args.system)
      ? args.system
      : [{
        type: "text",
        text: args.system,
        cache_control: { type: "ephemeral" },
      }];
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
}): Promise<{
  ok: boolean;
  data: any;
  status: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}> {
  const { requestBody, headers } = buildAnthropicHttp(args);

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

// Rate limits per tier (task #40 + #133).
// El effectiveTier considera boost H+ activo (Base con boost = Pro por 24h).
const TIER_DAILY_LIMITS: Record<string, number> = {
  free: 5,
  base: 25,
  pro: 150,
  clinician: 100,
};

// Detecta el tier real del user (profiles.tier + boost activo).
// Cache 30s in-memory sencillo — evita golpear DB en cada request.
const tierCache = new Map<string, { effectiveTier: string; expiresAt: number }>();

async function detectEffectiveTier(supabase: any, userId: string): Promise<string> {
  const cached = tierCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.effectiveTier;

  try {
    // 1) ECO-6: MISMO árbitro que el cliente. get_effective_tier (mig 262)
    // resuelve tier_grants + profiles honrando tier_expires_at — el proxy
    // deja de leer profiles.tier crudo (antes un tier vencido seguía siendo
    // pro aquí, y un pro por grant era free).
    let baseTier = "free";
    const { data: resolved, error: tierErr } = await supabase
      .rpc("get_effective_tier", { p_user_id: userId });
    if (!tierErr && resolved && typeof resolved === "object" && typeof resolved.tier === "string") {
      baseTier = resolved.tier;
    } else {
      if (tierErr) console.error("get_effective_tier rpc error (fallback a profiles):", tierErr);
      // Fallback (RPC aún no en el remoto): profiles, pero HONRANDO expiry.
      const { data: profile } = await supabase
        .from("profiles").select("tier, tier_expires_at").eq("id", userId).maybeSingle();
      const expired = profile?.tier_expires_at &&
        new Date(profile.tier_expires_at).getTime() <= Date.now();
      baseTier = expired ? "free" : (profile?.tier ?? "free");
    }

    // 2) Check boost H+ activo (task #133 + MAGIA 2.0 T5)
    // T5: el boost también aplica a tier free — antes solo se consultaba para
    // base, así que un free con boost activo seguía limitado a 5/día (bug real
    // que golpeó a Enrique 2026-07-09). El RPC activate_pro_boost no restringe
    // tier; la doctrina es "ofrece transacción H+, no fuerces upgrade".
    if (baseTier === "base" || baseTier === "free") {
      const { data: boost } = await supabase.rpc("has_active_pro_boost", { p_user_id: userId });
      if (boost === true) {
        tierCache.set(userId, { effectiveTier: "pro", expiresAt: Date.now() + 30000 });
        return "pro";
      }
    }

    tierCache.set(userId, { effectiveTier: baseTier, expiresAt: Date.now() + 30000 });
    return baseTier;
  } catch (e) {
    console.error("detectEffectiveTier error:", e);
    return "free"; // fail-safe
  }
}

async function checkAndIncrementUsage(supabase: any, userId: string | undefined, effectiveTier: string): Promise<{
  blocked: boolean;
  count: number;
  limit: number;
}> {
  const limit = TIER_DAILY_LIMITS[effectiveTier] ?? HARD_CAP_DAILY;
  if (!userId) return { blocked: false, count: 0, limit };
  try {
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

  // ─── Economía H+ (gated). OFF por default (LAB_ECONOMY_ENABLED no seteado) → el proxy se
  // comporta EXACTAMENTE igual que antes. Enrique activa con la env var tras validar. ───
  const ECONOMY_ON = Deno.env.get("LAB_ECONOMY_ENABLED") === "true";
  let economyCost = 0;
  let economyDebited = false;
  let economyIdemKey: string | null = null; // idempotency_key del gasto, para trazar el refund
  async function refundEconomy(uid?: string) {
    if (!economyDebited || !uid || economyCost <= 0) return;
    economyDebited = false; // idempotente: solo reembolsa una vez por instancia de request
    try {
      await supabase.rpc("award_protons", {
        p_user_id: uid, p_amount: economyCost, p_type: "refund",
        p_action_key: null,
        // La key del gasto viaja en metadata (no en la columna idempotency_key) → el refund
        // queda ligado a su cobro sin chocar con el UNIQUE index del gasto. La atomicidad del
        // refund la garantiza el flag economyDebited (un solo refund por request).
        p_metadata: { reason: "llm_failed", idempotency_key: economyIdemKey },
      });
    } catch (e) { console.error("economy refund failed:", e); }
  }

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

    // ─── ECO-8: insight SOLO Pro/Clínico o boost activo (decisión 5b 12-ago-2026).
    // Sin cobro, sin contar contra el límite diario, sin LLM. El cliente nuevo ni
    // dispara la llamada (canReceiveArgosInsights); esto ataja bundles viejos.
    // effectiveTier ya es 'pro' para boosteados (detectEffectiveTier). ───
    if (requestType === "insight" && effectiveTier !== "pro" && effectiveTier !== "clinician") {
      // Audit: NO es un error (el gate funcionó como se diseñó) — success:false
      // ensuciaba la tasa de errores. Se distingue por request_type propio:
      // SELECT count(*) FROM argos_logs WHERE request_type='insight_gated'.
      await logArgosCall(supabase, {
        user_id: userId,
        tier: effectiveTier,
        provider: "anthropic",
        model: finalModel,
        request_type: "insight_gated",
        latency_ms: Date.now() - startTime,
        success: true,
        target_user_id: targetUserId ?? null,
        target_profile_id: targetProfileId ?? null,
      });
      return new Response(JSON.stringify({
        content: [{
          type: "text",
          text: "Los insights diarios de ARGOS son parte de ATP Pro. Activa Pro o enciende un Boost con tus H+ para recibir el tuyo.",
        }],
        model: finalModel,
        _insight_gated: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Circuit breaker per tier (server-side)
    const usage = await checkAndIncrementUsage(supabase, userId, effectiveTier);
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
        error_message: `rate_limited:tier=${effectiveTier}:limit=${usage.limit}`,
        fallback_used: false,
        target_user_id: targetUserId ?? null,
        target_profile_id: targetProfileId ?? null,
      });
      // MAGIA 2.0 T5: payload enriquecido para el RateLimitCard del cliente.
      // Se mantiene `content` + `_rate_limited` para bundles viejos (el campo
      // top-level `error` NO se usa aquí — callAnthropic legacy lanza al verlo
      // y degradaría el mensaje en apps sin OTA).
      // COPY tentativo — revisar con Enrique post-sprint.
      // ECO-1: el boost NO es "sin límite" — sube el tope al de Pro (150/día).
      const canBoost = effectiveTier === "free" || effectiveTier === "base";
      const upgradeMsg = canBoost
        ? `Llegaste al máximo de hoy (${usage.limit}/${usage.limit}). Activa Boost Pro por 500 H+ y sube tu límite a 150 al día por 24h. O espera hasta mañana.`
        : `Alcanzaste el límite (${usage.limit}/día). Se renueva mañana.`;
      const resetsAt = new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString();
      return new Response(JSON.stringify({
        content: [{ type: "text", text: upgradeMsg }],
        model: finalModel,
        _rate_limited: true,
        _tier: effectiveTier,
        _limit: usage.limit,
        rate_limit: {
          tier: effectiveTier,
          limit_daily: usage.limit,
          used_today: Math.min(usage.count, usage.limit),
          resets_at: resetsAt,
          boost_option: canBoost ? { cost_h_plus: 500, duration_hours: 24 } : null,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Economía H+: descontar ANTES del LLM (atomicidad). Gated por ECONOMY_ON. ───
    // Sin H+ suficientes → 402, NO llamamos al LLM (el cliente hace pre-flight y guía a la
    // tienda). Si el LLM falla luego, refundEconomy() reembolsa. Costo desde la tabla.
    if (ECONOMY_ON && userId) {
      const actionKey = requestType || "chat";
      let { data: costRow } = await supabase
        .from("proton_action_costs").select("cost_h_plus, enabled")
        .eq("action_key", actionKey).maybeSingle();
      // Auditoría MB-4 (H1 parcial): un action_key DESCONOCIDO ya no cuesta 0 —
      // cae al costo de 'chat' en vez de regalar el LLM a un requestType inventado.
      // Pendiente como hardening aparte del proxy (NO de este batch): whitelist
      // completa de action_keys + verificar userId contra el JWT (hoy viene del
      // body sin verificar) + requestType client-declarado (un cliente modificado
      // puede mandar 'chat' en un turno de voz para evadir la prima de voice_turn).
      if (!costRow && actionKey !== "chat") {
        const { data: chatRow } = await supabase
          .from("proton_action_costs").select("cost_h_plus, enabled")
          .eq("action_key", "chat").maybeSingle();
        costRow = chatRow;
      }
      economyCost = costRow && costRow.enabled !== false ? Number(costRow.cost_h_plus) : 0;
      // B.4 (megabuzón 2da pasada, spec Enrique): intervention_rationale es
      // GRATIS para tier Pro efectivo (all-you-can-eat) — Base/free pagan el
      // costo de la tabla (280 H+, seed 175). Server-side: el tier lo resuelve
      // detectEffectiveTier (incluye boost H+ activo), no el cliente.
      if (requestType === "intervention_rationale" && effectiveTier === "pro") {
        economyCost = 0;
      }
      if (economyCost > 0) {
        // Idempotencia (094 + M1 re-auditoría MB-4): la key se deriva SERVER-SIDE
        // y la del body se IGNORA — una key client-declarada permitía replay
        // infinito (misma key → idempotent:true → Claude gratis; el índice de
        // proton_transactions es global y sin caducidad). userId + acción +
        // hash(messages) + ventana de 10 min: el doble tap / retry / re-render
        // manda los MISMOS messages → un solo cobro; el mismo payload fuera de
        // la ventana SÍ cobra. Se hashea SOLO messages (no system: el retry
        // stream→no-stream lo reconstruye con contexto volátil — hora del día,
        // stats — y rompería la idempotencia del retry legítimo).
        // (body.idempotency_key se sigue ecoando en el evento SSE "start" por
        // compat de UI, pero ya no es autoridad de cobro.)
        const idemBucket = Math.floor(Date.now() / 600_000);
        const idemDigest = new Uint8Array(await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(`${idemBucket}|${requestType || "chat"}|${JSON.stringify(messages)}`),
        ));
        economyIdemKey = `${userId}:${requestType || "chat"}:` +
          Array.from(idemDigest, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
        const { data: debit } = await supabase.rpc("spend_protons", {
          p_user_id: userId, p_amount: economyCost,
          p_action_key: requestType || "chat",
          p_metadata: { idempotency_key: economyIdemKey },
        });
        if (debit?.idempotent) {
          console.log("[economy] idempotent retry — sin doble cobro", economyIdemKey);
        }
        if (!debit || debit.success !== true) {
          await logArgosCall(supabase, {
            user_id: userId, tier: effectiveTier, provider: "anthropic", model: finalModel,
            request_type: requestType, latency_ms: Date.now() - startTime, success: false,
            error_message: "insufficient_protons",
            target_user_id: targetUserId ?? null, target_profile_id: targetProfileId ?? null,
          });
          return new Response(JSON.stringify({
            error: { type: "insufficient_protons", message: "No tienes suficientes H+ para esta acción" },
            h_plus_required: economyCost,
            h_plus_current: debit?.new_balance ?? 0,
          }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Solo este request "es dueño" del cobro si REALMENTE debitó. En un retry idempotente
        // el cobro pertenece al request original → NO marcamos economyDebited aquí, así este
        // request no dispara un refund que acreditaría el cobro legítimo del otro.
        economyDebited = !debit.idempotent;
      }
    }

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
    if (BRAIN_ON && typeof body.dynamicSystem === "string" && body.dynamicSystem.length > 0) {
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
    }
    const brainEcho = brainVersion ? { _brain: brainVersion, _brain_source: brainSource } : {};

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
                await refundEconomy(userId);
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
      await refundEconomy(userId); // LLM falló → devolver H+
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
    await refundEconomy(userId); // ambos proveedores fallaron → devolver H+
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
    await refundEconomy(body.userId); // excepción → devolver H+ si se debitó
    // MB-SEC-1 §6: el detalle ya quedó en logArgosCall (error_message). Al
    // cliente, mensaje genérico — nada de rutas/tablas/stack.
    return new Response(JSON.stringify({ error: "Error interno del servicio." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
