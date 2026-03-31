/**
 * Health Score Service — Calcula y almacena scores de salud funcional.
 */
import { supabase } from '@/src/lib/supabase';
import {
  calculateHealthScore, mapPatientDataToInput, type HealthScore, type Sex,
} from '@/src/data/functional-health-engine';
import { getLatestMeasurement } from '@/src/services/health-measurement-service';

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

interface FitnessAdjustment {
  label: string;
  value: number;
}

function calculateFitnessAdjustments(
  hm: any | null,
  prs: any[],
  chronAge: number,
  sex: 'male' | 'female',
): FitnessAdjustment[] {
  const adj: FitnessAdjustment[] = [];
  if (!hm && prs.length === 0) return adj;

  // Fuerza de agarre
  if (hm?.grip_strength_kg) {
    const avgGrip = sex === 'male'
      ? (chronAge < 30 ? 47 : chronAge < 40 ? 45 : chronAge < 50 ? 43 : chronAge < 60 ? 39 : 34)
      : (chronAge < 30 ? 29 : chronAge < 40 ? 28 : chronAge < 50 ? 27 : chronAge < 60 ? 25 : 22);
    const ratio = hm.grip_strength_kg / avgGrip;
    adj.push({ label: 'Fuerza de agarre', value: Math.max(-3, Math.min(3, (1 - ratio) * 5)) });
  }

  // VO2max
  if (hm?.vo2max_estimate) {
    const thresholds = sex === 'male'
      ? (chronAge < 30 ? [55, 49, 43, 37] : chronAge < 40 ? [52, 46, 40, 34] : chronAge < 50 ? [49, 43, 37, 31] : [43, 37, 32, 27])
      : (chronAge < 30 ? [47, 41, 35, 29] : chronAge < 40 ? [44, 38, 32, 26] : chronAge < 50 ? [41, 35, 29, 23] : [35, 29, 24, 19]);
    const v = hm.vo2max_estimate;
    const a = v >= thresholds[0] ? -2 : v >= thresholds[1] ? -1 : v >= thresholds[2] ? 0 : v >= thresholds[3] ? 1 : 2;
    adj.push({ label: 'VO2max', value: a });
  }

  // Presión arterial
  if (hm?.systolic_bp && hm?.diastolic_bp) {
    const s = hm.systolic_bp;
    const d = hm.diastolic_bp;
    const a = (s < 120 && d < 80) ? -0.5 : (s >= 140 || d >= 90) ? 1.5 : 0.5;
    adj.push({ label: 'Presión arterial', value: a });
  }

  // Frecuencia cardíaca en reposo
  if (hm?.resting_hr) {
    const hr = hm.resting_hr;
    const a = hr < 60 ? -1 : hr <= 70 ? 0 : hr <= 80 ? 0.5 : 1;
    adj.push({ label: 'FC reposo', value: a });
  }

  // Fuerza relativa desde PRs
  if (prs.length > 0 && hm?.weight_kg) {
    const bw = hm.weight_kg;
    const squat = prs.find((pr: any) => /squat|sentadilla/i.test(pr.exercise_name));
    const deadlift = prs.find((pr: any) => /deadlift|peso muerto/i.test(pr.exercise_name));
    const bench = prs.find((pr: any) => /bench|press banca/i.test(pr.exercise_name));

    const targets = sex === 'male'
      ? { squat: 1.5, deadlift: 2.0, bench: 1.25 }
      : { squat: 1.0, deadlift: 1.5, bench: 0.75 };

    let totalRatio = 0, count = 0;
    if (squat?.weight_kg) { totalRatio += (squat.weight_kg / bw) / targets.squat; count++; }
    if (deadlift?.weight_kg) { totalRatio += (deadlift.weight_kg / bw) / targets.deadlift; count++; }
    if (bench?.weight_kg) { totalRatio += (bench.weight_kg / bw) / targets.bench; count++; }

    if (count > 0) {
      adj.push({ label: 'Fuerza relativa', value: Math.max(-2, Math.min(2, (1 - totalRatio / count) * 4)) });
    }
  }

  return adj;
}

export async function calculateAndSaveScore(userId: string, consultationId?: string): Promise<HealthScore> {
  // Obtener datos
  const [labsRes, bodyRes, profileRes] = await Promise.all([
    supabase.from('lab_results').select('*').eq('user_id', userId).order('lab_date', { ascending: false }).limit(1),
    supabase.from('body_measurements').select('*').eq('user_id', userId).order('measured_at', { ascending: false }).limit(1),
    supabase.from('client_profiles').select('*').eq('user_id', userId).single(),
  ]);

  const hmRes = await getLatestMeasurement(userId).catch(() => null);
  const prsRes = await supabase.from('personal_records').select('exercise_name, weight_kg, reps').eq('user_id', userId).order('achieved_at', { ascending: false }).limit(15);
  const prs = prsRes.data ?? [];

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

  const bodyValues: { height_m: number; weight_kg: number; body_fat_pct: number; muscle_pct: number; visceral_fat: number; grip_strength: number; [k: string]: number } = {
    height_m: profile?.height_cm ? profile.height_cm / 100 : 1.75,
    weight_kg: body?.weight_kg ?? 80,
    body_fat_pct: body?.body_fat_pct ?? 20,
    muscle_pct: body?.muscle_mass_pct ?? 35,
    visceral_fat: body?.visceral_fat ?? 5,
    grip_strength: profile?.grip_strength_kg ?? 40,
  };

  // Complementar con health_measurements si body_measurements está vacío
  if (hmRes) {
    if (!body?.body_fat_pct && hmRes.body_fat_pct) bodyValues.body_fat_pct = hmRes.body_fat_pct;
    if (!body?.muscle_mass_pct && hmRes.muscle_mass_kg && hmRes.weight_kg) bodyValues.muscle_pct = (hmRes.muscle_mass_kg / hmRes.weight_kg) * 100;
    if (!body?.visceral_fat && hmRes.visceral_fat) bodyValues.visceral_fat = hmRes.visceral_fat;
    if (!body?.weight_kg && hmRes.weight_kg) bodyValues.weight_kg = hmRes.weight_kg;
    if (hmRes.grip_strength_kg) bodyValues.grip_strength = hmRes.grip_strength_kg;
    if (hmRes.height_cm) bodyValues.height_m = hmRes.height_cm / 100;
  }

  const score = calculateHealthScore(inputValues, sex, chronAge, bodyValues);
  score.metabolicAge = profile?.metabolic_age_impedance ?? 0;

  // Ajustes de fitness a la edad biológica
  const fitnessAdj = calculateFitnessAdjustments(hmRes, prs, chronAge, sex);
  let adjustedBioAge = score.biologicalAge || chronAge;
  for (const adj of fitnessAdj) {
    adjustedBioAge += adj.value;
  }
  adjustedBioAge = Math.round(adjustedBioAge * 10) / 10;

  // Sobreescribir biologicalAge con la versión ajustada
  score.biologicalAge = adjustedBioAge;
  if (chronAge > 0) score.agingRate = Math.round((adjustedBioAge / chronAge) * 100) / 100;

  // Guardar
  await supabase.from('health_scores').insert({
    user_id: userId,
    consultation_id: consultationId ?? null,
    functional_health_score: score.functionalHealthScore,
    evaluation_quality: score.evaluationQuality,
    biological_age: score.biologicalAge,
    aging_rate: score.agingRate,
    domain_scores: score.domains,
    pheno_age_detail: { ...score.phenoAge, fitnessAdjustments: fitnessAdj },
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
