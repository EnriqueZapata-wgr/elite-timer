/**
 * data-export-generator (#132 Privacy Fase B) — procesa user_data_exports
 * pendientes (DSAR / GDPR Art. 20 portabilidad).
 *
 * Trigger: pg_cron cada 5 min (POST con service role desde Vault, mismo
 * patrón que dispatch-agenda-notifications / migración 099).
 *
 * Por cada request pending (batch 3 por corrida, cap 60s):
 *   1. status='processing'
 *   2. Query de las tablas GDPR-relevantes del usuario (lista explícita;
 *      tabla faltante o con error → se registra en skipped, no tumba el export)
 *   3. JSON estructurado → Storage bucket privado `user-exports/{user_id}/{export_id}.json`
 *   4. Signed URL 7 días → status='completed' + download_url + expires_at + file_size_bytes
 *
 * Idempotente: solo toma rows en 'pending'; un export ya processing/completed
 * no se reprocesa. Ante error → status='failed' con error_message.
 *
 * ⚠️ NO TESTEADO en runtime local (no hay Deno) — validar tras deploy.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const BATCH_SIZE = 3;
const ROW_CAP = 5000; // por tabla — bound de tamaño del export
const BUCKET = 'user-exports';
const SIGNED_URL_SECONDS = 7 * 24 * 60 * 60; // 7 días

// Tablas GDPR-relevantes: { tabla, columna del usuario }.
// profiles usa `id`; el resto user_id. Errores por tabla → skipped.
const TABLES: { name: string; userCol: string }[] = [
  { name: 'profiles', userCol: 'id' },
  { name: 'client_profiles', userCol: 'user_id' },
  { name: 'user_consent', userCol: 'user_id' },
  { name: 'user_chronotype', userCol: 'user_id' },
  { name: 'historia_clinica', userCol: 'user_id' },
  { name: 'clinical_symptoms', userCol: 'user_id' },
  { name: 'clinical_symptom_logs', userCol: 'user_id' },
  { name: 'lab_values', userCol: 'user_id' },
  { name: 'lab_results', userCol: 'user_id' },
  { name: 'lab_uploads', userCol: 'user_id' },
  { name: 'edad_atp_biomarkers', userCol: 'user_id' },
  { name: 'health_measurements', userCol: 'user_id' },
  { name: 'health_scores', userCol: 'user_id' },
  { name: 'braverman_results', userCol: 'user_id' },
  { name: 'functional_quiz_results', userCol: 'user_id' },
  { name: 'quiz_responses', userCol: 'user_id' },
  { name: 'edad_atp_questionnaire_responses', userCol: 'user_id' },
  { name: 'cycle_settings', userCol: 'user_id' },
  { name: 'cycle_logs', userCol: 'user_id' },
  { name: 'daily_plans', userCol: 'user_id' },
  { name: 'agenda_events', userCol: 'user_id' },
  { name: 'journal_entries', userCol: 'user_id' },
  { name: 'electron_balance', userCol: 'user_id' },
  { name: 'electron_transactions', userCol: 'user_id' },
  { name: 'proton_balance', userCol: 'user_id' },
  { name: 'proton_transactions', userCol: 'user_id' },
  { name: 'argos_conversations', userCol: 'user_id' },
  { name: 'user_routines', userCol: 'user_id' },
  { name: 'workout_logs', userCol: 'user_id' },
  { name: 'food_logs', userCol: 'user_id' },
  { name: 'fasting_sessions', userCol: 'user_id' },
  { name: 'supplements', userCol: 'user_id' },
  { name: 'glucose_logs', userCol: 'user_id' },
  { name: 'ketones_logs', userCol: 'user_id' },
  { name: 'body_measurements', userCol: 'user_id' },
  { name: 'personal_records', userCol: 'user_id' },
  { name: 'user_notifications', userCol: 'user_id' },
  { name: 'affiliates', userCol: 'user_id' },
];

serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Bucket privado (idempotente)
  try {
    await supabase.storage.createBucket(BUCKET, { public: false });
  } catch (_e) { /* ya existe */ }

  const { data: pending, error: pendingError } = await supabase
    .from('user_data_exports')
    .select('id, user_id')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (pendingError) {
    return new Response(JSON.stringify({ error: pendingError.message }), { status: 500 });
  }
  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  let processed = 0;
  for (const req of pending) {
    try {
      await supabase.from('user_data_exports')
        .update({ status: 'processing' })
        .eq('id', req.id)
        .eq('status', 'pending');

      const payload: Record<string, unknown> = {
        export_id: req.id,
        user_id: req.user_id,
        generated_at: new Date().toISOString(),
        format: 'ATP data export v1 (GDPR Art. 20)',
      };
      const skipped: string[] = [];
      const truncated: string[] = [];

      for (const t of TABLES) {
        try {
          const { data, error } = await supabase
            .from(t.name)
            .select('*')
            .eq(t.userCol, req.user_id)
            .limit(ROW_CAP);
          if (error) { skipped.push(t.name); continue; }
          if (data && data.length > 0) {
            payload[t.name] = data;
            if (data.length === ROW_CAP) truncated.push(t.name);
          }
        } catch (_e) {
          skipped.push(t.name);
        }
      }
      if (skipped.length) payload._skipped_tables = skipped;
      if (truncated.length) payload._truncated_tables = truncated;

      const json = JSON.stringify(payload, null, 2);
      const bytes = new TextEncoder().encode(json);
      const path = `${req.user_id}/${req.id}.json`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: 'application/json', upsert: true });
      if (uploadError) throw new Error(`storage: ${uploadError.message}`);

      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_SECONDS);
      if (signError || !signed) throw new Error(`signed url: ${signError?.message}`);

      await supabase.from('user_data_exports').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        download_url: signed.signedUrl,
        expires_at: new Date(Date.now() + SIGNED_URL_SECONDS * 1000).toISOString(),
        file_size_bytes: bytes.byteLength,
      }).eq('id', req.id);

      processed += 1;
    } catch (e) {
      await supabase.from('user_data_exports').update({
        status: 'failed',
        error_message: String((e as Error)?.message ?? e).slice(0, 500),
      }).eq('id', req.id);
    }
  }

  return new Response(JSON.stringify({ processed }), { status: 200 });
});
