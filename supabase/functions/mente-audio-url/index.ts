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

/**
 * PREMIUM (16-ago-2026): una sola membresía. Aquí había un rango de tiers y un
 * 403 "pro_required" que dejaba a un suscriptor de Base sin escuchar piezas que
 * su plan sí incluía en la app pero no en el bucket. Ese desfase entre el gate
 * del cliente y el del servidor es justo el incidente que originó el cambio.
 * Ahora la pregunta es una sola: ¿es miembro? Si pagó, escucha todo.
 */
const VALORES_PAGADOS = new Set(["base", "pro", "clinician", "premium", "founder"]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** ¿profiles.tier vale como membresía vigente? (espejo de tier-logic.ts) */
function esMiembro(tier: string | null, tierExpiresAt: string | null, now: Date): boolean {
  if (!tier || !VALORES_PAGADOS.has(tier.toLowerCase())) return false;
  if (tierExpiresAt && new Date(tierExpiresAt).getTime() <= now.getTime()) return false;
  return true;
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

    // 3. Gate de membresía. Antes: las piezas marcadas "pro" exigían RANGO pro,
    // así que un suscriptor de Base pagaba y aun así recibía 403. Ahora basta
    // con ser miembro, sin importar la etiqueta vieja que traiga su perfil.
    //
    // Lo que NO se hizo a propósito: las piezas que hoy son abiertas siguen
    // abiertas. Este cambio solo AFLOJA el candado; cerrar contenido que ya
    // estaba libre sería quitarle algo a alguien, y eso no toca aquí.
    if (piece.tier === "pro") {
      const now = new Date();
      const { data: profile } = await admin
        .from("profiles")
        .select("tier, tier_expires_at")
        .eq("id", userId)
        .maybeSingle();
      if (!esMiembro(profile?.tier ?? null, profile?.tier_expires_at ?? null, now)) {
        return json({ error: { type: "membresia_requerida" } }, 403);
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
