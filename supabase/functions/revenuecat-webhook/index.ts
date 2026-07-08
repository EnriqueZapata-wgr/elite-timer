/**
 * revenuecat-webhook — recibe eventos de RevenueCat, audita en subscription_events
 * y sincroniza profiles.tier + tier_expires_at.
 *
 * Task #40. Setup en RevenueCat:
 *   Dashboard → Integrations → Webhooks → + New webhook
 *   URL: https://itqkfozqvpwikogggqng.supabase.co/functions/v1/revenuecat-webhook
 *   Authorization header: Bearer REVENUECAT_WEBHOOK_SECRET (env var)
 *
 * Docs eventos: https://www.revenuecat.com/docs/webhooks
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapea entitlement identifier → tier de ATP.
// Prioridad: clinician > pro > base > free.
function tierFromEntitlements(entitlementIds: string[]): "free" | "base" | "pro" | "clinician" {
  if (entitlementIds.includes("atp_clinician")) return "clinician";
  if (entitlementIds.includes("atp_pro")) return "pro";
  if (entitlementIds.includes("atp_base")) return "base";
  return "free";
}

// Eventos donde el user pierde acceso → tier a 'free' (o downgrade).
const CANCELLATION_TYPES = new Set([
  "CANCELLATION",
  "EXPIRATION",
  "SUBSCRIPTION_PAUSED",
  "BILLING_ISSUE",
]);

// Eventos donde el user gana o mantiene acceso.
const ACTIVATION_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "PRODUCT_CHANGE",
  "TRANSFER",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Verificar auth header — RevenueCat webhook secret
  const authHeader = req.headers.get("authorization") ?? "";
  const expectedSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!expectedSecret) {
    console.error("REVENUECAT_WEBHOOK_SECRET no configurado");
    return new Response(JSON.stringify({ error: "webhook_secret_missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const expectedHeader = `Bearer ${expectedSecret}`;
  if (authHeader !== expectedHeader) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const event = body?.event;
    if (!event) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      type: eventType,
      app_user_id: userId,
      product_id: productId,
      entitlement_ids: entitlementIds = [],
      original_transaction_id: originalTransactionId,
      purchased_at_ms: purchasedAtMs,
      expiration_at_ms: expirationAtMs,
      environment,
      store,
      price,
      currency,
      is_trial_conversion: isTrialConversion,
    } = event;

    if (!userId) {
      return new Response(JSON.stringify({ error: "missing_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TEST events skip para no llenar la tabla con testing
    if (environment === "SANDBOX" && eventType === "TEST") {
      return new Response(JSON.stringify({ ok: true, note: "test_event_skipped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Insertar en subscription_events (audit trail)
    const tier = tierFromEntitlements(entitlementIds);
    const entitlementId = entitlementIds[0] || null;
    const expirationAt = expirationAtMs ? new Date(expirationAtMs).toISOString() : null;

    const { error: insertErr } = await supabase.from("subscription_events").insert({
      user_id: userId,
      event_type: eventType,
      product_id: productId ?? "unknown",
      entitlement_id: entitlementId,
      tier,
      original_transaction_id: originalTransactionId,
      price_usd: price ?? null,
      currency: currency ?? null,
      event_timestamp_ms: purchasedAtMs ?? Date.now(),
      expiration_at: expirationAt,
      is_trial_conversion: isTrialConversion ?? false,
      store,
      raw_payload: event,
    });
    if (insertErr) {
      console.error("Error insertando subscription_event:", insertErr);
      // No fallar el webhook aún — sigue con el update de tier
    }

    // 2) Actualizar profiles.tier + tier_expires_at según el evento
    let newTier: "free" | "base" | "pro" | "clinician" = tier;
    let newExpiresAt: string | null = expirationAt;

    if (CANCELLATION_TYPES.has(eventType)) {
      // Si el evento es de cancelación/expiración, el user vuelve a free
      // (a menos que tenga otro entitlement activo — RevenueCat manda todos los activos en entitlement_ids)
      newTier = tierFromEntitlements(entitlementIds);
      // Si tras el evento sigue con entitlement (ej. downgrade pero sigue con base) → tier calculado; sino free
      if (newTier === "free") {
        newExpiresAt = null;
      }
    } else if (ACTIVATION_TYPES.has(eventType)) {
      newTier = tier;
      newExpiresAt = expirationAt;
    }

    const { error: updateErr } = await supabase.from("profiles").update({
      tier: newTier,
      tier_expires_at: newExpiresAt,
      revenuecat_customer_id: userId, // mismo user_id que app_user_id
    }).eq("id", userId);
    if (updateErr) {
      console.error("Error actualizando profiles.tier:", updateErr);
    }

    return new Response(JSON.stringify({
      ok: true,
      user_id: userId,
      new_tier: newTier,
      expires_at: newExpiresAt,
      event_type: eventType,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
