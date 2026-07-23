// mente-audio-url — Edge Function: entrega de audio del pilar Mente con gate de tier.
//
// El bucket 'mente-audio' es PRIVADO a propósito: el gate Base vs Pro se hace
// aquí, firmando URLs de corta duración con service_role. El metadata de la
// pieza es visible para cualquier autenticado (RLS de audio_pieces) — lo que
// se protege es el ARCHIVO.
//
// Reglas:
//  - Valida sesión (JWT del usuario). Sin sesión → 401.
//  - Lee la pieza por slug (solo publicadas). No existe → 404.
//  - tier='pro' y el usuario NO es Pro efectivo → 403 (la UI muestra upsell).
//    Tier efectivo server-side = profiles.tier (degradado si tier_expires_at
//    venció) elevado a 'pro' por Boost H+ activo (pro_boosts) — espejo de
//    src/services/subscription/tier-logic.ts. NO hay precio ni cobro aquí.
//  - OK → signed URL del .m4a, TTL 1h.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_TTL_SECONDS = 3600;
const BUCKET = "mente-audio";

const TIER_RANK: Record<string, number> = { free: 0, base: 1, pro: 2, clinician: 3 };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** profiles.tier degradado a free si tier_expires_at ya pasó (espejo tier-logic). */
function tierFromProfile(tier: string | null, tierExpiresAt: string | null, now: Date): string {
  const t = tier && tier in TIER_RANK ? tier : "free";
  if (t !== "free" && tierExpiresAt && new Date(tierExpiresAt).getTime() <= now.getTime()) {
    return "free";
  }
  return t;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // 1. Auth — userId del JWT del usuario.
  const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authErr } = await authClient.auth.getUser();
  const userId = userData?.user?.id;
  if (authErr || !userId) return json({ error: { type: "unauthorized" } }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => null);
    const slug = body?.slug;
    if (typeof slug !== "string" || !slug.trim()) {
      return json({ error: { type: "invalid_payload", message: "slug requerido" } }, 400);
    }

    // 2. Pieza publicada.
    const { data: piece, error: pieceErr } = await admin
      .from("audio_pieces")
      .select("slug, tier, storage_path, publicado")
      .eq("slug", slug.trim())
      .eq("publicado", true)
      .maybeSingle();
    if (pieceErr) return json({ error: { type: "db_error" } }, 500);
    if (!piece) return json({ error: { type: "not_found" } }, 404);

    // 3. Gate de tier (solo piezas pro).
    if (piece.tier === "pro") {
      const now = new Date();
      const [{ data: profile }, { data: boost }] = await Promise.all([
        admin.from("profiles").select("tier, tier_expires_at").eq("id", userId).maybeSingle(),
        admin
          .from("pro_boosts")
          .select("expires_at")
          .eq("user_id", userId)
          .gt("expires_at", now.toISOString())
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      let tier = tierFromProfile(profile?.tier ?? null, profile?.tier_expires_at ?? null, now);
      if (boost?.expires_at && TIER_RANK[tier] < TIER_RANK.pro) tier = "pro";
      if (TIER_RANK[tier] < TIER_RANK.pro) {
        return json({ error: { type: "pro_required" } }, 403);
      }
    }

    // 4. Signed URL de corta duración.
    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(piece.storage_path, SIGNED_URL_TTL_SECONDS);
    if (signErr || !signed?.signedUrl) {
      return json({ error: { type: "sign_failed" } }, 500);
    }

    return json({ url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS });
  } catch (e) {
    return json({ error: { type: "internal", message: String(e) } }, 500);
  }
});
