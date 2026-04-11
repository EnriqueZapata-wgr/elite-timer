/**
 * Training Methods — Métodos de entrenamiento con auto-regulación de peso.
 *
 * Estándar: sets y reps clásicos.
 * Método 3-5: palancas de fuerza por nivel.
 * EMOM Auto: estrés metabólico con deuda.
 * Myo Reps: activación + sobrecargas hasta fallo.
 */

export const TRAINING_METHODS = {
  standard: {
    id: 'standard',
    name: 'Estándar',
    description: 'Sets y reps clásicos. Tú controlas todo.',
    icon: 'barbell-outline',
    color: '#a8e02a',
  },
  method_3_5: {
    id: 'method_3_5',
    name: 'Método 3-5',
    description: 'Palancas de fuerza. Peso máximo para tu rango de reps.',
    icon: 'flash-outline',
    color: '#fbbf24',
    rules: {
      beginner: { targetReps: 6, hint: 'Si salen 7 → sube peso. Si salen 5 → baja.' },
      intermediate: { targetReps: 4, hint: 'Si salen 5 → sube peso. Si salen 3 → baja.' },
      advanced: { targetReps: 2, hint: 'Si salen 3 → sube peso. Si sale 1 → baja.' },
    },
  },
  emom_auto: {
    id: 'emom_auto',
    name: 'EMOM Auto',
    description: 'Estrés metabólico. Cada minuto X reps. Al final pagas la deuda.',
    icon: 'timer-outline',
    color: '#fb923c',
    rules: {
      beginner: { rounds: 8, targetReps: 8 },
      intermediate: { rounds: 10, targetReps: 10 },
    },
  },
  myo_reps: {
    id: 'myo_reps',
    name: 'Myo Reps',
    description: 'Activación 20 reps + mini sets de 5 con 5 seg descanso hasta fallar.',
    icon: 'flame-outline',
    color: '#ef4444',
    activation: 20,
    overloadReps: 5,
    restSeconds: 5,
    weightRules: {
      tooHeavy: { range: [1, 5], feedback: 'Peso alto. Baja la próxima sesión.' },
      perfect: { range: [6, 9], feedback: 'Peso perfecto. Mantén.' },
      tooLight: { range: [10, 99], feedback: 'Peso bajo. Sube la próxima sesión.' },
    },
  },
} as const;

export type TrainingMethodId = keyof typeof TRAINING_METHODS;
