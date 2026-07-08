// dispatch-agenda-notifications — Edge Function
//
// Task #135 refactor: smart criterio para evitar hostigamiento por notifs bulk.
//
// Estrategia:
//   1. Buscar agenda_event_logs pendientes (mismo query que antes)
//   2. Filtrar por user_notification_prefs (task #61, ya estaba)
//   3. NUEVO: agrupar por (user_id, bucket_15min) basado en scheduled_at
//   4. NUEVO: cooldown 30min per user — si el user recibió notif de agenda en los
//      últimos 30 min, marcar los logs como notified pero NO enviar (evita saturación)
//   5. Para cada bucket:
//      - 1 evento: notif individual con copy original
//      - 2+ eventos: notif consolidada "N acciones próximas: X, Y, Z"
//   6. Insertar UNA row en user_notifications por bucket (no una por log)
//   7. Enviar UNA push por bucket per token (no una por log)
//   8. Marcar TODOS los logs pendientes como notified (incluidos los suprimidos)
//
// Historia:
//   v13g F6: creación original
//   v3 AGENDA-COMPLETE F3: agrega inbox in-app
//   v4 POLISH V1.3 F5: enforcement de user_notification_prefs
//   v5 (esto): smart criterio anti-bulk (task #135)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
// Sprint #50 hardening v7 — helpers puros (testeados en vitest)
import {
  analyzeExpoTickets,
  DEAD_TOKEN_ERROR,
  sendPushBatchWithRetry,
  tokensToInvalidate,
  type PushFailure,
  type PushSendResult,
} from "./hardening.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Config anti-bulk (task #135)
const BUCKET_MINUTES = 15;      // Eventos dentro de esta ventana → 1 notif consolidada
const COOLDOWN_MINUTES = 30;    // Min entre notifs de agenda per user
const MAX_EVENTS_LISTED = 3;    // Cuántos nombres mostrar en la consolidada antes de "y N más"

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const nowIso = now.toISOString();

  // 1) logs con notify pendiente
  const { data: pending, error: pendingErr } = await supabase
    .from("agenda_event_logs")
    .select("id, user_id, event_id, scheduled_at, agenda_events(name, category)")
    .lte("notify_at", nowIso)
    .is("notified_at", null)
    .not("notify_at", "is", null)
    .limit(500);

  if (pendingErr) {
    return new Response(JSON.stringify({ error: pendingErr.message }), { status: 500, headers: corsHeaders });
  }
  if (!pending?.length) return new Response("No pending", { status: 200, headers: corsHeaders });

  const allUserIds = [...new Set(pending.map((p: any) => p.user_id))];

  // 2) Prefs enforcement (task #61)
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
    if (!p) return true;
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
  const suppressedByPrefs = pending.length - allowed.length;

  // 3) NUEVO: Cooldown check — para cada user allowed, buscar última notif de agenda
  // en las últimas COOLDOWN_MINUTES. Si existe, marcar SUS logs como notified sin
  // enviar. Evita saturar al user.
  const cooldownCutoff = new Date(now.getTime() - COOLDOWN_MINUTES * 60000).toISOString();
  const allowedUserIds = [...new Set(allowed.map((log: any) => log.user_id))];

  const { data: recentNotifs } = await supabase
    .from("user_notifications")
    .select("user_id, created_at")
    .in("user_id", allowedUserIds)
    .eq("type", "agenda_reminder")
    .gte("created_at", cooldownCutoff);

  const usersInCooldown = new Set((recentNotifs ?? []).map((n: any) => n.user_id));
  const withinCooldown = allowed.filter((log: any) => usersInCooldown.has(log.user_id));
  const toDispatch = allowed.filter((log: any) => !usersInCooldown.has(log.user_id));
  const suppressedByCooldown = withinCooldown.length;

  // 4) NUEVO: Agrupar toDispatch por (user_id, bucket_15min) basado en scheduled_at
  type Bucket = {
    userId: string;
    bucketKey: string;
    logs: any[];        // logs originales del bucket
    events: string[];   // nombres de eventos únicos, deduplicados
    categories: Set<string>;
    earliestScheduledAt: string;
  };

  const buckets = new Map<string, Bucket>();
  for (const log of toDispatch) {
    const scheduledMs = new Date(log.scheduled_at).getTime();
    const bucketMs = Math.floor(scheduledMs / (BUCKET_MINUTES * 60000)) * (BUCKET_MINUTES * 60000);
    const bucketKey = `${log.user_id}:${bucketMs}`;

    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        userId: log.user_id,
        bucketKey,
        logs: [],
        events: [],
        categories: new Set<string>(),
        earliestScheduledAt: log.scheduled_at,
      };
      buckets.set(bucketKey, bucket);
    }
    bucket.logs.push(log);
    const eventName = log.agenda_events?.name ?? "Evento";
    if (!bucket.events.includes(eventName)) bucket.events.push(eventName);
    if (log.agenda_events?.category) bucket.categories.add(log.agenda_events.category);
    if (log.scheduled_at < bucket.earliestScheduledAt) bucket.earliestScheduledAt = log.scheduled_at;
  }

  // 5) Tokens por usuario (solo los que efectivamente van a recibir notif)
  const dispatchUserIds = [...new Set([...buckets.values()].map((b) => b.userId))];
  const { data: tokens } = await supabase
    .from("user_notification_tokens")
    .select("user_id, expo_push_token")
    .in("user_id", dispatchUserIds);

  const tokenMap = new Map<string, string[]>();
  // v7 T2: reverse map token→user para el dead-letter (push_failure_log.user_id)
  const tokenToUser = new Map<string, string>();
  for (const t of (tokens ?? []) as any[]) {
    if (!tokenMap.has(t.user_id)) tokenMap.set(t.user_id, []);
    tokenMap.get(t.user_id)!.push(t.expo_push_token);
    tokenToUser.set(t.expo_push_token, t.user_id);
  }

  // 6) Construir mensajes y rows de inbox por BUCKET (no por log)
  const messages: any[] = [];
  const inboxRows: any[] = [];

  for (const bucket of buckets.values()) {
    const eventCount = bucket.logs.length;
    const singleEvent = eventCount === 1;
    const listedEvents = bucket.events.slice(0, MAX_EVENTS_LISTED);
    const remainingCount = bucket.events.length - listedEvents.length;

    const title = singleEvent ? "ATP — Próximo evento" : `ATP — ${bucket.events.length} próximas acciones`;
    const body = singleEvent
      ? `${bucket.events[0]} · en breve`
      : remainingCount > 0
        ? `${listedEvents.join(" · ")} y ${remainingCount} más · en breve`
        : `${listedEvents.join(" · ")} · en breve`;

    const eventIds = bucket.logs.map((l) => l.event_id);
    const logIds = bucket.logs.map((l) => l.id);

    // Push notifications (una por token del user en el bucket, con el mismo body)
    const userTokens = tokenMap.get(bucket.userId) ?? [];
    for (const token of userTokens) {
      messages.push({
        to: token,
        title,
        body,
        data: {
          bucketKey: bucket.bucketKey,
          logIds,
          eventIds,
          categories: [...bucket.categories],
          route: "/agenda",
        },
        sound: "default",
      });
    }

    // Inbox in-app — UNA row por bucket, no por log
    inboxRows.push({
      user_id: bucket.userId,
      type: singleEvent ? "agenda_reminder" : "agenda_batch",
      title,
      body,
      data: {
        bucketKey: bucket.bucketKey,
        logIds,
        eventIds,
        categories: [...bucket.categories],
        route: "/agenda",
      },
    });
  }

  // 7) Enviar push en batches de 100 — v7 T1: retry con backoff (500ms/2s/5s,
  //    solo red/5xx/429). Los resultados se conservan para dead-letter (T2) y
  //    circuit breaker (T4).
  const expoFetch = (body: string) =>
    fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
    });

  const batchResults: { batch: any[]; result: PushSendResult }[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const result = await sendPushBatchWithRetry(batch, expoFetch);
    batchResults.push({ batch, result });
    if (!result.ok) {
      console.error(`[dispatch-agenda] expo batch failed after ${result.attempts} attempts (status=${result.status}, network=${result.networkError})`);
    }
  }

  // 7b) v7 T2: dead-letter — parsear tickets, registrar fallos y auto-invalidar
  //     tokens con 3+ DeviceNotRegistered. Best-effort: nada de esto bloquea
  //     el dispatch si la tabla o el delete fallan.
  const allFailures: PushFailure[] = [];
  for (const { batch, result } of batchResults) {
    if (result.ok && result.tickets.length > 0) {
      allFailures.push(...analyzeExpoTickets(result.tickets, batch));
    }
  }
  let tokensInvalidated = 0;
  if (allFailures.length > 0) {
    const failureRows = allFailures
      .filter((f) => tokenToUser.has(f.token))
      .map((f) => ({
        user_id: tokenToUser.get(f.token)!,
        expo_push_token: f.token,
        error_code: f.errorCode,
        error_message: f.errorMessage,
        bucket_key: f.bucketKey,
      }));
    if (failureRows.length > 0) {
      const { error: dlErr } = await supabase.from("push_failure_log").insert(failureRows);
      if (dlErr) console.error("[dispatch-agenda] push_failure_log insert failed", dlErr.message);
    }

    const deadTokensNow = [...new Set(
      allFailures.filter((f) => f.errorCode === DEAD_TOKEN_ERROR).map((f) => f.token),
    )];
    if (deadTokensNow.length > 0) {
      // Conteo HISTÓRICO de DeviceNotRegistered por token (incluye este run)
      const { data: deadRows } = await supabase
        .from("push_failure_log")
        .select("expo_push_token")
        .in("expo_push_token", deadTokensNow)
        .eq("error_code", DEAD_TOKEN_ERROR);
      const counts: Record<string, number> = {};
      for (const row of (deadRows ?? []) as any[]) {
        counts[row.expo_push_token] = (counts[row.expo_push_token] ?? 0) + 1;
      }
      const invalidate = tokensToInvalidate(counts);
      if (invalidate.length > 0) {
        const { error: invErr } = await supabase
          .from("user_notification_tokens")
          .delete()
          .in("expo_push_token", invalidate);
        if (invErr) {
          console.error("[dispatch-agenda] token invalidation failed", invErr.message);
        } else {
          tokensInvalidated = invalidate.length;
        }
      }
    }
  }

  // 8) Insertar rows del inbox
  if (inboxRows.length > 0) {
    const { error: inboxErr } = await supabase.from("user_notifications").insert(inboxRows);
    if (inboxErr) console.error("[dispatch-agenda] inbox insert failed", inboxErr.message);
  }

  // 9) Marcar TODOS los logs pendientes como notificados (dispatched + suppressed)
  //    — supresión es intencional, no debe reintentar en loop
  const logIds = (pending as any[]).map((p) => p.id);
  await supabase.from("agenda_event_logs").update({ notified_at: nowIso }).in("id", logIds);

  return new Response(JSON.stringify({
    ok: true,
    dispatched: {
      buckets: buckets.size,
      push_messages: messages.length,
      inbox_rows: inboxRows.length,
    },
    suppressed: {
      by_prefs: suppressedByPrefs,
      by_cooldown: suppressedByCooldown,
    },
    total_logs_processed: pending.length,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
