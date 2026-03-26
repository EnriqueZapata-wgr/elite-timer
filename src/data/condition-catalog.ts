/**
 * Catálogo de condiciones médicas por zona — Tablero del coach.
 * Cada condición es un flag con 4 estados: no evaluado → normal → observación → presente.
 */

export interface ConditionDef {
  key: string;
  label: string;
  zone: string;
}

export interface ZoneDef {
  key: string;
  label: string;
  color: string;
  conditions: ConditionDef[];
}

export const CONDITION_ZONES: ZoneDef[] = [
  {
    key: 'metabolic', label: 'Metabólico', color: '#EF9F27',
    conditions: [
      { key: 'insulin_resistance', label: 'Resistencia a insulina', zone: 'metabolic' },
      { key: 'diabetes_t1', label: 'Diabetes tipo 1', zone: 'metabolic' },
      { key: 'diabetes_t2', label: 'Diabetes tipo 2', zone: 'metabolic' },
      { key: 'prediabetes', label: 'Prediabetes', zone: 'metabolic' },
      { key: 'metabolic_syndrome', label: 'Síndrome metabólico', zone: 'metabolic' },
      { key: 'nafld', label: 'NAFLD', zone: 'metabolic' },
      { key: 'pcos', label: 'SOP', zone: 'metabolic' },
      { key: 'hypothyroid', label: 'Hipotiroidismo', zone: 'metabolic' },
      { key: 'hyperthyroid', label: 'Hipertiroidismo', zone: 'metabolic' },
      { key: 'hashimoto', label: 'Hashimoto', zone: 'metabolic' },
      { key: 'dyslipidemia', label: 'Dislipidemia', zone: 'metabolic' },
      { key: 'hyperuricemia', label: 'Hiperuricemia', zone: 'metabolic' },
      { key: 'gout', label: 'Gota', zone: 'metabolic' },
      { key: 'obesity', label: 'Obesidad', zone: 'metabolic' },
    ],
  },
  {
    key: 'digestive', label: 'Digestivo', color: '#5B9BD5',
    conditions: [
      { key: 'ibs', label: 'Colon irritable (SII)', zone: 'digestive' },
      { key: 'gerd', label: 'Reflujo (ERGE)', zone: 'digestive' },
      { key: 'gastritis', label: 'Gastritis', zone: 'digestive' },
      { key: 'celiac', label: 'Celiaquía', zone: 'digestive' },
      { key: 'crohn', label: 'Enfermedad de Crohn', zone: 'digestive' },
      { key: 'ulcerative_colitis', label: 'Colitis ulcerativa', zone: 'digestive' },
      { key: 'sibo', label: 'SIBO', zone: 'digestive' },
      { key: 'leaky_gut', label: 'Permeabilidad intestinal', zone: 'digestive' },
      { key: 'h_pylori', label: 'H. pylori', zone: 'digestive' },
      { key: 'constipation', label: 'Estreñimiento crónico', zone: 'digestive' },
      { key: 'dysbiosis', label: 'Disbiosis', zone: 'digestive' },
      { key: 'food_intolerances', label: 'Intolerancias alimentarias', zone: 'digestive' },
      { key: 'lactose_intolerant', label: 'Intolerancia a lactosa', zone: 'digestive' },
      { key: 'gluten_sensitive', label: 'Sensibilidad al gluten', zone: 'digestive' },
    ],
  },
  {
    key: 'hepatic', label: 'Hepático', color: '#D85A30',
    conditions: [
      { key: 'fatty_liver', label: 'Hígado graso', zone: 'hepatic' },
      { key: 'elevated_enzymes', label: 'Enzimas elevadas', zone: 'hepatic' },
      { key: 'hepatitis_b', label: 'Hepatitis B', zone: 'hepatic' },
      { key: 'hepatitis_c', label: 'Hepatitis C', zone: 'hepatic' },
      { key: 'cirrhosis', label: 'Cirrosis', zone: 'hepatic' },
      { key: 'gallstones', label: 'Cálculos biliares', zone: 'hepatic' },
    ],
  },
  {
    key: 'cardiovascular', label: 'Cardiovascular', color: '#E24B4A',
    conditions: [
      { key: 'hypertension', label: 'Hipertensión', zone: 'cardiovascular' },
      { key: 'hypotension', label: 'Hipotensión', zone: 'cardiovascular' },
      { key: 'arrhythmia', label: 'Arritmia', zone: 'cardiovascular' },
      { key: 'heart_disease', label: 'Enfermedad cardíaca', zone: 'cardiovascular' },
      { key: 'atherosclerosis', label: 'Aterosclerosis', zone: 'cardiovascular' },
      { key: 'varicose_veins', label: 'Várices', zone: 'cardiovascular' },
      { key: 'high_homocysteine', label: 'Homocisteína elevada', zone: 'cardiovascular' },
    ],
  },
  {
    key: 'hematologic', label: 'Hematológico', color: '#E24B4A',
    conditions: [
      { key: 'anemia', label: 'Anemia', zone: 'hematologic' },
      { key: 'iron_deficiency', label: 'Deficiencia de hierro', zone: 'hematologic' },
      { key: 'b12_deficiency', label: 'Deficiencia B12', zone: 'hematologic' },
      { key: 'polycythemia', label: 'Policitemia', zone: 'hematologic' },
      { key: 'thrombocytopenia', label: 'Trombocitopenia', zone: 'hematologic' },
      { key: 'coagulation_disorder', label: 'Trastorno de coagulación', zone: 'hematologic' },
    ],
  },
  {
    key: 'renal', label: 'Renal', color: '#1D9E75',
    conditions: [
      { key: 'kidney_stones', label: 'Cálculos renales', zone: 'renal' },
      { key: 'ckd', label: 'Enfermedad renal crónica', zone: 'renal' },
      { key: 'elevated_creatinine', label: 'Creatinina elevada', zone: 'renal' },
      { key: 'proteinuria', label: 'Proteinuria', zone: 'renal' },
      { key: 'uti_recurrent', label: 'Infecciones urinarias recurrentes', zone: 'renal' },
    ],
  },
  {
    key: 'hormonal', label: 'Hormonal / Reproductivo', color: '#D4537E',
    conditions: [
      { key: 'low_testosterone', label: 'Testosterona baja', zone: 'hormonal' },
      { key: 'high_estrogen', label: 'Estrógeno elevado', zone: 'hormonal' },
      { key: 'low_progesterone', label: 'Progesterona baja', zone: 'hormonal' },
      { key: 'high_cortisol', label: 'Cortisol elevado', zone: 'hormonal' },
      { key: 'adrenal_fatigue', label: 'Fatiga adrenal', zone: 'hormonal' },
      { key: 'amenorrhea', label: 'Amenorrea', zone: 'hormonal' },
      { key: 'dysmenorrhea', label: 'Dismenorrea', zone: 'hormonal' },
      { key: 'endometriosis', label: 'Endometriosis', zone: 'hormonal' },
      { key: 'menopause', label: 'Menopausia', zone: 'hormonal' },
      { key: 'perimenopause', label: 'Perimenopausia', zone: 'hormonal' },
      { key: 'erectile_dysfunction', label: 'Disfunción eréctil', zone: 'hormonal' },
      { key: 'infertility', label: 'Infertilidad', zone: 'hormonal' },
      { key: 'low_dhea', label: 'DHEA baja', zone: 'hormonal' },
    ],
  },
  {
    key: 'oncologic', label: 'Oncológico', color: '#7F77DD',
    conditions: [
      { key: 'cancer_active', label: 'Cáncer activo', zone: 'oncologic' },
      { key: 'cancer_remission', label: 'Cáncer en remisión', zone: 'oncologic' },
      { key: 'cancer_history', label: 'Antecedente de cáncer', zone: 'oncologic' },
      { key: 'chemo_current', label: 'En quimioterapia', zone: 'oncologic' },
      { key: 'radiation_current', label: 'En radioterapia', zone: 'oncologic' },
    ],
  },
  {
    key: 'musculoskeletal', label: 'Musculoesquelético', color: '#a8e02a',
    conditions: [
      { key: 'herniated_disc', label: 'Hernia de disco', zone: 'musculoskeletal' },
      { key: 'knee_injury', label: 'Lesión de rodilla', zone: 'musculoskeletal' },
      { key: 'shoulder_injury', label: 'Lesión de hombro', zone: 'musculoskeletal' },
      { key: 'lower_back_pain', label: 'Dolor lumbar crónico', zone: 'musculoskeletal' },
      { key: 'arthritis', label: 'Artritis', zone: 'musculoskeletal' },
      { key: 'osteoporosis', label: 'Osteoporosis', zone: 'musculoskeletal' },
      { key: 'fibromyalgia', label: 'Fibromialgia', zone: 'musculoskeletal' },
      { key: 'tendinitis', label: 'Tendinitis', zone: 'musculoskeletal' },
      { key: 'carpal_tunnel', label: 'Túnel carpiano', zone: 'musculoskeletal' },
      { key: 'plantar_fasciitis', label: 'Fascitis plantar', zone: 'musculoskeletal' },
    ],
  },
  {
    key: 'neurologic', label: 'Neurológico / Mental', color: '#7F77DD',
    conditions: [
      { key: 'anxiety_disorder', label: 'Trastorno de ansiedad', zone: 'neurologic' },
      { key: 'depression', label: 'Depresión', zone: 'neurologic' },
      { key: 'adhd', label: 'TDAH', zone: 'neurologic' },
      { key: 'insomnia', label: 'Insomnio', zone: 'neurologic' },
      { key: 'sleep_apnea', label: 'Apnea del sueño', zone: 'neurologic' },
      { key: 'migraine', label: 'Migraña', zone: 'neurologic' },
      { key: 'neuropathy', label: 'Neuropatía', zone: 'neurologic' },
      { key: 'brain_fog', label: 'Niebla mental', zone: 'neurologic' },
      { key: 'chronic_fatigue', label: 'Fatiga crónica', zone: 'neurologic' },
      { key: 'burnout', label: 'Burnout', zone: 'neurologic' },
      { key: 'ptsd', label: 'TEPT', zone: 'neurologic' },
      { key: 'eating_disorder', label: 'Trastorno alimentario', zone: 'neurologic' },
    ],
  },
  {
    key: 'habits', label: 'Hábitos y Estilo de Vida', color: '#EF9F27',
    conditions: [
      { key: 'smoking', label: 'Tabaquismo', zone: 'habits' },
      { key: 'alcohol_excess', label: 'Exceso de alcohol', zone: 'habits' },
      { key: 'sugar_addiction', label: 'Adicción al azúcar', zone: 'habits' },
      { key: 'processed_food', label: 'Dieta ultra procesada', zone: 'habits' },
      { key: 'sedentary', label: 'Sedentarismo', zone: 'habits' },
      { key: 'poor_sleep', label: 'Mal sueño', zone: 'habits' },
      { key: 'low_water', label: 'Baja hidratación', zone: 'habits' },
      { key: 'high_caffeine', label: 'Exceso de cafeína', zone: 'habits' },
      { key: 'no_sun_exposure', label: 'Sin exposición solar', zone: 'habits' },
      { key: 'screen_addiction', label: 'Exceso de pantallas', zone: 'habits' },
      { key: 'no_exercise', label: 'Sin ejercicio', zone: 'habits' },
      { key: 'chronic_stress', label: 'Estrés crónico', zone: 'habits' },
      { key: 'social_isolation', label: 'Aislamiento social', zone: 'habits' },
    ],
  },
];

export type FlagStatus = 'not_evaluated' | 'normal' | 'observation' | 'present';

export const FLAG_STATUSES: Record<FlagStatus, { label: string; color: string; bgColor: string }> = {
  not_evaluated: { label: 'No evaluado', color: '#666666', bgColor: '#333333' },
  normal: { label: 'Normal', color: '#a8e02a', bgColor: 'rgba(168, 224, 42, 0.1)' },
  observation: { label: 'En observación', color: '#EF9F27', bgColor: 'rgba(239, 159, 39, 0.1)' },
  present: { label: 'Presente', color: '#E24B4A', bgColor: 'rgba(226, 75, 74, 0.15)' },
};

/** Ciclo de estados al hacer tap */
export const NEXT_STATUS: Record<FlagStatus, FlagStatus> = {
  not_evaluated: 'normal',
  normal: 'observation',
  observation: 'present',
  present: 'not_evaluated',
};
