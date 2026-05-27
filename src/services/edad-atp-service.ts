import {
  type FactorKey,
  FACTOR_WEIGHTS,
  EDAD_ATP_DELTA_CAP,
  FFMI_CUTOFFS,
  BODY_FAT_CUTOFFS,
  VISCERAL_FAT_HIGH_RISK,
  FACTOR_LABELS_CULPABLE,
} from '@/src/constants/edad-atp-model';

export interface EdadAtpResult {
  years: number;
  chronologicalAge: number;
  deltas: Partial<Record<FactorKey, number>>;
  confidence: 'media' | 'alta' | 'rigurosa';
  composition_used: boolean;
  culpables: Culpable[];
}

export interface Culpable {
  factor: FactorKey;
  delta: number;
  label: string;
}

export interface CompositionInput {
  weight_kg: number;
  body_fat_pct?: number;
  visceral_fat_rating?: number;
  height_cm: number;
  sex: 'male' | 'female';
}

function getChronologicalAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function computeFfmi(weight_kg: number, body_fat_pct: number, height_cm: number): number {
  const height_m = height_cm / 100;
  const lean_mass = weight_kg * (1 - body_fat_pct / 100);
  return lean_mass / (height_m * height_m);
}

export function classifyComposicionMedida(
  body_fat_pct: number | undefined,
  visceral_fat_rating: number | undefined,
  sex: 'male' | 'female',
): 'optima' | 'borderline' | 'alta' {
  if (visceral_fat_rating != null && visceral_fat_rating >= VISCERAL_FAT_HIGH_RISK) {
    return 'alta';
  }

  if (body_fat_pct == null) return 'borderline';

  const cuts = BODY_FAT_CUTOFFS[sex];
  if (body_fat_pct < cuts.optimo) return 'optima';
  if (body_fat_pct > cuts.alto) return 'alta';
  return 'borderline';
}

export function classifyFfmi(ffmi: number, sex: 'male' | 'female'): 'alto_ffmi' | 'normal_ffmi' | 'bajo_ffmi' {
  const cuts = FFMI_CUTOFFS[sex];
  if (ffmi < cuts.bajo) return 'bajo_ffmi';
  if (ffmi > cuts.alto) return 'alto_ffmi';
  return 'normal_ffmi';
}

export function extractCulpables(deltas: Partial<Record<FactorKey, number>>): Culpable[] {
  const positive = (Object.entries(deltas) as [FactorKey, number][])
    .filter(([_, d]) => d >= 1)
    .sort((a, b) => b[1] - a[1]);

  return positive.slice(0, 2).map(([factor, delta]) => ({
    factor,
    delta,
    label: FACTOR_LABELS_CULPABLE[factor],
  }));
}

export function computeEdadAtp(
  birthdate: string,
  answers: Partial<Record<FactorKey, string>>,
  composition?: CompositionInput,
): EdadAtpResult {
  const chronologicalAge = getChronologicalAge(birthdate);
  const deltas: Partial<Record<FactorKey, number>> = {};
  let composition_used = false;

  for (const [factor, answer] of Object.entries(answers) as [FactorKey, string][]) {
    if (factor === 'masa_muscular') continue;

    const weights = FACTOR_WEIGHTS[factor];
    if (!weights || weights[answer] == null) continue;

    if (factor === 'composicion' && composition) {
      const measuredClass = classifyComposicionMedida(
        composition.body_fat_pct,
        composition.visceral_fat_rating,
        composition.sex,
      );
      deltas.composicion = FACTOR_WEIGHTS.composicion[measuredClass];
      composition_used = true;
    } else {
      deltas[factor] = weights[answer];
    }
  }

  if (composition_used && composition && composition.body_fat_pct != null) {
    const ffmi = computeFfmi(composition.weight_kg, composition.body_fat_pct, composition.height_cm);
    const ffmiClass = classifyFfmi(ffmi, composition.sex);
    deltas.masa_muscular = FACTOR_WEIGHTS.masa_muscular[ffmiClass];
  }

  const sumDelta = Object.values(deltas).reduce((sum, d) => sum + (d ?? 0), 0);
  const cappedDelta = Math.max(EDAD_ATP_DELTA_CAP.min, Math.min(EDAD_ATP_DELTA_CAP.max, sumDelta));

  const years = Math.round(chronologicalAge + cappedDelta);
  const confidence = composition_used ? 'alta' : 'media';
  const culpables = extractCulpables(deltas);

  return {
    years,
    chronologicalAge,
    deltas,
    confidence,
    composition_used,
    culpables,
  };
}
