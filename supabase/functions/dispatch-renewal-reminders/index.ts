// dispatch-renewal-reminders — Edge Function
//
// ATP 3.0 (ruta 2.7, 6-sep-2026): aviso de renovación 5 días antes del
// siguiente cobro, como pide la reforma a la Ley Federal de Protección al
// Consumidor. La cola vive en renewal_reminders (migración 317): la llenan
// revenuecat-webhook (INITIAL_PURCHASE / RENEWAL con expiration_at_ms) y
// payment-webhook (invoice.paid de Stripe con el fin de periodo real).
//
// Qué hace cada corrida (cron renewal-reminders-daily, 14:00 UTC = 08:00 CDMX):
//   1. Toma hasta 200 filas con sent_at IS NULL AND due_at <= now().
//   2. Lee correo y nombre en profiles y tokens en user_notification_tokens.
//   3. Manda el correo con Resend (mismo patrón que payment-webhook: dominio,
//      from y API key de env). El correo es el canal real: hoy hay 2 tokens
//      push en producción.
//   4. Manda push con el helper de Expo de dispatch-agenda-notifications
//      (sendPushBatchWithRetry, con reintentos).
//   5. Escribe una fila en user_notifications (type 'renewal_reminder').
//   6. Marca sent_at si al menos un canal salió. Si ninguno salió (sin
//      RESEND_API_KEY y sin token) la fila se queda pendiente para mañana,
//      salvo que expires_at ya haya pasado: entonces se cierra sin mandar,
//      porque un aviso de renovación después de la renovación es ruido.
//
// Sin palabras rojas en el copy (regla 3 de la casa) y sin em dashes.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { sendPushBatchWithRetry, structuredLog } from "../dispatch-agenda-notifications/hardening.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOTE_MAXIMO = 200;
const DIAS_AVISO = 5;
const RUTA_SUSCRIPCION = "/settings/subscription";
const ASUNTO = `Tu membresía ATP se renueva en ${DIAS_AVISO} días`;

interface RecordatorioRow {
  id: string;
  user_id: string;
  due_at: string;
  expires_at: string;
  source: "revenuecat" | "stripe";
  ref: string | null;
  channel: "email" | "push" | "ambos";
}

/** Fecha larga en español de México, hora de la Ciudad de México. */
function fechaLarga(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch (_e) {
    return iso.slice(0, 10);
  }
}

function comoCancelar(source: RecordatorioRow["source"]): string[] {
  if (source === "stripe") {
    // No existe hoy un enlace de gestión propio para el pago fuera de tienda:
    // se pide respuesta al correo y el equipo lo hace a mano.
    return [
      "Si prefieres no renovar, responde a este correo antes de esa fecha y lo cancelamos por ti, sin preguntas.",
    ];
  }
  return [
    "Si prefieres no renovar, cancela antes de esa fecha desde la cuenta con la que la contrataste:",
    "  En iPhone: Ajustes, tu nombre, Suscripciones.",
    "  En Android: Google Play, tu perfil, Pagos y suscripciones, Suscripciones.",
  ];
}

/** Cuerpo del correo (texto plano). Exportable para revisar el copy a ojo. */
export function cuerpoCorreo(opts: {
  nombre: string | null;
  fechaIso: string;
  source: RecordatorioRow["source"];
}): string {
  const saludo = opts.nombre ? `Hola, ${opts.nombre}.` : "Hola.";
  return [
    saludo,
    "",
    `Tu membresía ATP se renueva automáticamente el ${fechaLarga(opts.fechaIso)}. No tienes que hacer nada para conservarla.`,
    "",
    ...comoCancelar(opts.source),
    "",
    "Si tienes dudas sobre tu cobro, responde a este correo y te contestamos.",
    "",
    "Gracias por seguir en ATP.",
    "Equipo ATP",
    "",
    "Este aviso se envía antes de cada renovación automática, como marca la Ley Federal de Protección al Consumidor.",
  ].join("\n");
}

