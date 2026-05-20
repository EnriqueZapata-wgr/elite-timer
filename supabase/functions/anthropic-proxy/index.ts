import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pricing en USD por 1M tokens (mayo 2026 — actualizar si cambia)
const PRICING = {
  "claude-sonnet-4-6": { input: 3, output: 15, cache_read: 0.30, cache_write: 3.75 },
  "claude-sonnet-4-20250514": { input: 3, output: 15, cache_read: 0.30, cache_write: 3.75 },
  "gpt-4o-mini": { input: 0.15, output: 0.60, cache_read: 0, cache_write: 0 },
};

function computeCost(model: string, inTok: number, outTok: number, cacheRead = 0, cacheWrite = 0): number {
  const p = PRICING[model as keyof typeof PRICING];
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startTime = Date.now();
  let body: any = {};
  try {
    body = await req.json();
    const { messages, max_tokens, model, system, userId, tier, requestType, targetUserId, targetProfileId } = body;
    const finalModel = model || "claude-sonnet-4-20250514";
    const requestBody: Record<string, unknown> = {
      model: finalModel,
      max_tokens: max_tokens || 4000,
      messages,
    };
    if (system) requestBody.system = system;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    // Log la llamada
    await logArgosCall(supabase, {
      user_id: userId,
      tier: tier,
      provider: "anthropic",
      model: finalModel,
      request_type: requestType,
      input_tokens: data?.usage?.input_tokens || 0,
      output_tokens: data?.usage?.output_tokens || 0,
      cache_read_tokens: data?.usage?.cache_read_input_tokens || 0,
      cache_write_tokens: data?.usage?.cache_creation_input_tokens || 0,
      latency_ms: latencyMs,
      success: response.ok,
      error_message: response.ok ? undefined : JSON.stringify(data?.error),
      target_user_id: targetUserId ?? null,
      target_profile_id: targetProfileId ?? null,
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    await logArgosCall(supabase, {
      user_id: body.userId,
      tier: body.tier,
      provider: "anthropic",
      model: body.model || "unknown",
      request_type: body.requestType,
      latency_ms: latencyMs,
      success: false,
      error_message: error.message,
      target_user_id: body.targetUserId ?? null,
      target_profile_id: body.targetProfileId ?? null,
    });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
