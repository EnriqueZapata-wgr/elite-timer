import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  "claude-sonnet-5": { input: 3, output: 15, cache_read: 0.30, cache_write: 3.75 },
  "claude-sonnet-4-6": { input: 3, output: 15, cache_read: 0.30, cache_write: 3.75 }, // legacy — sigue en tabla para logs históricos
  "claude-sonnet-4-20250514": { input: 3, output: 15, cache_read: 0.30, cache_write: 3.75 }, // legacy
  "gemini-2.5-flash": { input: 0.30, output: 2.50, cache_read: 0, cache_write: 0 },
};

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
    });
  } catch (e) {
    console.error("argos_logs insert failed:", e);
  }
}

// ─── PROVIDERS ──────────────────────────────────────────────────

// 🟡 Anthropic prompt caching ya es GA en mayo 2026 — sin header beta requerido.
// Si Anthropic vuelve a exigir beta, agregar: "anthropic-beta": "prompt-caching-2024-07-31".
async function callAnthropicProvider(args: {
  model: string;
  messages: any[];
  system?: string;
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
  const requestBody: Record<string, unknown> = {
    model: args.model,
    max_tokens: args.max_tokens,
    messages: args.messages,
  };
  if (args.system) {
    // Prompt caching: system como array con cache_control ephemeral
    requestBody.system = [{
      type: "text",
      text: args.system,
      cache_control: { type: "ephemeral" },
    }];
  }

  // Detectar si el request incluye PDFs (type: "document"). Anthropic requiere
  // header beta para procesarlos correctamente. Sin esto, los PDFs timeout o
  // se ignoran silenciosamente (causa raíz de uploads de labs PDF rotos 1+ mes).
  const serialized = JSON.stringify(args.messages);
  const hasPdf = serialized.includes('"type":"document"');
  // Capa 5: si el documento referencia un file_id (Files API), añadir su beta header.
  const hasFileSource = serialized.includes('"file_id"');

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
    "anthropic-version": "2023-06-01",
  };
  // 2026-06-18: PDFs ya son GA en Sonnet 4.x (no requieren beta header).
  // Pasar el header viejo `pdfs-2024-09-25` causa que Anthropic cuelgue el
  // request sin procesar (input_tokens=0, timeout silencioso). Quitamos beta
  // de PDFs. Files API SÍ requiere beta pero por ahora está desactivada
  // (no se manda type:"file" desde el cliente).
  const betas: string[] = [];
  if (hasFileSource) betas.push("files-api-2025-04-14");
  if (betas.length > 0) headers["anthropic-beta"] = betas.join(",");
  void hasPdf; // referenced for backward-compat — header no se manda

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
  system?: string;
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
  if (args.system) openaiMessages.push({ role: "system", content: args.system });
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

async function checkAndIncrementUsage(supabase: any, userId: string | undefined): Promise<{
  blocked: boolean;
  count: number;
}> {
  if (!userId) return { blocked: false, count: 0 };
  try {
    const { data, error } = await supabase.rpc("increment_argos_usage", { p_user_id: userId });
    if (error) {
      console.error("increment_argos_usage error:", error);
      return { blocked: false, count: 0 }; // fail-open: no bloquear si la función falla
    }
    const count = typeof data === "number" ? data : 0;
    return { blocked: count > HARD_CAP_DAILY, count };
  } catch (e) {
    console.error("increment_argos_usage exception:", e);
    return { blocked: false, count: 0 };
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
          return new Response(JSON.stringify({ error: { type: "files_upload_failed", message: JSON.stringify(data?.error) || `status ${res.status}` } }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ file_id: data.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: { type: "files_upload_exception", message: e?.message || String(e) } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { messages, max_tokens, model, system, userId, tier, requestType, targetUserId, targetProfileId, idempotency_key } = body;
    const finalModel = model || PRIMARY_MODEL_DEFAULT;
    const finalMaxTokens = max_tokens || 4000;

    // Circuit breaker (server-side)
    const usage = await checkAndIncrementUsage(supabase, userId);
    if (usage.blocked) {
      const latencyMs = Date.now() - startTime;
      await logArgosCall(supabase, {
        user_id: userId,
        tier,
        provider: "anthropic",
        model: finalModel,
        request_type: requestType,
        latency_ms: latencyMs,
        success: false,
        error_message: "rate_limited",
        fallback_used: false,
        target_user_id: targetUserId ?? null,
        target_profile_id: targetProfileId ?? null,
      });
      return new Response(JSON.stringify({
        content: [{
          type: "text",
          text: `Alcanzaste el límite diario de consultas a ARGOS (${HARD_CAP_DAILY}). Se renueva mañana.`,
        }],
        model: finalModel,
        _rate_limited: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Economía H+: descontar ANTES del LLM (atomicidad). Gated por ECONOMY_ON. ───
    // Sin H+ suficientes → 402, NO llamamos al LLM (el cliente hace pre-flight y guía a la
    // tienda). Si el LLM falla luego, refundEconomy() reembolsa. Costo desde la tabla.
    if (ECONOMY_ON && userId) {
      const { data: costRow } = await supabase
        .from("proton_action_costs").select("cost_h_plus, enabled")
        .eq("action_key", requestType || "chat").maybeSingle();
      economyCost = costRow && costRow.enabled !== false ? Number(costRow.cost_h_plus) : 0;
      if (economyCost > 0) {
        // Idempotencia (094): si el cliente manda idempotency_key, dos requests con la misma key
        // (doble tap / retry / re-render) cobran UNA sola vez — spend_protons v2 es atómico vía
        // UNIQUE index. Bw compat: sin key, cobra como antes (apps viejas) y logueamos el warning
        // para medir la adopción del fix.
        economyIdemKey = typeof idempotency_key === "string" && idempotency_key ? idempotency_key : null;
        if (!economyIdemKey) {
          console.warn("[economy] spend sin idempotency_key (app vieja?) action=", requestType || "chat", "user=", userId);
        }
        const { data: debit } = await supabase.rpc("spend_protons", {
          p_user_id: userId, p_amount: economyCost,
          p_action_key: requestType || "chat",
          p_metadata: economyIdemKey ? { idempotency_key: economyIdemKey } : null,
        });
        if (debit?.idempotent) {
          console.log("[economy] idempotent retry — sin doble cobro", economyIdemKey);
        }
        if (!debit || debit.success !== true) {
          await logArgosCall(supabase, {
            user_id: userId, tier, provider: "anthropic", model: finalModel,
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

    // Detectar si el request incluye PDFs. Para PDFs grandes evitamos el
    // fallback Gemini porque (a) Gemini no soporta type:"document" tipo Anthropic
    // y (b) consume tiempo del Edge Function (60s cap) que Anthropic puede usar.
    const hasPdfRequest = JSON.stringify(messages).includes('"type":"document"');

    // 1) Anthropic primero
    let anthropicErr: string | null = null;
    try {
      const ant = await callAnthropicProvider({
        model: finalModel,
        messages,
        system,
        max_tokens: finalMaxTokens,
      });
      const latencyMs = Date.now() - startTime;

      if (ant.ok) {
        await logArgosCall(supabase, {
          user_id: userId,
          tier,
          provider: "anthropic",
          model: finalModel,
          request_type: requestType,
          input_tokens: ant.input_tokens,
          output_tokens: ant.output_tokens,
          cache_read_tokens: ant.cache_read_tokens,
          cache_write_tokens: ant.cache_write_tokens,
          latency_ms: latencyMs,
          success: true,
          fallback_used: false,
          target_user_id: targetUserId ?? null,
          target_profile_id: targetProfileId ?? null,
        });
        return new Response(JSON.stringify(ant.data), {
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
        user_id: userId, tier, provider: "anthropic", model: finalModel,
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
        system,
        max_tokens: finalMaxTokens,
      });
      const latencyMs = Date.now() - startTime;

      if (gem.ok && gem.text) {
        await logArgosCall(supabase, {
          user_id: userId,
          tier,
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
        });
        return new Response(JSON.stringify({
          content: [{ type: "text", text: gem.text }],
          model: FALLBACK_MODEL,
          _fallback: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Gemini respondió pero sin texto / no-ok → degradado
      const latencyMsDeg = Date.now() - startTime;
      await logArgosCall(supabase, {
        user_id: userId,
        tier,
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
        tier,
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
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
