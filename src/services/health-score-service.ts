/**
 * Health Score Service — Calcula y almacena scores de salud funcional.
 */
import { supabase } from '@/src/lib/supabase';
import {
  calculateHealthScore, mapPatientDataToInput, type HealthScore, type Sex,
} from '@/src/data/functional-health-engine';

/** Crea client_profile mínimo si no existe. Retorna true si ya tenía date_of_birth. */
export async function ensureClientProfile(userId: string, dob?: string, sex?: string): Promise<boolean> {
  const { data } = await supabase.from('client_profiles').select('date_of_birth').eq('user_id', userId).single();
  if (data?.date_of_birth) return true;

  // Upsert con los datos proporcionados
  if (dob) {
    await supabase.from('client_profiles').upsert({
      user_id: userId,
      date_of_birth: dob,
      biological_sex: sex || 'male',
    }, { onConflict: 'user_id' });
    return true;
  }
  return false;
}

export async function calculateAndSaveScore(userId: string, consultationId?: string): Promise<HealthScore> {
  // Obtener datos
  const [labsRes, bodyRes, profileRes] = await Promise.all([
    supabase.from('lab_results').select('*').eq('user_id', userId).order('lab_date', { ascending: false }).limit(1),
    supabase.from('body_measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: false }).limit(1),
    supabase.from('client_profiles').select('*').eq('user_id', userId).single(),
  ]);

  const labs = labsRes.data?.[0] ?? null;
  const body = bodyRes.data?.[0] ?? null;
  let profile = profileRes.data ?? null;

  // Si no hay client_profile, intentar crear uno mínimo desde profiles
  if (!profile) {
    const { data: userProfile } = await supabase
      .from('profiles').select('date_of_birth, biological_sex').eq('id', userId).single();
    if (userProfile) profile = userProfile;
  }

  if (!labs) throw new Error('No se encontraron resultados de laboratorio. Sube un estudio primero.');

  const sex: Sex = (profile?.biological_sex === 'female') ? 'female' : 'male';
  const dob = profile?.date_of_birth;
  const chronAge = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : 0;

  const inputValues = mapPatientDataToInput(labs, body, profile);

  const bodyValues = {
    height_m: profile?.height_cm ? profile.height_cm / 100 : 1.75,
    weight_kg: body?.weight_kg ?? 80,
    body_fat_pct: body?.body_fat_pct ?? 20,
    muscle_pct: body?.muscle_mass_pct ?? 35,
    visceral_fat: body?.visceral_fat ?? 5,
    grip_strength: profile?.grip_strength_kg ?? 40,
  };

  const score = calculateHealthScore(inputValues, sex, chronAge, bodyValues);
  score.metabolicAge = profile?.metabolic_age_impedance ?? 0;

  // Guardar
  await supabase.from('health_scores').insert({
    user_id: userId,
    consultation_id: consultationId ?? null,
    functional_health_score: score.functionalHealthScore,
    evaluation_quality: score.evaluationQuality,
    biological_age: score.biologicalAge,
    aging_rate: score.agingRate,
    domain_scores: score.domains,
    pheno_age_detail: score.phenoAge,
    input_snapshot: inputValues,
    sex,
    chronological_age: chronAge,
  }).then(() => {});

  return score;
}

export async function getLatestScore(userId: string): Promise<HealthScore | null> {
  const { data } = await supabase
    .from('health_scores')
    .select('*')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  // Reconstruir marcadores PhenoAge faltantes desde el snapshot guardado
  const phenoKeys = ['albumin', 'creatinine', 'glucose_fasting', 'crp', 'lymphocyte_pct', 'mcv', 'rdw_cv', 'alp', 'wbc'];
  const phenoLabels: Record<string, string> = {
    albumin: 'Albúmina', creatinine: 'Creatinina', glucose_fasting: 'Glucosa',
    crp: 'PCR', lymphocyte_pct: 'Linfocitos %', mcv: 'VCM',
    rdw_cv: 'RDW', alp: 'FA', wbc: 'Leucocitos',
  };
  const snapshot = data.input_snapshot ?? {};
  const missing = phenoKeys.filter(k => snapshot[k] == null).map(k => phenoLabels[k] ?? k);

  return {
    functionalHealthScore: data.functional_health_score,
    evaluationQuality: data.evaluation_quality,
    biologicalAge: data.biological_age,
    metabolicAge: 0,
    agingRate: data.aging_rate,
    domains: data.domain_scores ?? [],
    phenoAge: data.pheno_age_detail,
    phenoAgeMissing: missing.length > 0 ? missing : undefined,
  };
}
