/**
 * Tipos para el flujo de onboarding v2.
 */

// === Steps ===
export type OnboardingStep =
  | null
  | 'basics'
  | 'goal'
  | 'chronotype'
  | 'health'
  | 'nutrition'
  | 'context'
  | 'completed';

// === Questions ===
export type QuestionType = 'single_select' | 'multi_select' | 'scale';

export interface QuestionOption {
  id: string;
  text: string;
  icon?: string;
  scores?: Record<string, number>;
}

export interface OnboardingQuestion {
  id: string;
  text: string;
  subtitle?: string;
  type: QuestionType;
  options: QuestionOption[];
  /** Para scale: min y max */
  scaleMin?: number;
  scaleMax?: number;
}

export interface OnboardingBlock {
  key: string;
  title: string;
  stepLabel: string;
  stepNumber: number;
  totalSteps: number;
  questions: OnboardingQuestion[];
}

// === Answers ===
export type SingleAnswer = string;
export type MultiAnswer = string[];
export type ScaleAnswer = number;
export type Answer = SingleAnswer | MultiAnswer | ScaleAnswer;

export type BlockAnswers = Record<string, Answer>;

// === Insights ===
export interface InsightData {
  title: string;
  description: string;
  icon: string;
  color: string;
}

// === Detected Issues (Block 3) ===
export type FunctionalIssue =
  | 'insulin_resistance'
  | 'adrenal_fatigue'
  | 'gut_dysbiosis'
  | 'chronic_inflammation'
  | 'high_stress'
  | 'sleep_disruption'
  | 'hormonal_imbalance';

export interface FunctionalFlags {
  [key: string]: number; // 0-100 score per issue
}

// === Summary Profile ===
export interface OnboardingProfile {
  name: string;
  chronotype: string;
  chronotypeEmoji: string;
  primaryGoal: string;
  fitnessLevel: string;
  mealPattern: string;
  timeAvailable: string;
  equipment: string[];
  detectedIssues: { key: FunctionalIssue; label: string; severity: 'low' | 'medium' | 'high' }[];
  recommendedProtocols: string[];
}
