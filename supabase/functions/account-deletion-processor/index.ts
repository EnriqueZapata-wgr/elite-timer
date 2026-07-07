/**
 * account-deletion-processor (#132 Privacy Fase B) — GDPR Art. 17
 * "derecho al olvido" con gracia de 30 días.
 *
 * Trigger: pg_cron cada 6 horas (POST con service role desde Vault).
 *
 * Por cada user_deletion_requests con status='pending' y
 * scheduled_delete_at <= NOW():
 *   1. Captura email del usuario (para confirmación).
 *   2. Marca status='processed' + processed_at.
 *   3. auth.admin.deleteUser → CASCADE borra todas las tablas con FK.
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
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
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
