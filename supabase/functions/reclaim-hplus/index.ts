/**
 * reclaim-hplus — reclamo de recargas H+ perdidas (MB-13 · Pieza 6.4).
 *
 * Restaurar compras cubre suscripciones, pero un CONSUMIBLE perdido entre
 * el cobro y el webhook no vuelve solo: esta función consulta a RevenueCat
 * (API secreta, server-side) las compras no-suscripción del usuario y
 * acredita vía credit_hplus_purchase lo que el ledger no tenga.
 *
 * Anti-minteo: el cliente NO manda transaction ids; la fuente de verdad es
 * la respuesta de RevenueCat. La acreditación es idempotente por
 * transaction_id, así que reclamar dos veces no duplica H+.
 *
 * Setup: supabase secrets set REVENUECAT_API_KEY=sk_...  (secret API key v1)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Identidad real del solicitante: su JWT, validado contra Auth.
  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
  const userId = userData?.user?.id;
  if (userErr || !userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const rcApiKey = Deno.env.get("REVENUECAT_API_KEY");
  if (!rcApiKey) {
    console.error("REVENUECAT_API_KEY no configurada");
    return new Response(JSON.stringify({ error: "not_configured" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  try {
    // app_user_id = user.id de Supabase (RevenueCatSync hace el logIn).
    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${rcApiKey}` } },
    );
    if (!rcRes.ok) {
      console.error("RevenueCat API error:", rcRes.status);
      return new Response(JSON.stringify({ error: "revenuecat_unavailable" }), {
        status: 502,
        headers: jsonHeaders,
      });
    }
    const body = await rcRes.json();
    const nonSubs = (body?.subscriber?.non_subscriptions ?? {}) as Record<
      string,
      Array<{ id?: string; store_transaction_id?: string; purchase_date?: string }>
    >;

    let checked = 0;
    let credited = 0;
    let protons = 0;

    for (const [productId, purchases] of Object.entries(nonSubs)) {
      for (const purchase of purchases ?? []) {
        const transactionId = purchase.store_transaction_id ?? purchase.id;
        if (!transactionId) continue;
        checked++;
        const { data: result, error } = await supabase.rpc("credit_hplus_purchase", {
          p_user_id: userId,
          p_product_id: productId,
          p_transaction_id: String(transactionId),
          p_metadata: { via: "reclaim", purchase_date: purchase.purchase_date ?? null },
        });
        if (error) {
          console.error("credit_hplus_purchase error:", error.message);
          continue;
        }
        // unknown_product = producto no-H+ (otro consumible futuro): se ignora.
        // duplicate_transaction = ya acreditado: exactamente lo esperado aquí.
        if (result?.credited === true) {
          credited++;
          protons += Number(result?.protons ?? 0);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, checked, credited, protons }), {
      headers: jsonHeaders,
    });
  } catch (err) {
    console.error("reclaim-hplus error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
