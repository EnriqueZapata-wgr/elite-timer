/**
 * Catálogo de síntomas aislados quick-tap (SALUD F5).
 *
 * Síntomas frecuentes de medicina funcional para los chips de registro rápido
 * en app/salud/sintomas.tsx. El user también puede escribir texto libre — este
 * catálogo NO limita, solo acelera. Los tags se guardan tal cual (texto) en
 * clinical_symptoms_aislados.tag (migración 174, peso BAJO en el DX).
 *
 * ⚠️ NO confundir con functional-systems.ts (síntomas clasificados por sistema,
 * clinical_symptoms, peso MEDIO). Los aislados son deliberadamente sin sistema.
 */
export const SINTOMAS_QUICK_TAGS: readonly string[] = [
  'Fatiga',
  'Niebla mental',
  'Dolor de cabeza',
  'Inflamación abdominal',
  'Insomnio',
  'Antojos de azúcar',
  'Estreñimiento',
  'Diarrea',
  'Reflujo / acidez',
  'Ansiedad',
  'Irritabilidad',
  'Dolor articular',
  'Dolor muscular',
  'Mareo',
  'Palpitaciones',
  'Congestión nasal',
  'Erupción en la piel',
  'Desperté cansado',
] as const;

/** Longitud máxima del tag (texto libre) — misma para nota corta. */
export const SINTOMA_TAG_MAX_LEN = 60;
export const SINTOMA_NOTE_MAX_LEN = 280;
