/**
 * account-deletion-processor (#132 Privacy Fase B) — GDPR Art. 17
 * "derecho al olvido" con gracia de 30 días.
 *
 * Trigger: pg_cron cada 6 horas (POST con service role desde Vault).
 *
 * Por cada user_deletion_requests con status='pending' y
 * scheduled_delete_at <= NOW():
 *   1. Captura email del usuario (para confirmación).
 *   2. Barre Storage del usuario (MB-13 · 5.1) — el CASCADE no lo toca.
 *   3. Marca status='processed' + processed_at.
 *   4. auth.admin.deleteUser → CASCADE borra todas las tablas con FK.
 *      ⚠️ La propia fila de user_deletion_requests también cascadea
 *      (FK ON DELETE CASCADE del schema 100) — el audit trail del request
 *      desaparece con el usuario. Consistente con "borrado total".
 *
 * TODO(#132): email de confirmación al último email conocido — pendiente
 * de configurar Resend/SMTP (no hay API key en el proyecto). Se registra
 * en la respuesta para observabilidad.
 *
 * ⚠️ NO TESTEADO en runtime local (no hay Deno) — validar tras deploy.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const BATCH_SIZE = 10;

/**
 * MB-13 · Pieza 5.1 — auth.admin.deleteUser cascadea las tablas con FK pero
 * NO toca storage.objects: sin este barrido, fotos de comida, PDFs de
 * laboratorio, estudios clínicos, avatares, capturas de feedback y exports
 * quedan huérfanos para siempre. Todos estos buckets usan `${userId}/` como
 * primer segmento del path.
 */
const USER_BUCKETS = [
  'food-photos',
  'clinical-studies',
  'lab-files',
  'avatars',
  'avatars_public',
  'feedback-screenshots',
  'user-exports',
];

type AdminClient = ReturnType<typeof createClient>;

/** Lista recursiva (los archivos traen id; las carpetas no). */
async function listUserFiles(
  supabase: AdminClient,
  bucket: string,
  prefix: string,
  depth = 0,
): Promise<string[]> {
  if (depth > 3) return [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    // Bucket inexistente en este entorno → nada que borrar; otro error → arriba.
    if (/not found/i.test(error.message)) return [];
    throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
  }
  const files: string[] = [];
  for (const entry of data ?? []) {
    const full = `${prefix}/${entry.name}`;
    if ((entry as { id?: string | null }).id) files.push(full);
    else files.push(...(await listUserFiles(supabase, bucket, full, depth + 1)));
  }
  return files;
}

/** Borra TODO lo del usuario en los buckets. Si algo falla, lanza: el
 *  request se queda pending y se reintenta en la siguiente corrida. */
async function purgeUserStorage(supabase: AdminClient, userId: string): Promise<number> {
  let removed = 0;
  for (const bucket of USER_BUCKETS) {
    const files = await listUserFiles(supabase, bucket, userId);
    for (let i = 0; i < files.length; i += 100) {
      const batch = files.slice(i, i + 100);
      const { error } = await supabase.storage.from(bucket).remove(batch);
      if (error) throw new Error(`remove ${bucket}: ${error.message}`);
      removed += batch.length;
    }
  }
  return removed;
}

serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: due, error } = await supabase
    .from('user_deletion_requests')
    .select('id, user_id')
    .eq('status', 'pending')
    .lte('scheduled_delete_at', new Date().toISOString())
    .limit(BATCH_SIZE);

  if (error) {
    // MB-SEC-1 §6: el detalle va al log interno (function logs), NUNCA al cuerpo
    // de la respuesta — un error.message de Postgres puede filtrar tabla/columna.
    console.error('[account-deletion] query failed:', error.message);
    return new Response(JSON.stringify({ error: 'Error interno del servicio.' }), { status: 500 });
  }
  if (!due || due.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
  }

  const results: { user_id: string; ok: boolean; email?: string; error?: string }[] = [];

  for (const req of due) {
    try {
      // Email para confirmación (antes de que el CASCADE lo borre todo)
      const { data: userData } = await supabase.auth.admin.getUserById(req.user_id);
      const email = userData?.user?.email ?? undefined;

      // MB-13 · Pieza 5.1: Storage ANTES del deleteUser — el CASCADE no lo toca.
      await purgeUserStorage(supabase, req.user_id);

      // Audit-first: marcar processed ANTES del delete (la fila cascadea después)
      await supabase.from('user_deletion_requests').update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      }).eq('id', req.id);

      const { error: deleteError } = await supabase.auth.admin.deleteUser(req.user_id);
      if (deleteError) {
        // Revertir a pending para reintentar en la siguiente corrida
        await supabase.from('user_deletion_requests').update({
          status: 'pending',
          processed_at: null,
        }).eq('id', req.id);
        throw new Error(deleteError.message);
      }

      // TODO(#132): enviar email de confirmación a `email` vía Resend/SMTP.
      results.push({ user_id: req.user_id, ok: true, email });
    } catch (e) {
      results.push({ user_id: req.user_id, ok: false, error: String((e as Error)?.message ?? e) });
    }
  }

  return new Response(JSON.stringify({
    deleted: results.filter(r => r.ok).length,
    results,
  }), { status: 200 });
});
