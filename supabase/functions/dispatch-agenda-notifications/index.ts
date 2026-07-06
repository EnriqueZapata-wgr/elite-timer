// dispatch-agenda-notifications — Edge Function (#v13g F6): envía las push de agenda pendientes.
//
// Invocada por pg_cron cada minuto. Busca agenda_event_logs con notify_at <= now() y notified_at
// IS NULL, junta los tokens del usuario, envía a la Expo push API en batches y marca notified_at.
// Usa SERVICE_ROLE (server-side trusted, salta RLS). Sin auth de usuario (cron-only).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date().toISOString();

  // 1) logs con notify pendiente
  const { data: pending, error: pendingErr } = await supabase
    .from("agenda_event_logs")
    .select("id, user_id, event_id, scheduled_at, agenda_events(name, category)")
    .lte("notify_at", now)
    .is("notified_at", null)
    .not("notify_at", "is", null)
    .limit(200);

  if (pendingErr) {
    return new Response(JSON.stringify({ error: pendingErr.message }), { status: 500, headers: corsHeaders });
  }
  if (!pending?.length) return new Response("No pending", { status: 200, headers: corsHeaders });

  // 2) tokens por usuario
  const userIds = [...new Set(pending.map((p: any) => p.user_id))];
  const { data: tokens } = await supabase
    .from("user_notification_tokens")
    .select("user_id, expo_push_token")
    .in("user_id", userIds);

  const tokenMap = new Map<string, string[]>();
  for (const t of (tokens ?? []) as any[]) {
    if (!tokenMap.has(t.user_id)) tokenMap.set(t.user_id, []);
    tokenMap.get(t.user_id)!.push(t.expo_push_token);
  }

  // 3) construir mensajes para la Expo push API
  const messages: any[] = [];
  for (const log of pending as any[]) {
    const userTokens = tokenMap.get(log.user_id) ?? [];
    const event = log.agenda_events;
    for (const token of userTokens) {
      messages.push({
        to: token,
        title: "ATP — Próximo evento",
        body: `${event?.name ?? "Evento"} · en breve`,
        data: { logId: log.id, eventId: log.event_id, category: event?.category },
        sound: "default",
      });
    }
  }

  // 4) enviar en batches de 100
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
    } catch (e) {
      console.error("[dispatch-agenda] expo push send failed", e);
    }
  }

  // 5) inbox in-app (AGENDA-COMPLETE F3): una row en user_notifications por recordatorio
  // procesado, tenga o no push token el user — la campana/lista funcionan sin permiso de push.
  const inboxRows = (pending as any[]).map((log) => ({
    user_id: log.user_id,
    type: "agenda_reminder",
    title: "ATP — Próximo evento",
    body: `${log.agenda_events?.name ?? "Evento"} · en breve`,
    data: { logId: log.id, eventId: log.event_id, category: log.agenda_events?.category, route: "/agenda" },
  }));
  const { error: inboxErr } = await supabase.from("user_notifications").insert(inboxRows);
  if (inboxErr) console.error("[dispatch-agenda] inbox insert failed", inboxErr.message);

  // 6) marcar como notificados (siempre, para no reintentar en loop aunque un token falle)
  const logIds = (pending as any[]).map((p) => p.id);
  await supabase.from("agenda_event_logs").update({ notified_at: now }).in("id", logIds);

  return new Response(`Sent ${messages.length}`, { status: 200, headers: corsHeaders });
});
