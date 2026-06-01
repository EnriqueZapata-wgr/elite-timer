// Coach Engine — tipos compartidos
// Brief §11 — Patrones técnicos recomendados.

export type Principle =
  | 'fisiologia' | 'biomecanica' | 'mecanismos_biologicos'
  | 'identidad' | 'proposito' | 'filosofia' | 'estandar' | 'contexto';

export type EvidenceLevel = 1 | 2 | 3 | 4 | 5;

export type TrafficLight = 'verde' | 'amarillo' | 'rojo';

export type CascadeLevel = 1 | 2 | 3 | 4 | 5;

export type BrakeType = 'no_saber' | 'miedo' | 'energia_biologica' | 'apatia';

export type RedFlagCategory =
  | 'sistemica_aguda' | 'dolor_alarma' | 'cronico_degenerativa'
  | 'marcador_fisiologico_clinico' | 'salud_mental' | 'otra';

export type RedFlagLifecyclePhase = 'active' | 'en_seguimiento' | 'silente';

export type CoachInsightChannel =
  | 'chat' | 'briefing' | 'post_action' | 'weekly_review' | 'alert';

export interface CoachVoiceConfig {
  user_id: string;
  tone?: string;
  formality_level?: number;
  emotional_distance?: number;
  vocabulary_preference?: string;
  commitment_level?: number;
  experience_level?: number;
  self_assessment_capacity?: number;
  language_default?: string;
}
