/**
 * display-labels — snake_case técnico → etiqueta legible en español (Mega-Sprint A B1.2).
 *
 * DOCTRINA: los datos internos quedan en snake_case (fuente de verdad); SOLO el
 * render user-facing se legibiliza. Envuelve con `displayLabel()` cualquier key
 * cruda que llegue a la UI (biomarcadores, términos epigenéticos, condiciones,
 * raíces). PURO: sin react-native/supabase → importable desde el motor node-only.
 *
 * Estrategia: (1) separa la nota entre paréntesis para conservarla intacta,
 * (2) busca la key en el mapa curado, (3) si no está, aplica un beautify genérico
 * (guiones bajos → espacios, preservando acrónimos conocidos).
 */

/** Mapa curado: key técnica → label legible. Cubre lo común/feo; el resto cae al beautify. */
export const DISPLAY_LABELS: Record<string, string> = {
  // ── Biomarcadores comunes ──
  hba1c: 'HbA1c',
  'hba1c_%': 'HbA1c',
  glucosa_ayunas: 'glucosa en ayuno',
  glucosa_en_ayuno: 'glucosa en ayuno',
  homa_ir: 'HOMA-IR',
  'homa-ir': 'HOMA-IR',
  pcr: 'PCR',
  pcr_hs: 'PCR (alta sensibilidad)',
  proteina_c_reactiva_cuantitativa_pcr: 'PCR',
  il_6: 'IL-6',
  'il-6': 'IL-6',
  'hrv_rmssd': 'HRV (RMSSD)',
  'hrv_rmssd_ms': 'HRV (RMSSD)',
  'hrv rmssd': 'HRV (RMSSD)',
  'hrv_sdnn_24h': 'HRV (SDNN 24h)',
  '25-oh-vitamina_d': 'vitamina D (25-OH)',
  vitamina_d: 'vitamina D',
  '25_oh_vitamina_d': 'vitamina D (25-OH)',
  presion_arterial_matutina: 'presión arterial matutina',
  presion_arterial: 'presión arterial',
  cortisol_matutino: 'cortisol matutino',
  cortisol_matutino_salival: 'cortisol matutino (salival)',
  cortisol_salival_nocturno: 'cortisol nocturno (salival)',
  b12_metilcobalamina: 'vitamina B12 (metilcobalamina)',
  bdnf_serico: 'BDNF (sérico)',
  ldl_oxidado: 'LDL oxidado',
  trigliceridos: 'triglicéridos',
  apolipoproteinas_b: 'apolipoproteína B (apoB)',
  homocisteina: 'homocisteína',
  ferritina: 'ferritina',
  insulina: 'insulina',
  testosterona_total: 'testosterona total',
  spo2_nadir_tolerado: 'SpO2 mínima tolerada',
  co2_end_tidal: 'CO2 espirado',
  sueño_profundo_horas: 'horas de sueño profundo',
  'sueno_profundo_horas': 'horas de sueño profundo',
  temperatura_corporal_delta: 'variación de temperatura corporal',
  circunferencia_cintura: 'circunferencia de cintura',

  // ── Términos epigenéticos (modulates/activates) ──
  cortisol_ritmo: 'ritmo de cortisol',
  volumen_plasmatico: 'volumen plasmático',
  cortisol_ritmo_matutino: 'ritmo de cortisol matutino',
  latencia_sueño: 'latencia del sueño',
  'latencia_sueno': 'latencia del sueño',
  sensibilidad_insulina: 'sensibilidad a la insulina',
  tono_vagal: 'tono vagal',
  estres_oxidativo: 'estrés oxidativo',

  // ── Raíces / sistemas ──
  digestion_estres_autonomico: 'digestión por estrés',
  ritmo_circadiano_desregulado: 'ritmo circadiano desregulado',
  resistencia_insulina: 'resistencia a la insulina',
  insulin_resistance: 'resistencia a la insulina',
  cortisol_matutino_bajo: 'cortisol matutino bajo',
  inflamacion_silenciosa: 'inflamación silenciosa',
  deficit_sueno_profundo: 'déficit de sueño profundo',

  // ── Condiciones Fx en inglés → español (B1.3) ──
  hashimoto: 'Hashimoto',
  hypertension: 'hipertensión',
  knee_injury: 'lesión de rodilla',
  adhd: 'TDAH',
  insomnia: 'insomnio',
  anxiety_disorder: 'trastorno de ansiedad',
  alcohol_excess: 'exceso de alcohol',
  sugar_addiction: 'adicción al azúcar',
  processed_food: 'comida procesada',
  poor_sleep: 'sueño de mala calidad',
  no_sun_exposure: 'baja exposición solar',
  no_exercise: 'falta de ejercicio',
  chronic_stress: 'estrés crónico',
  sedentarism: 'sedentarismo',
  sleep_deprivation: 'privación de sueño',
};

/**
 * Beautify genérico para keys sin entrada en el mapa: guiones bajos → espacios.
 * Preserva mayúsculas/acrónimos existentes (no re-castea tokens ya en PRESERVE).
 */
function beautify(key: string): string {
  if (!key.includes('_')) return key; // ya legible (o acrónimo simple)
  return key.split('_').join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Etiqueta legible de una key técnica. Conserva la nota entre paréntesis
 * ("cortisol_ritmo (amplifica CAR)" → "ritmo de cortisol (amplifica CAR)").
 */
export function displayLabel(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Separa "key (nota...)" para legibilizar solo la key y conservar la nota.
  const parenIdx = trimmed.indexOf(' (');
  const main = parenIdx > 0 ? trimmed.slice(0, parenIdx) : trimmed;
  const note = parenIdx > 0 ? trimmed.slice(parenIdx) : '';

  const key = main.toLowerCase();
  const mapped = DISPLAY_LABELS[key];
  const legible = mapped ?? beautify(main);

  return `${legible}${note}`;
}

/** Legibiliza una lista (biomarcadores por tier, etc.). */
export function displayLabels(raws: string[]): string[] {
  return raws.map(displayLabel);
}
