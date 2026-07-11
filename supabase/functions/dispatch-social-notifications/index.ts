// dispatch-social-notifications — Edge Function (Comunidad V1.1 §2.1)
//
// Patrón espejo de dispatch-agenda-notifications (cron cada minuto):
//   1. Lee social_notifications con notified_at NULL (FIFO, límite 200)
//   2. Enforcement de user_notification_prefs (mode 'silent' + quiet hours;
//      no hay flag social dedicado aún — deuda documentada)
//   3. Anti-bulk básico: agrupa por user — 1 push por user por run.
//      1 notif  → copy individual ("{display} te envió una solicitud…")
//      2+ notifs → consolidada ("Tienes N novedades de amigos")
//   4. Push vía user_notification_tokens (mismo mecanismo que agenda,
//      exp.host batches de 100 — sin el hardening v7 de agenda: deuda)
//   5. Inbox in-app: una row en user_notifications por user
//   6. Marca TODAS las pendientes como notified_at (incluidas suprimidas —
//      la supresión es intencional, no debe reintentar en loop)
//
// ⚠️ ANTI-FUGA: el payload de social_notifications SOLO contiene identidad
// pública (username/display, insertada por los RPCs de la migración 190 desde
// user_profile_public). Aquí no se lee ninguna otra tabla.
//
// ── DEPLOY (manual, post-merge — Enrique) ──────────────────────────────────
//   npx supabase functions deploy dispatch-social-notifications
//   + cron pg_cron (mismo schedule/patrón Vault que agenda, ver comando exacto
//     al final de supabase/migrations/190_social_notifications.sql):
//     jobname 'dispatch-social-notifications-minutely', '* * * * *',
//     net.http_post a .../functions/v1/dispatch-social-notifications con
//     Authorization Bearer desde vault.decrypted_secrets 'service_role_key'.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PENDING = 200;

interface SocialNotif {
  id: string;
  user_id: string;
  type: "friend_request" | "friend_accepted";
  payload: { from_user_id?: string; username?: string | null; display_name?: string | null };
  created_at: string;
}

/** Copy push en español (Comunidad V1.1). Exportable mentalmente: display fail-soft. */
function singleCopy(n: SocialNotif): { title: string; body: string } {
  const display = n.payload?.display_name || n.payload?.username || "Un atleta ATP";
  if (n.type === "friend_accepted") {
    return { title: "ATP — Comunidad", body: `${display} aceptó tu solicitud` };
  }
  return { title: "ATP — Comunidad", body: `${display} te envió una solicitud de amistad` };
}

function consolidatedCopy(count: number): { title: string; body: string } {
  return { title: "ATP — Comunidad", body: `Tienes ${count} novedades de amigos` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const nowIso = new Date().toISOString();

  // 1) Pendientes FIFO
  const { data: pending, error: pendingErr } = await supabase
    .from("social_notifications")
    .select("id, user_id, type, payload, created_at")
    .is("notified_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_PENDING);

  if (pendingErr) {
    console.error(JSON.stringify({ level: "error", event: "pending_query_failed", error: pendingErr.message }));
    return new Response(JSON.stringify({ error: pendingErr.message }), { status: 500, headers: corsHeaders });
  }
  if (!pending?.length) return new Response("No pending", { status: 200, headers: corsHeaders });

  const rows = pending as SocialNotif[];
  const allUserIds = [...new Set(rows.map((r) => r.user_id))];

  // 2) Prefs enforcement (mode silent + quiet hours, patrón de agenda)
  const { data: prefsRows } = await supabase
    .from("user_notification_prefs")
    .select("user_id, mode, quiet_hours_start, quiet_hours_end")
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

  const allowsSocial = (userId: string): boolean => {
    const p = (prefsRows ?? []).find((r: any) => r.user_id === userId);
    if (!p) return true;
    if (p.mode === "silent") return false;
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

  const allowed = rows.filter((r) => allowsSocial(r.user_id));
  const suppressedByPrefs = rows.length - allowed.length;

  // 3) Anti-bulk: agrupar por user → 1 push por user por run
  const byUser = new Map<string, SocialNotif[]>();
  for (const r of allowed) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id)!.push(r);
  }

  // 4) Tokens de los users que sí reciben
  const dispatchUserIds = [...byUser.keys()];
  const { data: tokens } = dispatchUserIds.length
    ? await supabase
        .from("user_notification_tokens")
        .select("user_id, expo_push_token")
        .in("user_id", dispatchUserIds)
    : { data: [] as any[] };

  const tokenMap = new Map<string, string[]>();
  for (const t of (tokens ?? []) as any[]) {
    if (!tokenMap.has(t.user_id)) tokenMap.set(t.user_id, []);
    tokenMap.get(t.user_id)!.push(t.expo_push_token);
  }

  // 5) Mensajes push + inbox rows (una por user)
  const messages: any[] = [];
  const inboxRows: any[] = [];
  for (const [userId, notifs] of byUser) {
    const { title, body } = notifs.length === 1
      ? singleCopy(notifs[0])
      : consolidatedCopy(notifs.length);
    const data = { route: "/comunidad/amigos", notifIds: notifs.map((n) => n.id) };

    for (const token of tokenMap.get(userId) ?? []) {
      messages.push({ to: token, title, body, data, sound: "default" });
    }
    inboxRows.push({
      user_id: userId,
      type: notifs.length === 1 ? notifs[0].type : "social_batch",
      title,
      body,
      data,
    });
  }

  // 6) Enviar push en batches de 100 (best-effort; sin retry/hardening v7 — deuda)
  let pushFailed = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        pushFailed++;
        console.error(JSON.stringify({ level: "error", event: "push_failed", status: res.status, batch_size: batch.length }));
      }
    } catch (e) {
      pushFailed++;
      console.error(JSON.stringify({ level: "error", event: "push_network_error", error: String(e) }));
    }
  }

  // 7) Inbox in-app (best-effort)
  if (inboxRows.length > 0) {
    const { error: inboxErr } = await supabase.from("user_notifications").insert(inboxRows);
    if (inboxErr) {
      console.error(JSON.stringify({ level: "error", event: "inbox_insert_failed", error: inboxErr.message }));
    }
  }

  // 8) Marcar TODAS las pendientes (despachadas + suprimidas por prefs)
  const ids = rows.map((r) => r.id);
  await supabase.from("social_notifications").update({ notified_at: nowIso }).in("id", ids);

  console.log(JSON.stringify({
    level: "info", event: "run_summary",
    users: byUser.size, push_messages: messages.length,
    push_failed: pushFailed, suppressed_by_prefs: suppressedByPrefs,
    total_processed: rows.length,
  }));

  return new Response(JSON.stringify({
    ok: true,
    dispatched: { users: byUser.size, push_messages: messages.length, inbox_rows: inboxRows.length },
    suppressed: { by_prefs: suppressedByPrefs },
    total_processed: rows.length,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
