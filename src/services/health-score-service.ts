/**
 * Health Score Service — Calcula y almacena scores de salud funcional.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import {
  calculateHealthScore, mapPatientDataToInput, type HealthScore, type Sex,
} from '@/src/data/functional-health-engine';
import { getLatestMeasurement } from '@/src/services/health-measurement-service';
import { composicionCoherente } from '@/src/services/cuerpo/medidas-core';

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
  // Audit V2 B6: los candidatos de COMPOSICIÓN son "la última fila CON
  // peso" de cada tabla — el mismo filtro que usa la meta de proteína
  // (nutrition-score-service). Sin el filtro simétrico, una fila de hoy
  // con solo cintura hacía que las dos superficies eligieran pesos
  // distintos el mismo día. bodyRes conserva su select(*) para el resto
  // del engine (labs/perfil), pero la composición sale del bloque abajo.
  const [labsRes, bodyRes, profileRes, hmPesoRes] = await Promise.all([
    supabase.from('lab_results').select('*').eq('user_id', userId).order('lab_date', { ascending: false }).limit(1),
    supabase.from('body_measurements').select('*').eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .order('measured_at', { ascending: false }).limit(1),
    supabase.from('client_profiles').select('*').eq('user_id', userId).single(),
    supabase.from('health_measurements')
      .select('weight_kg, body_fat_pct, muscle_mass_kg, visceral_fat, date')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (hmPesoRes.error) logWarn('[health-score] health_measurements weight query failed:', hmPesoRes.error.message);

  const hmRes = await getLatestMeasurement(userId).catch(() => null);
  // personal_records no tiene exercise_name/reps (fantasma MB-6): el nombre
  // viene del embed a exercises y las reps del PR son rep_range.
  const prsRes = await supabase.from('personal_records').select('weight_kg, rep_range, exercises(name, name_es)').eq('user_id', userId).order('achieved_at', { ascending: false }).limit(15);
  if (prsRes.error) logWarn('[health-score] personal_records query failed:', prsRes.error.message);
  const prs = (prsRes.data ?? []).map((pr: any) => ({
    exercise_name: pr.exercises?.name_es || pr.exercises?.name || '',
    weight_kg: pr.weight_kg,
    rep_range: pr.rep_range,
  }));

  const labs = labsRes.data?.[0] ?? null;
  const body = bodyRes.data?.[0] ?? null;
  const profile = profileRes.data ?? null;

  // Fallback eliminado (fantasma MB-6): profiles NO tiene date_of_birth ni
  // biological_sex — ese select devolvía 400 silencioso y nunca aportó datos.
  // Esos campos viven solo en client_profiles; sin perfil aplican los defaults.

  if (!labs) throw new Error('No se encontraron resultados de laboratorio. Sube un estudio primero.');

  const sex: Sex = (profile?.biological_sex === 'female') ? 'female' : 'male';
  const dob = profile?.date_of_birth;
  const chronAge = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : 0;

  const inputValues = mapPatientDataToInput(labs, body, profile);

  // Audit V2 B6: la recencia se aplica al REGISTRO, no a un campo suelto.
  // El registro ganador (última fila CON peso, misma regla y mismos
  // candidatos que la meta de proteína) aporta peso, grasa, músculo y
  // visceral COMO BLOQUE; lo que no traiga se completa del otro registro
  // con la regla declarada de composicionCoherente (fallback antes que
  // default inventado). Se acabó el peso de 2026 con la grasa de 2024 en
  // silencio — y el FFMI sale de una medición, no de un collage.
  const hmPeso = hmPesoRes.data as {
    weight_kg?: number; body_fat_pct?: number; muscle_mass_kg?: number;
    visceral_fat?: number; date?: string;
  } | null;
  const comp = composicionCoherente(
    hmPeso
      ? {
          date: hmPeso.date ?? null, weight_kg: hmPeso.weight_kg,
          body_fat_pct: hmPeso.body_fat_pct, muscle_mass_kg: hmPeso.muscle_mass_kg,
          visceral_fat: hmPeso.visceral_fat,
        }
      : null,
    body
      ? {
          date: body.measured_at ? String(body.measured_at).slice(0, 10) : null,
          weight_kg: body.weight_kg, body_fat_pct: body.body_fat_pct,
          muscle_mass_pct: body.muscle_mass_pct, visceral_fat: body.visceral_fat,
        }
      : null,
  );

  const bodyValues: { height_m: number; weight_kg: number; body_fat_pct: number; muscle_pct: number; visceral_fat: number; grip_strength: number; [k: string]: number } = {
    height_m: profile?.height_cm ? profile.height_cm / 100 : 1.75,
    weight_kg: comp.weight_kg ?? 80,
    body_fat_pct: comp.body_fat_pct ?? 20,
    muscle_pct: comp.muscle_pct ?? 35,
    visceral_fat: comp.visceral_fat ?? 5,
    grip_strength: profile?.grip_strength_kg ?? 40,
  };

  // Complemento NO-composición (agarre, talla): el coalesce de siempre.
  if (hmRes) {
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
