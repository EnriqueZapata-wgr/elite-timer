/**
 * payment-webhook — recibe pagos web (Stripe y Conekta) y los convierte en
 * acceso dentro de la app. MB-13 · PIEZA 3.
 *
 * Los cuatro requisitos no negociables:
 *   1. FIRMA verificada. Un webhook sin firma es un endpoint donde
 *      cualquiera se regala Pro.
 *   2. IDEMPOTENTE. Los proveedores reintentan; la compuerta es el índice
 *      único (provider, event_id) de payment_webhook_events.
 *   3. RESPONDE RÁPIDO. Se confirma recepción y el procesamiento corre en
 *      background (EdgeRuntime.waitUntil).
 *   4. PAYLOAD CRUDO guardado siempre, procese o no.
 *
 * El amarre pago ↔ cuenta (donde estos sistemas se rompen):
 *   - Llega el pago → se genera un activation_code de UN uso atado al pago
 *     → se manda por correo al que pagó (Resend; sin RESEND_API_KEY queda
 *     email_status='pending_manual', nunca en silencio).
 *   - Si el correo del checkout coincide con una cuenta, el tier se aplica
 *     directo vía tier_grants + apply_effective_tier. El código se manda
 *     igual, por si tiene otra cuenta.
 *
 * La baja: customer.subscription.deleted respeta la vigencia pagada — el
 * grant se recorta al fin del periodo, no al día de la cancelación. El cron
 * tier-expiry-daily (migración 240) hace la degradación cuando toca.
 *
 * Contrato con el checkout de somosatp.com (Stripe):
 *   - metadata.tier = 'base' | 'pro' | 'clinician' (obligatorio; en modo
 *     subscription vía subscription_data.metadata para que viaje también
 *     en invoices).
 *   - metadata.duration_days opcional (default: 35 en subscription, que la
 *     primera invoice.paid ajusta al periodo real; 30 en pago único).
 *
 * Setup:
 *   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
 *   supabase secrets set CONEKTA_WEBHOOK_SECRET=...   (token compartido)
 *   supabase secrets set RESEND_API_KEY=re_...        (opcional, ver arriba)
 *   Deploy con verify_jwt=false (config.toml) — Stripe no manda JWT.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

declare const EdgeRuntime: { waitUntil?: (p: Promise<unknown>) => void } | undefined;

const jsonHeaders = { "Content-Type": "application/json" };

const VALID_TIERS = new Set(["base", "pro", "clinician"]);
const DEFAULT_SUBSCRIPTION_DAYS = 35; // colchón; invoice.paid ajusta al periodo real
const DEFAULT_ONE_TIME_DAYS = 30;

// ── Utilidades ──────────────────────────────────────────────────────────────

/** Alfabeto legible en voz alta: sin 0/O ni 1/I/L. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `ATP-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verifica la firma de Stripe: header `stripe-signature` con t=timestamp y
 * v1=HMAC-SHA256(`${t}.${payload}`, secret). Tolerancia 5 minutos.
 */
async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) return false;
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k?.trim() === "t") timestamp = v ?? "";
    if (k?.trim() === "v1" && v) signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = toHex(mac);
  return signatures.some((sig) => timingSafeEqual(sig, expected));
}

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return e.includes("@") ? e : null;
}

// ── Email del código (Resend; fail-soft explícito) ──────────────────────────

