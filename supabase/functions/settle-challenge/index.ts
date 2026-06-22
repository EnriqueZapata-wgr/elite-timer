// settle-challenge — Edge Function: liquida un reto. RE-VALIDA el criterio server-side
// (no confía en el cliente) y llama la RPC settle_challenge (091, service_role) que actualiza
// status + acredita prize_protons. Idempotente (la RPC no re-paga si ya está settled).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { isCompleted } from "../_shared/challenge-criteria.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  // Auth: el caller debe estar autenticado.
  const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: u } = await authClient.auth.getUser();
  const callerId = u?.user?.id;
  if (!callerId) return json({ error: { type: "unauthorized" } }, 401);

  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json().catch(() => null);
    const participantId = body?.participant_id;
    if (typeof participantId !== "string") {
      return json({ error: { type: "invalid_payload", message: "participant_id requerido" } }, 400);
    }

    // Leer participante + criterio (service_role).
    const { data: part } = await admin
      .from("challenge_participants")
      .select("id, user_id, challenge_id, status, progress, prize_awarded, challenges(criteria)")
      .eq("id", participantId)
      .maybeSingle();
    if (!part) return json({ error: { type: "not_found" } }, 404);

    // Seguridad: el caller solo puede liquidar SU propia participación.
    if ((part as any).user_id !== callerId) return json({ error: { type: "forbidden" } }, 403);

    if ((part as any).prize_awarded) {
      return json({ success: true, already_settled: true });
    }

    // RE-VALIDAR criterio server-side (no confiar en cliente).
    const criteria = (part as any).challenges?.criteria ?? null;
    const won = !!criteria && isCompleted(criteria, (part as any).progress);

    const { data: result, error: rpcErr } = await admin.rpc("settle_challenge", {
      p_user_id: (part as any).user_id,
      p_challenge_id: (part as any).challenge_id,
      p_won: won,
    });
    if (rpcErr) {
      console.error("settle_challenge rpc failed:", rpcErr);
      return json({ error: { type: "server_error" } }, 500);
    }
    return json({ success: true, ...(result ?? {}) });
  } catch (e) {
    console.error("settle-challenge exception:", e);
    return json({ error: { type: "server_error" } }, 500);
  }
});
