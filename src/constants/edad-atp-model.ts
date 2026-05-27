// COPY MÉDICO — borrador v1 (pendiente validación final con Mariana antes de Founders M1)
// CALIBRACIÓN MÉDICA — pesos v1.1 pendiente cierre final con Mariana.
// Si Mariana ajusta, solo tocar este archivo.

export type FactorKey =
  | 'tabaco' | 'dieta' | 'actividad' | 'composicion'
  | 'sueno' | 'social' | 'alcohol' | 'estres' | 'masa_muscular';

export const FACTOR_WEIGHTS: Record<FactorKey, Record<string, number>> = {
  tabaco: {
    nunca: -1,
    ex_antes_40: 0,
    ex_reciente: 2,
    fuma: 5,
  },
  dieta: {
    excelente: -2,
    promedio: 0,
    pobre: 3,
  },
  actividad: {
    activo: -1.5,
    algo: -0.5,
    sedentario: 2.5,
  },
  composicion: {
    optima: -1.5,
    borderline: 0,
    alta: 2.5,
  },
  sueno: {
    optimo: -1,
    suboptimo: 0,
    malo: 2,
  },
  social: {
    fuerte: -1.5,
    ok: 0,
    aislado: 2.5,
  },
  alcohol: {
    ninguno_bajo: 0,
    moderado: 0.5,
    alto: 2.5,
  },
  estres: {
    bajo: -1.5,
    moderado: 0,
    alto: 2.5,
  },
  masa_muscular: {
    alto_ffmi: -1.5,
    normal_ffmi: 0,
    bajo_ffmi: 2,
  },
};

export const EDAD_ATP_DELTA_CAP = { min: -12, max: 15 };

export const FFMI_CUTOFFS = {
  male:   { bajo: 17, alto: 20 },
  female: { bajo: 14, alto: 17 },
};

export const BODY_FAT_CUTOFFS = {
  male:   { optimo: 15, alto: 25 },
  female: { optimo: 22, alto: 32 },
};

export const VISCERAL_FAT_HIGH_RISK = 12;

export const FACTOR_LABELS_CULPABLE: Record<FactorKey, string> = {
  tabaco: 'el tabaco',
  dieta: 'tu alimentación',
  actividad: 'el sedentarismo',
  composicion: 'tu composición corporal',
  sueno: 'tu sueño',
  social: 'tu nivel de conexión social',
  alcohol: 'el alcohol',
  estres: 'tu estrés crónico',
  masa_muscular: 'tu masa muscular baja',
};