async function enviarCorreo(email: string, texto: string): Promise<"sent" | "pending_manual" | "failed"> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return "pending_manual";
  const from = Deno.env.get("PAYMENT_EMAIL_FROM") ?? "ATP <hola@somosatp.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject: ASUNTO, text: texto }),
    });
    return res.ok ? "sent" : "failed";
  } catch (_e) {
    return "failed";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const now = new Date();
  const nowIso = now.toISOString();
  const runStartMs = Date.now();

  // 1) Pendientes con due_at vencido (indice parcial de la 317).
  const { data: pendientes, error: pendErr } = await supabase
    .from("renewal_reminders")
    .select("id, user_id, due_at, expires_at, source, ref, channel")
    .is("sent_at", null)
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(LOTE_MAXIMO);

  if (pendErr) {
    structuredLog("error", "renewal_pending_query_failed", { error: pendErr.message });
    return new Response(JSON.stringify({ error: pendErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const filas = (pendientes ?? []) as RecordatorioRow[];
  if (filas.length === 0) {
    structuredLog("info", "renewal_no_pending", { duration_ms: Date.now() - runStartMs });
    return new Response(JSON.stringify({ ok: true, dispatched: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2) Perfiles y tokens de los usuarios del lote.
  const userIds = [...new Set(filas.map((f) => f.user_id))];
  const { data: perfiles, error: perfErr } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);
  if (perfErr) structuredLog("error", "renewal_profiles_query_failed", { error: perfErr.message });
  const perfilPorId = new Map<string, { email: string | null; full_name: string | null }>();
  for (const p of (perfiles ?? []) as { id: string; email: string | null; full_name: string | null }[]) {
    perfilPorId.set(p.id, { email: p.email, full_name: p.full_name });
  }

  const { data: tokens, error: tokErr } = await supabase
    .from("user_notification_tokens")
    .select("user_id, expo_push_token")
    .in("user_id", userIds);
  if (tokErr) structuredLog("error", "renewal_tokens_query_failed", { error: tokErr.message });
  const tokensPorUsuario = new Map<string, string[]>();
  for (const t of (tokens ?? []) as { user_id: string; expo_push_token: string }[]) {
    if (!tokensPorUsuario.has(t.user_id)) tokensPorUsuario.set(t.user_id, []);
    tokensPorUsuario.get(t.user_id)!.push(t.expo_push_token);
  }

  const expoFetch = (body: string) =>
    fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
    });

  // 3) Uno por uno: el lote es chico (200) y cada fila decide su propio sent_at.
  let correosEnviados = 0;
  let correosPendientesManual = 0;
  let correosFallidos = 0;
  let pushEnviados = 0;
  let cerradosVencidos = 0;
  let marcados = 0;
  const inboxRows: Record<string, unknown>[] = [];

  for (const fila of filas) {
    const perfil = perfilPorId.get(fila.user_id) ?? { email: null, full_name: null };
    const nombre = perfil.full_name ? perfil.full_name.trim().split(/\s+/)[0] : null;
    const quiereCorreo = fila.channel !== "push";
    const quierePush = fila.channel !== "email";
    let algoSalio = false;

    // Correo (canal real).
    if (quiereCorreo && perfil.email) {
      const texto = cuerpoCorreo({ nombre, fechaIso: fila.expires_at, source: fila.source });
      const estado = await enviarCorreo(perfil.email, texto);
      if (estado === "sent") { correosEnviados++; algoSalio = true; }
      else if (estado === "pending_manual") correosPendientesManual++;
      else correosFallidos++;
    }

    // Push (si hay token).
    const userTokens = quierePush ? (tokensPorUsuario.get(fila.user_id) ?? []) : [];
    if (userTokens.length > 0) {
      const body = `Se renueva el ${fechaLarga(fila.expires_at)}. Toca para ver o cambiar tu membresía.`;
      const mensajes = userTokens.map((to) => ({
        to,
        title: "ATP · Tu membresía se renueva pronto",
        body,
        data: { route: RUTA_SUSCRIPCION, reminderId: fila.id },
        sound: "default",
      }));
      const result = await sendPushBatchWithRetry(mensajes, expoFetch);
      if (result.ok) { pushEnviados += mensajes.length; algoSalio = true; }
      else {
        structuredLog("error", "renewal_push_failed", {
          user_id: fila.user_id,
          attempts: result.attempts,
          status: result.status,
          network_error: result.networkError,
        });
      }
    }

    const vencido = new Date(fila.expires_at).getTime() <= now.getTime();
    if (!algoSalio && !vencido) {
      // Ni correo ni push: se queda pendiente para la corrida de mañana.
      structuredLog("warn", "renewal_sin_canal", {
        user_id: fila.user_id,
        tiene_email: Boolean(perfil.email),
        tokens: userTokens.length,
      });
      continue;
    }
    if (!algoSalio && vencido) cerradosVencidos++;

    if (algoSalio) {
      inboxRows.push({
        user_id: fila.user_id,
        type: "renewal_reminder",
        title: "Tu membresía ATP se renueva pronto",
        body: `Se renueva automáticamente el ${fechaLarga(fila.expires_at)}. Aquí puedes ver o cambiar tu membresía.`,
        data: { route: RUTA_SUSCRIPCION, reminderId: fila.id, source: fila.source },
      });
    }

    const { error: markErr } = await supabase
      .from("renewal_reminders")
      .update({ sent_at: nowIso })
      .eq("id", fila.id);
    if (markErr) structuredLog("error", "renewal_mark_sent_failed", { id: fila.id, error: markErr.message });
    else marcados++;
  }

  // 4) Inbox in-app, una fila por aviso enviado.
  if (inboxRows.length > 0) {
    const { error: inboxErr } = await supabase.from("user_notifications").insert(inboxRows);
    if (inboxErr) structuredLog("error", "renewal_inbox_insert_failed", { error: inboxErr.message });
  }

  const resumen = {
    pendientes: filas.length,
    correos_enviados: correosEnviados,
    correos_pending_manual: correosPendientesManual,
    correos_fallidos: correosFallidos,
    push_enviados: pushEnviados,
    inbox_rows: inboxRows.length,
    cerrados_vencidos: cerradosVencidos,
    marcados,
    duration_ms: Date.now() - runStartMs,
  };
  structuredLog("info", "renewal_run_summary", resumen);

  return new Response(JSON.stringify({ ok: true, ...resumen }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
