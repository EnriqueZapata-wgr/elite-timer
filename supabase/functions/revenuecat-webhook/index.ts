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
// Prioridad: clinician > pro > premium > base.
//
// ATP 3.0 (5-sep-2026): un entitlement desconocido (o una lista vacía) ya NO
// degrada a `free`: devuelve null y el llamador solo registra el evento, sin
// tocar tier_grants ni profiles.tier. Antes, un producto nuevo en RevenueCat
// que no estuviera en esta lista le quitaba la membresía a quien la acababa
// de pagar (y a un Elite le pisaba su nivel). Regla 1: nunca quitarle a un
// miembro algo que ya tenía. `atp_premium` entra como espejo de la membresía
// única; si el identificador real en RevenueCat es otro, se agrega aquí.
type TierRc = "base" | "pro" | "premium" | "clinician";
function tierFromEntitlements(entitlementIds: string[]): TierRc | null {
  if (entitlementIds.includes("atp_clinician")) return "clinician";
  if (entitlementIds.includes("atp_pro")) return "pro";
  if (entitlementIds.includes("atp_premium")) return "premium";
  if (entitlementIds.includes("atp_base")) return "base";
  return null;
}

// ATP 3.0: rango de los niveles para el camino que escribe profiles.tier
// directo. Elite entra siempre por tier_grants (código o manual) y el webhook
// jamás debe pisarlo con el `pro` de la tienda: un Elite que además compra Pro
// sigue siendo Elite. Un tier vencido (tier_expires_at en el pasado) vale 0:
// el árbitro tampoco lo deja ganar (262).
const RANGO_TIER: Record<string, number> = { free: 0, base: 1, pro: 2, premium: 2, clinician: 3, elite: 4 };
function rangoTier(tier: string | null | undefined): number {
  return RANGO_TIER[String(tier ?? "free").toLowerCase()] ?? 0;
}

/**
 * ATP 3.0 (ruta 2.9): plan del evento para tier_grants.metadata. El cliente lo
 * lee para abrir el mapa funcional a los anuales (packageType no sirve porque
 * es de Offerings, no de CustomerInfo). Tres pistas, en este orden: la
 * vigencia (más de 300 días entre compra y expiración es anual), el
 * period_type y el product_id con "annual"/"year". Sin pista: null, no se
 * inventa.
 */
const DIAS_MINIMOS_ANUAL = 300;
function planDelEvento(ev: { product_id?: unknown; period_type?: unknown; purchased_at_ms?: unknown; expiration_at_ms?: unknown }): "anual" | "mensual" | null {
  const compra = typeof ev.purchased_at_ms === "number" ? ev.purchased_at_ms : null;
  const vence = typeof ev.expiration_at_ms === "number" ? ev.expiration_at_ms : null;
  if (compra !== null && vence !== null && vence > compra) {
    return (vence - compra) / 86_400_000 > DIAS_MINIMOS_ANUAL ? "anual" : "mensual";
  }
  const pistas = `${String(ev.period_type ?? "")} ${String(ev.product_id ?? "")}`.toLowerCase();
  if (/annual|year|anual/.test(pistas)) return "anual";
  if (/month|mensual/.test(pistas)) return "mensual";
  return null;
}

/**
 * Escribe profiles.tier + tier_expires_at SOLO si no baja de rango al perfil.
 * Devuelve true si escribió (o si no había que escribir por rango) y false
 * si la escritura falló. revenuecat_customer_id se escribe siempre.
 */
async function escribirTierSinDegradar(
  supabase: any,
  userId: string,
  newTier: string,
  newExpiresAt: string | null,
  contexto: string,
): Promise<boolean> {
  const { data: perfil, error: leerErr } = await supabase
    .from("profiles").select("tier, tier_expires_at").eq("id", userId).maybeSingle();
  if (leerErr) console.error(`[${contexto}] no se pudo leer profiles.tier (se escribe igual):`, leerErr);
  const vigente = perfil?.tier_expires_at
    ? new Date(perfil.tier_expires_at).getTime() > Date.now()
    : true;
  const rangoActual = perfil && vigente ? rangoTier(perfil.tier) : 0;
  if (rangoTier(newTier) < rangoActual) {
    console.warn(`[${contexto}] tier ${newTier} NO se escribe: el perfil ya tiene ${perfil?.tier} (rango mayor). user=${userId}`);
    const { error: rcErr } = await supabase.from("profiles")
      .update({ revenuecat_customer_id: userId }).eq("id", userId);
    if (rcErr) console.error("Error actualizando revenuecat_customer_id:", rcErr);
    return true;
  }
  const { error: updateErr } = await supabase.from("profiles").update({
    tier: newTier,
    tier_expires_at: newExpiresAt,
    revenuecat_customer_id: userId, // mismo user_id que app_user_id
  }).eq("id", userId);
  if (updateErr) {
    console.error("Error actualizando profiles.tier:", updateErr);
    return false;
  }
  return true;
}

