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

  const allUserIds = [...new Set(pending.map((p: any) => p.user_id))];

  // 1.5) #61 enforcement: user_notification_prefs (migración 157). Sin fila =
  // defaults (todo ON, sin quiet hours). Un log suprimido igual se marca
  // notified_at (paso 6) — es supresión intencional, no retry.
  // Quiet hours se evalúan en America/Mexico_City (mercado actual; no hay
  // columna de timezone por usuario todavía — TODO cuando exista).
  const { data: prefsRows } = await supabase
    .from("user_notification_prefs")
    .select("user_id, mode, agenda_enabled, quiet_hours_start, quiet_hours_end")
    .in("user_id", allUserIds);

  const mxMinutes = (() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
    const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    return h * 60 + m;
  })();

  const timeToMin = (t: string | null): number | null => {
    if (!t) return null;
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };

  const allowsAgenda = (userId: string): boolean => {
    const p = (prefsRows ?? []).find((r: any) => r.user_id === userId);
    if (!p) return true; // defaults
    if (p.mode === "silent") return false;
    if (p.agenda_enabled === false) return false;
    const start = timeToMin(p.quiet_hours_start);
    const end = timeToMin(p.quiet_hours_end);
    if (start != null && end != null && start !== end) {
      const inQuiet = start < end
        ? mxMinutes >= start && mxMinutes < end
        : mxMinutes >= start || mxMinutes < end;
      if (inQuiet) return false;
    }
    return true;
  };

  const allowed = (pending as any[]).filter((log) => allowsAgenda(log.user_id));
  const suppressedCount = pending.length - allowed.length;

  // 2) tokens por usuario (solo los permitidos)
  const userIds = [...new Set(allowed.map((p: any) => p.user_id))];
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
  for (const log of allowed) {
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
  // permitido, tenga o no push token el user — la campana/lista funcionan sin permiso de push.
  // #61: los suprimidos por prefs tampoco entran al inbox (apagar agenda = apagarla de verdad).
  const inboxRows = allowed.map((log) => ({
    user_id: log.user_id,
    type: "agenda_reminder",
    title: "ATP — Próximo evento",
    body: `${log.agenda_events?.name ?? "Evento"} · en breve`,
    data: { logId: log.id, eventId: log.event_id, category: log.agenda_events?.category, route: "/agenda" },
  }));
  if (inboxRows.length > 0) {
    const { error: inboxErr } = await supabase.from("user_notifications").insert(inboxRows);
    if (inboxErr) console.error("[dispatch-agenda] inbox insert failed", inboxErr.message);
  }

  // 6) marcar como notificados (TODOS los pendientes, incluidos los suprimidos
  // por prefs — supresión intencional, no debe reintentar en loop)
  const logIds = (pending as any[]).map((p) => p.id);
  await supabase.from("agenda_event_logs").update({ notified_at: now }).in("id", logIds);

  return new Response(`Sent ${messages.length} · suppressed ${suppressedCount}`, { status: 200, headers: corsHeaders });
});
