/**
 * Catálogo de condiciones médicas por zona — Tablero del coach.
 * Cada condición es un flag con 4 estados: no evaluado → normal → observación → presente.
 */
import { ATP_BRAND, CATEGORY_COLORS, SEMANTIC } from '../constants/brand';

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
    key: 'metabolic', label: 'Metabólico', color: SEMANTIC.warning,
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
      { key: 'vitamin_d_deficiency', label: 'Deficiencia de vitamina D', zone: 'metabolic' },
      { key: 'magnesium_deficiency', label: 'Deficiencia de magnesio', zone: 'metabolic' },
    ],
  },
  {
    key: 'digestive', label: 'Digestivo', color: CATEGORY_COLORS.nutrition,
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
      { key: 'esophagitis', label: 'Esofagitis', zone: 'digestive' },
      { key: 'hiatal_hernia', label: 'Hernia hiatal', zone: 'digestive' },
      { key: 'gastric_ulcer', label: 'Úlcera gástrica', zone: 'digestive' },
      { key: 'duodenal_ulcer', label: 'Úlcera duodenal', zone: 'digestive' },
      { key: 'diverticulitis', label: 'Diverticulitis', zone: 'digestive' },
      { key: 'hemorrhoids', label: 'Hemorroides', zone: 'digestive' },
      { key: 'anal_fissure', label: 'Fisura anal', zone: 'digestive' },
      { key: 'pancreatitis', label: 'Pancreatitis', zone: 'digestive' },
      { key: 'gastroparesis', label: 'Gastroparesia', zone: 'digestive' },
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
    key: 'cardiovascular', label: 'Cardiovascular', color: SEMANTIC.error,
    conditions: [
      { key: 'hypertension', label: 'Hipertensión', zone: 'cardiovascular' },
      { key: 'hypotension', label: 'Hipotensión', zone: 'cardiovascular' },
      { key: 'arrhythmia', label: 'Arritmia', zone: 'cardiovascular' },
      { key: 'heart_disease', label: 'Enfermedad cardíaca', zone: 'cardiovascular' },
      { key: 'atherosclerosis', label: 'Aterosclerosis', zone: 'cardiovascular' },
      { key: 'varicose_veins', label: 'Várices', zone: 'cardiovascular' },
      { key: 'high_homocysteine', label: 'Homocisteína elevada', zone: 'cardiovascular' },
      { key: 'peripheral_artery', label: 'Enfermedad arterial periférica', zone: 'cardiovascular' },
      { key: 'dvt_history', label: 'Antecedente de TVP', zone: 'cardiovascular' },
      { key: 'raynaud', label: 'Fenómeno de Raynaud', zone: 'cardiovascular' },
    ],
  },
  {
    key: 'hematologic', label: 'Hematológico', color: SEMANTIC.error,
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
    key: 'renal', label: 'Renal', color: CATEGORY_COLORS.metrics,
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
      { key: 'low_estrogen', label: 'Estrógenos bajos', zone: 'hormonal' },
      { key: 'high_prolactin', label: 'Hiperprolactinemia', zone: 'hormonal' },
      { key: 'hypogonadism', label: 'Hipogonadismo', zone: 'hormonal' },
      { key: 'gynecomastia', label: 'Ginecomastia', zone: 'hormonal' },
      { key: 'hyperandrogenism', label: 'Hiperandrogenismo', zone: 'hormonal' },
      { key: 'thyroid_nodules', label: 'Nódulos tiroideos', zone: 'hormonal' },
      { key: 'adrenal_insufficiency', label: 'Insuficiencia adrenal', zone: 'hormonal' },
      { key: 'cushing', label: 'Síndrome de Cushing', zone: 'hormonal' },
    ],
  },
  {
    key: 'oncologic', label: 'Oncológico', color: CATEGORY_COLORS.mind,
    conditions: [
      { key: 'cancer_active', label: 'Cáncer activo', zone: 'oncologic' },
      { key: 'cancer_remission', label: 'Cáncer en remisión', zone: 'oncologic' },
      { key: 'cancer_history', label: 'Antecedente de cáncer', zone: 'oncologic' },
      { key: 'chemo_current', label: 'En quimioterapia', zone: 'oncologic' },
      { key: 'radiation_current', label: 'En radioterapia', zone: 'oncologic' },
    ],
  },
  {
    key: 'musculoskeletal', label: 'Musculoesquelético', color: ATP_BRAND.lime,
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
      { key: 'knee_osteoarthritis', label: 'Osteoartritis de rodilla', zone: 'musculoskeletal' },
      { key: 'hip_osteoarthritis', label: 'Osteoartritis de cadera', zone: 'musculoskeletal' },
      { key: 'acl_tear', label: 'LCA roto', zone: 'musculoskeletal' },
      { key: 'acl_reconstructed', label: 'LCA reconstruido', zone: 'musculoskeletal' },
      { key: 'meniscus_tear', label: 'Lesión de menisco', zone: 'musculoskeletal' },
      { key: 'rotator_cuff', label: 'Manguito rotador', zone: 'musculoskeletal' },
      { key: 'sciatica', label: 'Ciática', zone: 'musculoskeletal' },
      { key: 'scoliosis', label: 'Escoliosis', zone: 'musculoskeletal' },
      { key: 'hip_labral_tear', label: 'Labrum de cadera', zone: 'musculoskeletal' },
      { key: 'ankle_sprain_chronic', label: 'Esguince crónico de tobillo', zone: 'musculoskeletal' },
      { key: 'cervical_pain', label: 'Dolor cervical crónico', zone: 'musculoskeletal' },
      { key: 'hip_replacement', label: 'Prótesis de cadera', zone: 'musculoskeletal' },
      { key: 'knee_replacement', label: 'Prótesis de rodilla', zone: 'musculoskeletal' },
      { key: 'epicondylitis', label: 'Epicondilitis (codo)', zone: 'musculoskeletal' },
      { key: 'hallux_valgus', label: 'Hallux valgus (juanete)', zone: 'musculoskeletal' },
    ],
  },
  {
    key: 'neurologic', label: 'Neurológico / Mental', color: CATEGORY_COLORS.mind,
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
      { key: 'vertigo', label: 'Vértigo/Mareo crónico', zone: 'neurologic' },
      { key: 'tinnitus', label: 'Tinnitus', zone: 'neurologic' },
      { key: 'restless_legs', label: 'Piernas inquietas', zone: 'neurologic' },
      { key: 'ocd', label: 'TOC', zone: 'neurologic' },
      { key: 'bipolar', label: 'Trastorno bipolar', zone: 'neurologic' },
      { key: 'autism_spectrum', label: 'Espectro autista', zone: 'neurologic' },
      { key: 'seizure_disorder', label: 'Epilepsia/Convulsiones', zone: 'neurologic' },
      { key: 'tremor', label: 'Temblor esencial', zone: 'neurologic' },
    ],
  },
  {
    key: 'ophthalmologic', label: 'Oftalmológico', color: '#4ECDC4',
    conditions: [
      { key: 'cataracts', label: 'Cataratas', zone: 'ophthalmologic' },
      { key: 'glaucoma', label: 'Glaucoma', zone: 'ophthalmologic' },
      { key: 'macular_degeneration', label: 'Degeneración macular', zone: 'ophthalmologic' },
      { key: 'diabetic_retinopathy', label: 'Retinopatía diabética', zone: 'ophthalmologic' },
      { key: 'dry_eye', label: 'Ojo seco crónico', zone: 'ophthalmologic' },
      { key: 'myopia_high', label: 'Miopía alta', zone: 'ophthalmologic' },
      { key: 'astigmatism', label: 'Astigmatismo severo', zone: 'ophthalmologic' },
      { key: 'keratoconus', label: 'Queratocono', zone: 'ophthalmologic' },
    ],
  },
  {
    key: 'respiratory', label: 'Respiratorio', color: '#77B5D9',
    conditions: [
      { key: 'asthma', label: 'Asma', zone: 'respiratory' },
      { key: 'copd', label: 'EPOC', zone: 'respiratory' },
      { key: 'chronic_rhinitis', label: 'Rinitis crónica', zone: 'respiratory' },
      { key: 'sinusitis_chronic', label: 'Sinusitis crónica', zone: 'respiratory' },
      { key: 'deviated_septum', label: 'Tabique desviado', zone: 'respiratory' },
      { key: 'sleep_related_breathing', label: 'Respiración alterada durante sueño', zone: 'respiratory' },
      { key: 'allergies_respiratory', label: 'Alergias respiratorias', zone: 'respiratory' },
    ],
  },
  {
    key: 'dermatologic', label: 'Dermatológico', color: '#F4A261',
    conditions: [
      { key: 'acne', label: 'Acné', zone: 'dermatologic' },
      { key: 'psoriasis', label: 'Psoriasis', zone: 'dermatologic' },
      { key: 'eczema', label: 'Eczema/Dermatitis', zone: 'dermatologic' },
      { key: 'vitiligo', label: 'Vitiligo', zone: 'dermatologic' },
      { key: 'alopecia', label: 'Alopecia', zone: 'dermatologic' },
      { key: 'rosacea', label: 'Rosácea', zone: 'dermatologic' },
      { key: 'urticaria_chronic', label: 'Urticaria crónica', zone: 'dermatologic' },
      { key: 'skin_tags', label: 'Acrocordones', zone: 'dermatologic' },
      { key: 'acanthosis', label: 'Acantosis nigricans', zone: 'dermatologic' },
    ],
  },
  {
    key: 'urologic', label: 'Urológico', color: '#B8860B',
    conditions: [
      { key: 'bph', label: 'Hiperplasia prostática', zone: 'urologic' },
      { key: 'prostatitis', label: 'Prostatitis', zone: 'urologic' },
      { key: 'overactive_bladder', label: 'Vejiga hiperactiva', zone: 'urologic' },
      { key: 'stress_incontinence', label: 'Incontinencia de esfuerzo', zone: 'urologic' },
      { key: 'varicocele', label: 'Varicocele', zone: 'urologic' },
    ],
  },
  {
    key: 'habits', label: 'Hábitos y Estilo de Vida', color: SEMANTIC.warning,
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
  normal: { label: 'Normal', color: SEMANTIC.success, bgColor: 'rgba(168, 224, 42, 0.1)' },
  observation: { label: 'En observación', color: SEMANTIC.warning, bgColor: 'rgba(239, 159, 39, 0.1)' },
  present: { label: 'Presente', color: SEMANTIC.error, bgColor: 'rgba(226, 75, 74, 0.15)' },
};

/** Ciclo de estados al hacer tap */
export const NEXT_STATUS: Record<FlagStatus, FlagStatus> = {
  not_evaluated: 'normal',
  normal: 'observation',
  observation: 'present',
  present: 'not_evaluated',
};