/**
 * ATP 3.0 (ruta 2.7, reforma LFPC): aviso de renovación 5 días antes.
 * Cada activación con expiration_at_ms deja una fila en renewal_reminders
 * (ON CONFLICT (user_id, expires_at) DO NOTHING: RevenueCat reintenta); la
 * edge function dispatch-renewal-reminders la manda cuando llega due_at.
 * En cancelación/expiración se borran los pendientes (sent_at nulo) del
 * mismo ref: sin renovación no hay nada que avisar. NON_RENEWING_PURCHASE
 * no renueva, así que no deja aviso. Si due_at ya pasó (sandbox de minutos,
 * eventos rezagados) tampoco: un aviso tardío es ruido, no un aviso.
 * Todo en su propio try/catch: nunca rompe el flujo del tier.
 */
const DIAS_AVISO_RENOVACION = 5;
async function sincronizarRecordatorioRenovacion(
  supabase: any,
  userId: string,
  eventType: string,
  expirationAt: string | null,
  ref: string,
): Promise<void> {
  try {
    if (ACTIVATION_TYPES.has(eventType) && eventType !== "NON_RENEWING_PURCHASE") {
      if (!expirationAt) return;
      const dueMs = new Date(expirationAt).getTime() - DIAS_AVISO_RENOVACION * 86_400_000;
      if (!Number.isFinite(dueMs) || dueMs <= Date.now()) return;
      const { error } = await supabase.from("renewal_reminders").upsert({
        user_id: userId,
        due_at: new Date(dueMs).toISOString(),
        expires_at: expirationAt,
        source: "revenuecat",
        ref,
        channel: "ambos",
      }, { onConflict: "user_id,expires_at", ignoreDuplicates: true });
      if (error) console.error("[renewal_reminders] upsert error:", error);
    } else if (CANCELLATION_TYPES.has(eventType)) {
      const { error } = await supabase.from("renewal_reminders")
        .delete()
        .eq("user_id", userId)
        .eq("source", "revenuecat")
        .eq("ref", ref)
        .is("sent_at", null);
      if (error) console.error("[renewal_reminders] delete error:", error);
    }
  } catch (err) {
    console.error("[renewal_reminders] sincronización falló (flujo intacto):", err);
  }
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

    // ── MB-13 · Pieza 6: packs H+ (consumibles) ──────────────────────────
    // Si el product_id es un pack del catálogo, esto es una RECARGA, no una
    // suscripción: se acredita server-side (credit_hplus_purchase, idempotente
    // por transaction_id porque RevenueCat reintenta) y NO se toca el tier.
    // Sin esta rama, un NON_RENEWING_PURCHASE sin entitlements recalcularía
    // el tier a 'free' y pisaría una suscripción activa.
    if (productId) {
      const { data: pack } = await supabase
        .from("proton_packages")
        .select("sku, protons")
        .or(`store_product_id.eq.${productId},sku.eq.${productId}`)
        .limit(1)
        .maybeSingle();

      if (pack) {
        const transactionId = event.transaction_id ?? originalTransactionId ?? event.id;
        const { data: credit, error: creditErr } = await supabase.rpc("credit_hplus_purchase", {
          p_user_id: userId,
          p_product_id: productId,
          p_transaction_id: String(transactionId),
          p_metadata: { rc_event_id: event.id ?? null, rc_event_type: eventType, store },
        });
        if (creditErr) console.error("credit_hplus_purchase error:", creditErr);

        // Audit trail del consumible (idempotente-por-efecto: la acreditación
        // real ya quedó protegida por transaction_id).
        await supabase.from("subscription_events").insert({
          user_id: userId,
          event_type: eventType,
          product_id: productId,
          entitlement_id: null,
          tier: null,
          original_transaction_id: originalTransactionId,
          price_usd: price ?? null,
          currency: currency ?? null,
          event_timestamp_ms: purchasedAtMs ?? Date.now(),
          expiration_at: null,
          is_trial_conversion: false,
          store,
          raw_payload: event,
        });

        return new Response(JSON.stringify({
          ok: true,
          kind: "hplus_pack",
          credited: credit?.credited ?? false,
          detail: credit?.error ?? null,
          sku: pack.sku,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
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

    // ATP 3.0: entitlement desconocido → el evento ya quedó registrado arriba
    // y aquí termina. No se escribe tier en ningún lado: no degradar a quien
    // pagó vale más que sincronizar un producto que no conocemos.
    if (tier === null) {
      console.warn(`[revenuecat] entitlement desconocido, tier sin tocar. user=${userId} ids=${JSON.stringify(entitlementIds)} product=${productId ?? "?"}`);
      // Revisión 4EP: una cancelación con entitlement desconocido SÍ recorta la
      // vigencia del grant de RevenueCat (va por ref, no por tier), para que el
      // árbitro y el cron no dejen vivo un grant cuya compra ya murió. Lo que
      // no se toca es profiles.tier: eso lo decide el árbitro cuando venza.
      if (CANCELLATION_TYPES.has(eventType)) {
        try {
          const capIsoNull = expirationAt ?? new Date().toISOString();
          await supabase.from("tier_grants")
            .update({ expires_at: capIsoNull })
            .eq("source", "revenuecat")
            .eq("ref", originalTransactionId ?? `rc_${userId}`)
            .is("revoked_at", null);
        } catch (grantErr) {
          console.error("tier_grants recorte (entitlement desconocido) error:", grantErr);
        }
      }
      return new Response(JSON.stringify({
        ok: true,
        user_id: userId,
        note: "entitlement_desconocido_tier_sin_tocar",
        event_type: eventType,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) Actualizar profiles.tier + tier_expires_at según el evento
    let newTier: "free" | TierRc = tier;
    let newExpiresAt: string | null = expirationAt;

    if (CANCELLATION_TYPES.has(eventType)) {
      // Si el evento es de cancelación/expiración, el user vuelve a free
      // (a menos que tenga otro entitlement activo — RevenueCat manda todos los activos en entitlement_ids)
      // ATP 3.0: tier ya no es null aquí (el null regresó arriba), así que
      // `?? "free"` solo satisface al tipo.
      newTier = tierFromEntitlements(entitlementIds) ?? "free";
      // Si tras el evento sigue con entitlement (ej. downgrade pero sigue con base) → tier calculado; sino free
      if (newTier === "free") {
        newExpiresAt = null;
      }
    } else if (ACTIVATION_TYPES.has(eventType)) {
      newTier = tier;
      newExpiresAt = expirationAt;
    }

    // ── MB-13 · Pieza 2: contabilidad en el árbitro (tier_grants) ────────
    // RevenueCat es la precedencia 1 de resolve_effective_tier. El grant se
    // referencia por original_transaction_id; en cancelación se RECORTA su
    // vigencia (no se borra hoy: se respeta lo pagado) y apply_effective_tier
    // decide si queda otro grant (código/web) o cae a free.
    const grantRef = originalTransactionId ?? `rc_${userId}`;
    const plan = planDelEvento(event);
    try {
      if (ACTIVATION_TYPES.has(eventType) && newTier !== "free") {
        const { data: existing } = await supabase
          .from("tier_grants")
          .select("id, metadata")
          .eq("source", "revenuecat")
          .eq("ref", grantRef)
          .is("revoked_at", null)
          .limit(1)
          .maybeSingle();
        if (existing) {
          // ATP 3.0 (ruta 2.9): product_id del evento en metadata, con merge
          // para no perder lo que ya haya (el gate del anual lo lee de aquí).
          const metadataPrevia = existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
          await supabase.from("tier_grants")
            .update({
              tier: newTier,
              expires_at: newExpiresAt,
              metadata: {
                ...metadataPrevia,
                store,
                product_id: productId ?? metadataPrevia.product_id ?? null,
                plan: plan ?? metadataPrevia.plan ?? null,
              },
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("tier_grants").insert({
            user_id: userId,
            source: "revenuecat",
            tier: newTier,
            expires_at: newExpiresAt,
            ref: grantRef,
            metadata: { store, product_id: productId ?? null, plan },
          });
        }
      } else if (CANCELLATION_TYPES.has(eventType)) {
        // La vigencia pagada se conserva: si RevenueCat aún reporta
        // expiración futura, el grant vive hasta ahí; si no, muere hoy.
        const capIso = expirationAt ?? new Date().toISOString();
        await supabase.from("tier_grants")
          .update({ expires_at: capIso })
          .eq("source", "revenuecat")
          .eq("ref", grantRef)
          .is("revoked_at", null);
      }
    } catch (grantErr) {
      console.error("tier_grants bookkeeping error:", grantErr);
    }

    // ATP 3.0 (ruta 2.7): aviso de renovación 5 días antes (LFPC).
    await sincronizarRecordatorioRenovacion(supabase, userId, eventType, expirationAt, grantRef);

    if (CANCELLATION_TYPES.has(eventType) && newTier === "free") {
      // La baja pasa por el árbitro: si el usuario tiene un grant vigente de
      // código o pago web, NO se le tira a free por cancelar en la tienda.
      const { data: applied, error: applyErr } = await supabase.rpc("apply_effective_tier", {
        p_user_id: userId,
        p_reason: `revenuecat_${eventType.toLowerCase()}`,
      });
      if (applyErr) {
        // Fallback pre-migración 240: comportamiento legacy.
        // ATP 3.0: el respaldo nunca escribe un tier de rango menor al vigente.
        console.error("apply_effective_tier error (fallback directo):", applyErr);
        await escribirTierSinDegradar(supabase, userId, newTier, newExpiresAt, "fallback_directo");
      } else {
        newTier = (applied?.tier ?? newTier) as typeof newTier;
        newExpiresAt = (applied?.expires_at as string | null) ?? null;
        await supabase.from("profiles").update({ revenuecat_customer_id: userId }).eq("id", userId);
      }
    } else {
      // ATP 3.0: mismo candado en la escritura directa de activación. Un Elite
      // (grant por código) que compra Pro en la tienda conserva `elite` en el
      // perfil; el grant de RevenueCat ya quedó en tier_grants para el árbitro.
      await escribirTierSinDegradar(supabase, userId, newTier, newExpiresAt, "activacion");
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