async function sendCodeEmail(
  email: string,
  code: string,
  tier: string,
): Promise<"sent" | "pending_manual" | "failed"> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return "pending_manual";
  const from = Deno.env.get("PAYMENT_EMAIL_FROM") ?? "ATP <hola@somosatp.com>";
  const tierLabel = tier === "clinician" ? "ATP Clínico" : tier === "pro" ? "ATP Pro" : "ATP Base";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Tu acceso a ${tierLabel}`,
        text: [
          `Gracias por tu compra. Tu plan ${tierLabel} ya está pagado.`,
          "",
          `Tu código de activación: ${code}`,
          "",
          "Para activarlo: abre ATP, entra a Ajustes, toca Suscripción y luego Tengo un código.",
          "Si tu cuenta usa el mismo correo con el que pagaste, tu plan ya quedó activo y el código es un respaldo.",
        ].join("\n"),
      }),
    });
    return res.ok ? "sent" : "failed";
  } catch (_e) {
    return "failed";
  }
}

// ── Núcleo: alta, renovación y baja ─────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createClient>;

async function findUserByEmail(supabase: SupabaseClient, email: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Crea el activation_code de UN uso atado al pago. Reintenta si colisiona. */
async function createPaymentCode(
  supabase: SupabaseClient,
  opts: {
    tier: string;
    durationDays: number | null;
    email: string | null;
    providerRef: string;
    provider: string;
    eventId: string;
  },
): Promise<{ id: string; code: string } | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase
      .from("activation_codes")
      .insert({
        code,
        tier: opts.tier,
        duration_days: opts.durationDays,
        max_uses: 1,
        source: "web_payment",
        issued_to_email: opts.email,
        metadata: {
          provider: opts.provider,
          provider_ref: opts.providerRef,
          event_id: opts.eventId,
        },
      })
      .select("id, code")
      .maybeSingle();
    if (!error && data) return data as { id: string; code: string };
    // Colisión de código único (rarísima): reintenta con otro.
  }
  return null;
}

interface ProcessOutcome {
  status: "processed" | "skipped" | "needs_review" | "error";
  email?: string | null;
  userId?: string | null;
  activationCodeId?: string | null;
  emailStatus?: "sent" | "pending_manual" | "failed" | null;
  error?: string;
}

/** Alta: pago confirmado → código por correo + tier directo si el correo coincide. */
async function handlePaymentSucceeded(
  supabase: SupabaseClient,
  opts: {
    provider: "stripe" | "conekta";
    eventId: string;
    email: string | null;
    tier: string | null;
    durationDays: number | null;
    providerRef: string;
    expiresAtOverride?: string | null;
  },
): Promise<ProcessOutcome> {
  if (!opts.tier || !VALID_TIERS.has(opts.tier)) {
    // Sin tier en metadata no se inventa nada: queda para revisión humana.
    return { status: "needs_review", email: opts.email, error: "missing_or_invalid_tier_metadata" };
  }

  const expiresAt = opts.expiresAtOverride ??
    (opts.durationDays
      ? new Date(Date.now() + opts.durationDays * 86_400_000).toISOString()
      : null);

  // 1) Código de un uso atado al pago, siempre.
  const codeRow = await createPaymentCode(supabase, {
    tier: opts.tier,
    durationDays: opts.durationDays,
    email: opts.email,
    providerRef: opts.providerRef,
    provider: opts.provider,
    eventId: opts.eventId,
  });
  if (!codeRow) {
    return { status: "error", email: opts.email, error: "activation_code_insert_failed" };
  }

  // 2) Si el correo coincide con una cuenta, tier directo vía el árbitro.
  let userId: string | null = null;
  if (opts.email) {
    userId = await findUserByEmail(supabase, opts.email);
    if (userId) {
      const { error: grantErr } = await supabase.from("tier_grants").insert({
        user_id: userId,
        source: "web_payment",
        tier: opts.tier,
        expires_at: expiresAt,
        ref: opts.providerRef,
        metadata: { provider: opts.provider, event_id: opts.eventId },
      });
      if (!grantErr) {
        await supabase.rpc("apply_effective_tier", {
          p_user_id: userId,
          p_reason: `web_payment_${opts.provider}`,
        });
      }
    }
  }

  // 3) El código viaja por correo aunque el tier ya se haya aplicado:
  //    puede tener otra cuenta.
  let emailStatus: ProcessOutcome["emailStatus"] = null;
  if (opts.email) {
    emailStatus = await sendCodeEmail(opts.email, codeRow.code, opts.tier);
  } else {
    emailStatus = "pending_manual";
  }

  return {
    status: "processed",
    email: opts.email,
    userId,
    activationCodeId: codeRow.id,
    emailStatus,
  };
}

/** Renovación: extiende el grant del pago web al nuevo fin de periodo. */
async function handleRenewal(
  supabase: SupabaseClient,
  opts: { providerRef: string; periodEndIso: string | null; tier: string | null },
): Promise<ProcessOutcome> {
  if (!opts.periodEndIso) return { status: "needs_review", error: "missing_period_end" };

  const { data: grants } = await supabase
    .from("tier_grants")
    .select("id, user_id")
    .eq("source", "web_payment")
    .eq("ref", opts.providerRef)
    .is("revoked_at", null);

  if (!grants || grants.length === 0) {
    // Primera invoice sin checkout previo amarrado: nada que extender aún.
    return { status: "needs_review", error: "no_grant_for_subscription" };
  }

  for (const g of grants) {
    const update: Record<string, unknown> = { expires_at: opts.periodEndIso };
    if (opts.tier && VALID_TIERS.has(opts.tier)) update.tier = opts.tier;
    await supabase.from("tier_grants").update(update).eq("id", g.id);
    await supabase.rpc("apply_effective_tier", {
      p_user_id: g.user_id,
      p_reason: "web_payment_renewal",
    });
  }
  return { status: "processed", userId: (grants[0].user_id as string) ?? null };
}

/**
 * La baja. Respeta la vigencia pagada: el grant se recorta al fin del
 * periodo (endedAtIso), no se borra hoy. Cubre también los grants nacidos
 * de canjear el código de este pago.
 */
async function handleCancellation(
  supabase: SupabaseClient,
  opts: { providerRef: string; endedAtIso: string },
): Promise<ProcessOutcome> {
  const affectedUsers = new Set<string>();

  // 1) Grants directos del pago web.
  const { data: direct } = await supabase
    .from("tier_grants")
    .select("id, user_id, expires_at")
    .eq("source", "web_payment")
    .eq("ref", opts.providerRef)
    .is("revoked_at", null);

  for (const g of direct ?? []) {
    const cap = !g.expires_at || (g.expires_at as string) > opts.endedAtIso
      ? opts.endedAtIso
      : (g.expires_at as string);
    await supabase.from("tier_grants").update({ expires_at: cap }).eq("id", g.id);
    affectedUsers.add(g.user_id as string);
  }

  // 2) Códigos emitidos por este pago: el código muere con la suscripción y
  //    los grants de su canje se recortan igual.
  const { data: codes } = await supabase
    .from("activation_codes")
    .select("id, code")
    .eq("source", "web_payment")
    .contains("metadata", { provider_ref: opts.providerRef });

  for (const c of codes ?? []) {
    await supabase.from("activation_codes").update({ expires_at: opts.endedAtIso }).eq("id", c.id);
    const { data: codeGrants } = await supabase
      .from("tier_grants")
      .select("id, user_id, expires_at")
      .eq("source", "activation_code")
      .eq("ref", c.code as string)
      .is("revoked_at", null);
    for (const g of codeGrants ?? []) {
      const cap = !g.expires_at || (g.expires_at as string) > opts.endedAtIso
        ? opts.endedAtIso
        : (g.expires_at as string);
      await supabase.from("tier_grants").update({ expires_at: cap }).eq("id", g.id);
      affectedUsers.add(g.user_id as string);
    }
  }

  for (const userId of affectedUsers) {
    await supabase.rpc("apply_effective_tier", {
      p_user_id: userId,
      p_reason: "web_payment_cancelled",
    });
  }

  return { status: "processed" };
}

// ── Despacho por proveedor ──────────────────────────────────────────────────

async function processStripeEvent(
  supabase: SupabaseClient,
  event: Record<string, unknown>,
): Promise<ProcessOutcome> {
  const type = event.type as string;
  const object = ((event.data as Record<string, unknown> | undefined)?.object ?? {}) as Record<string, unknown>;
  const eventId = event.id as string;

  switch (type) {
    case "checkout.session.completed": {
      if (object.payment_status !== "paid") {
        return { status: "skipped", error: `payment_status=${object.payment_status}` };
      }
      const metadata = (object.metadata ?? {}) as Record<string, unknown>;
      const email = normalizeEmail(
        (object.customer_details as Record<string, unknown> | undefined)?.email ??
          object.customer_email,
      );
      const isSubscription = object.mode === "subscription";
      const durationRaw = Number(metadata.duration_days);
      const durationDays = Number.isFinite(durationRaw) && durationRaw > 0
        ? Math.floor(durationRaw)
        : isSubscription
          ? DEFAULT_SUBSCRIPTION_DAYS
          : DEFAULT_ONE_TIME_DAYS;
      const providerRef = (object.subscription as string | null) ??
        (object.payment_intent as string | null) ?? (object.id as string);
      return handlePaymentSucceeded(supabase, {
        provider: "stripe",
        eventId,
        email,
        tier: typeof metadata.tier === "string" ? metadata.tier : null,
        durationDays,
        providerRef,
      });
    }

    case "invoice.paid": {
      const subscriptionId = (object.subscription as string | null) ?? null;
      if (!subscriptionId) return { status: "skipped", error: "invoice_without_subscription" };
      const lines = ((object.lines as Record<string, unknown> | undefined)?.data ?? []) as Record<string, unknown>[];
      const period = (lines[0]?.period ?? {}) as Record<string, unknown>;
      const periodEnd = typeof period.end === "number"
        ? new Date(period.end * 1000).toISOString()
        : null;
      const subMeta = ((object.subscription_details as Record<string, unknown> | undefined)
        ?.metadata ?? {}) as Record<string, unknown>;
      return handleRenewal(supabase, {
        providerRef: subscriptionId,
        periodEndIso: periodEnd,
        tier: typeof subMeta.tier === "string" ? subMeta.tier : null,
      });
    }

    case "customer.subscription.deleted": {
      const endedAt = typeof object.ended_at === "number"
        ? new Date((object.ended_at as number) * 1000).toISOString()
        : new Date().toISOString();
      return handleCancellation(supabase, {
        providerRef: object.id as string,
        endedAtIso: endedAt,
      });
    }

    case "invoice.payment_failed":
      // Se registra y no se degrada hoy: el grant vence solo al final de la
      // vigencia pagada y el cron hace la baja. Stripe además reintenta.
      return { status: "processed" };

    default:
      return { status: "skipped", error: `unhandled_type_${type}` };
  }
}

async function processConektaEvent(
  supabase: SupabaseClient,
  event: Record<string, unknown>,
): Promise<ProcessOutcome> {
  const type = event.type as string;
  const object = ((event.data as Record<string, unknown> | undefined)?.object ?? {}) as Record<string, unknown>;
  const eventId = (event.id as string) ?? crypto.randomUUID();

  switch (type) {
    case "order.paid": {
      const metadata = (object.metadata ?? {}) as Record<string, unknown>;
      const email = normalizeEmail(
        (object.customer_info as Record<string, unknown> | undefined)?.email,
      );
      const durationRaw = Number(metadata.duration_days);
      return handlePaymentSucceeded(supabase, {
        provider: "conekta",
        eventId,
        email,
        tier: typeof metadata.tier === "string" ? metadata.tier : null,
        durationDays: Number.isFinite(durationRaw) && durationRaw > 0
          ? Math.floor(durationRaw)
          : DEFAULT_ONE_TIME_DAYS,
        providerRef: (object.id as string) ?? eventId,
      });
    }

    case "subscription.canceled":
      return handleCancellation(supabase, {
        providerRef: (object.id as string) ?? eventId,
        endedAtIso: new Date().toISOString(),
      });

    default:
      return { status: "skipped", error: `unhandled_type_${type}` };
  }
}

// ── Handler HTTP ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const rawBody = await req.text();

  // 1) Identificar proveedor y VERIFICAR FIRMA antes de tocar nada.
  let provider: "stripe" | "conekta";
  const stripeSignature = req.headers.get("stripe-signature");
  if (stripeSignature) {
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secret) {
      console.error("STRIPE_WEBHOOK_SECRET no configurado");
      return new Response(JSON.stringify({ error: "webhook_secret_missing" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }
    const valid = await verifyStripeSignature(rawBody, stripeSignature, secret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "invalid_signature" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }
    provider = "stripe";
  } else {
    // Conekta: token compartido en Authorization (se configura en su panel).
    const secret = Deno.env.get("CONEKTA_WEBHOOK_SECRET");
    const auth = req.headers.get("authorization") ?? "";
    if (!secret || !timingSafeEqual(auth, `Bearer ${secret}`)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }
    provider = "conekta";
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const eventId = typeof event.id === "string" ? event.id : null;
  const eventType = typeof event.type === "string" ? event.type : "unknown";
  if (!eventId) {
    return new Response(JSON.stringify({ error: "missing_event_id" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 2) IDEMPOTENCIA: guardar el crudo. Si ya existe, 200 y no hacer nada.
  const { data: inserted, error: insertErr } = await supabase
    .from("payment_webhook_events")
    .upsert(
      { provider, event_id: eventId, event_type: eventType, raw_payload: event },
      { onConflict: "provider,event_id", ignoreDuplicates: true },
    )
    .select("id");

  if (insertErr) {
    console.error("Error guardando evento crudo:", insertErr);
    // 500: que el proveedor reintente. Sin registro no hay procesamiento.
    return new Response(JSON.stringify({ error: "event_store_failed" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
  if (!inserted || inserted.length === 0) {
    return new Response(JSON.stringify({ ok: true, note: "duplicate_event_skipped" }), {
      headers: jsonHeaders,
    });
  }
  const storedId = inserted[0].id as string;

  // 3) RESPONDER RÁPIDO: el procesamiento corre en background.
  const work = (async () => {
    let outcome: ProcessOutcome;
    try {
      outcome = provider === "stripe"
        ? await processStripeEvent(supabase, event)
        : await processConektaEvent(supabase, event);
    } catch (err) {
      outcome = { status: "error", error: String((err as Error)?.message ?? err) };
    }
    await supabase
      .from("payment_webhook_events")
      .update({
        status: outcome.status,
        email: outcome.email ?? null,
        user_id: outcome.userId ?? null,
        activation_code_id: outcome.activationCodeId ?? null,
        email_status: outcome.emailStatus ?? null,
        error: outcome.error ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", storedId);
  })();

  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(work);
  } else {
    await work;
  }

  return new Response(JSON.stringify({ ok: true, received: eventId }), {
    headers: jsonHeaders,
  });
});
