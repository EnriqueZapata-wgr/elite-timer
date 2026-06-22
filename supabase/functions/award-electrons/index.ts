// award-electrons — Edge Function: award server-side de Electrones por hábito.
//
// El cliente NUNCA acredita moneda (RLS SELECT-only + RPC crédito service_role). Esta función
// valida server-side (auth, schema, tier, cap diario, decay, idempotency) y solo entonces llama
// la RPC `award_electrons` (091/092) con service_role.
//
// NOTA tier vs evidence_tier: el handoff usaba `tier` abstracto ('premium'…) distinto del enum
// de evidencia del cliente ('wearable'|'evidence'|'self'|'elite'). Aquí cada regla declara
// `requiredEvidence` EXPLÍCITO (sin ambigüedad). Ver COWORK_REPORT (flag).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { validateHabit, amountForOccurrence, resolveDayWindow } from "../_shared/award-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 1. Auth — extraer userId del JWT del usuario.
  const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authErr } = await authClient.auth.getUser();
  const userId = userData?.user?.id;
  if (authErr || !userId) return json({ error: { type: "unauthorized" } }, 401);

  // Cliente privilegiado para lecturas de cap + RPC de crédito.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.habit_type !== "string" || typeof body.evidence_tier !== "string" || typeof body.idempotency_key !== "string") {
      return json({ error: { type: "invalid_payload", message: "habit_type, evidence_tier, idempotency_key requeridos" } }, 400);
    }
    const { habit_type, evidence_tier, idempotency_key, metadata } = body;

    // 2. Hábito reconocido + tier de evidencia correcto (lógica pura compartida).
    const v = validateHabit(habit_type, evidence_tier);
    if (!v.ok) return json({ error: { type: v.type, message: v.message } }, v.status);
    const rule = v.rule;

    // 3. Idempotency (para la forma de respuesta; la RPC también lo garantiza atómicamente).
    const balanceNowQ = await admin.from("electron_balance").select("current_electrons, current_rank").eq("user_id", userId).maybeSingle();
    const { data: dup } = await admin.from("electron_transactions").select("id").eq("idempotency_key", idempotency_key).maybeSingle();
    if (dup) {
      return json({ success: true, electrons_awarded: 0, idempotent: true, new_balance: balanceNowQ.data?.current_electrons ?? 0, new_rank: balanceNowQ.data?.current_rank ?? 1 });
    }

    // 4. Cap diario + occurrence index (para decay).
    const win = resolveDayWindow(body.local_date, new Date().toISOString());
    const { count } = await admin
      .from("electron_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("reason", habit_type)
      .gte("created_at", win.start)
      .lt("created_at", win.end);
    const occurrenceIndex = count ?? 0;
    if (occurrenceIndex >= rule.dailyCap) {
      return json({ success: false, reason: "daily_cap_reached", cap: rule.dailyCap, electrons_today: occurrenceIndex });
    }

    // 5. Monto (con decay si aplica).
    const amount = amountForOccurrence(rule, occurrenceIndex);

    // 6. Acreditar vía RPC (service_role). La RPC es atómica + idempotente (092).
    const { error: rpcErr } = await admin.rpc("award_electrons", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: habit_type,
      p_metadata: { ...(metadata ?? {}), tier: rule.requiredEvidence, evidence_tier },
      p_idempotency_key: idempotency_key,
    });
    if (rpcErr) {
      console.error("award_electrons rpc failed:", rpcErr);
      return json({ error: { type: "server_error" } }, 500);
    }

    // 7. Releer balance + log de observabilidad. (El AUDIT real del award es la fila en
    // electron_transactions: user_id, amount, reason=habit_type, metadata, idempotency_key.
    // argos_logs no tiene columna metadata → aquí solo dejamos una traza ligera.)
    const { data: bal } = await admin.from("electron_balance").select("current_electrons, current_rank").eq("user_id", userId).maybeSingle();
    try {
      await admin.from("argos_logs").insert({
        user_id: userId, request_type: "electron_award", provider: "internal",
        model: habit_type, tier: evidence_tier, success: true, latency_ms: 0,
      });
    } catch (_) { /* log best-effort, no rompe el award */ }

    return json({ success: true, electrons_awarded: amount, new_balance: bal?.current_electrons ?? amount, new_rank: bal?.current_rank ?? 1 });
  } catch (e) {
    console.error("award-electrons exception:", e);
    return json({ error: { type: "server_error" } }, 500);
  }
});
