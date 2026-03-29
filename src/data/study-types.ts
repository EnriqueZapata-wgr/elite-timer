/**
 * Catálogo de tipos de estudio clínico.
 */

export interface StudyType {
  key: string;
  label: string;
  emoji: string;
  category: 'imaging' | 'endoscopic' | 'cardiac' | 'gynecologic' | 'other';
}

export const STUDY_TYPES: StudyType[] = [
  // Imagen
  { key: 'ultrasound', label: 'Ultrasonido', emoji: '🔊', category: 'imaging' },
  { key: 'mri', label: 'Resonancia magnética', emoji: '🧲', category: 'imaging' },
  { key: 'ct_scan', label: 'Tomografía', emoji: '📡', category: 'imaging' },
  { key: 'xray', label: 'Radiografía', emoji: '☢️', category: 'imaging' },
  { key: 'densitometry', label: 'Densitometría ósea', emoji: '🦴', category: 'imaging' },
  { key: 'mammography', label: 'Mastografía', emoji: '🩺', category: 'imaging' },

  // Endoscópico
  { key: 'endoscopy', label: 'Endoscopia', emoji: '🔬', category: 'endoscopic' },
  { key: 'colonoscopy', label: 'Colonoscopia', emoji: '🔬', category: 'endoscopic' },

  // Cardíaco
  { key: 'ecg', label: 'Electrocardiograma', emoji: '💓', category: 'cardiac' },
  { key: 'echocardiogram', label: 'Ecocardiograma', emoji: '💓', category: 'cardiac' },
  { key: 'stress_test', label: 'Prueba de esfuerzo', emoji: '🏃', category: 'cardiac' },
  { key: 'holter', label: 'Holter', emoji: '📊', category: 'cardiac' },

  // Ginecológico
  { key: 'papanicolaou', label: 'Papanicolaou', emoji: '🔬', category: 'gynecologic' },
  { key: 'colposcopy', label: 'Colposcopia', emoji: '🔬', category: 'gynecologic' },
  { key: 'pelvic_ultrasound', label: 'Ultrasonido pélvico', emoji: '🔊', category: 'gynecologic' },

  // Otros
  { key: 'spirometry', label: 'Espirometría', emoji: '🫁', category: 'other' },
  { key: 'audiometry', label: 'Audiometría', emoji: '👂', category: 'other' },
  { key: 'ophthalmologic_study', label: 'Estudio oftalmológico', emoji: '👁️', category: 'other' },
  { key: 'sleep_study', label: 'Estudio de sueño', emoji: '😴', category: 'other' },
  { key: 'biopsy', label: 'Biopsia', emoji: '🔬', category: 'other' },
  { key: 'allergy_test', label: 'Prueba de alergias', emoji: '🤧', category: 'other' },
  { key: 'genetic_test', label: 'Estudio genético', emoji: '🧬', category: 'other' },
  { key: 'microbiome', label: 'Microbioma', emoji: '🦠', category: 'other' },
  { key: 'other', label: 'Otro estudio', emoji: '📄', category: 'other' },
];

export function getStudyType(key: string): StudyType {
  return STUDY_TYPES.find(s => s.key === key) || { key: 'other', label: 'Otro', emoji: '📄', category: 'other' };
}

export const STUDY_CATEGORIES: { key: string; label: string }[] = [
  { key: 'imaging', label: 'Imagen' },
  { key: 'endoscopic', label: 'Endoscópico' },
  { key: 'cardiac', label: 'Cardíaco' },
  { key: 'gynecologic', label: 'Ginecológico' },
  { key: 'other', label: 'Otros' },
];
