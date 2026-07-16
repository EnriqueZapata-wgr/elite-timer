/**
 * Fixtures de fenotipo sintético para los tests del motor (arquitectura §8).
 * DX en el vocabulario REAL del catálogo ('metabolismo','estres','circadiano',
 * 'sueno','digestion','inflamacion','cardiovascular','cognitivo',...).
 */
import type { UserPhenotype, DXLevel, UserLab } from '../personalize-types';

const NOW = new Date('2026-07-15T12:00:00Z');

function dx(system: string, level: 1 | 2 | 3 | 4 | 5): DXLevel {
  return { system: system as any, level, computedAt: NOW, confidence: 'high' };
}
function lab(marker: string, value: number, unit: string, tier: 1 | 2 | 3): UserLab {
  return { marker, value, unit, measuredAt: NOW, tier, source: 'user_upload' };
}

function base(): UserPhenotype {
  return {
    userId: 'test',
    dxLevels: [],
    braverman: null,
    labs: [],
    quizAnswers: [],
    chronotype: null,
    cyclePhase: null,
    profile: {
      age: 35, gender: 'male', pregnancy: false, lactancia: false,
      conditions: [], medications: [], goals: [],
    },
    fetchedAt: NOW,
  };
}

// A · Hombre 45 sedentario obesidad grado 1.
export const PROFILE_A: UserPhenotype = {
  ...base(),
  userId: 'A',
  dxLevels: [dx('metabolismo', 1), dx('mitocondrial', 2), dx('sueno', 3), dx('energia', 2)],
  braverman: { dopamine: 'low', acetylcholine: 'medium', gaba: 'medium', serotonin: 'medium', computedAt: NOW },
  labs: [
    lab('HbA1c', 6.1, '%', 1), lab('insulina', 15, 'µU/mL', 2), lab('HOMA-IR', 3.2, '', 2),
    lab('trigliceridos', 180, 'mg/dL', 1), lab('HDL', 38, 'mg/dL', 1), lab('PCR', 2.3, 'mg/L', 1),
  ],
  profile: { ...base().profile, age: 45, gender: 'male', conditions: ['obesidad_grado_1'], goals: ['bajar_grasa', 'mas_energia'] },
};

// B · Mujer 34 folicular biohacker principiante.
export const PROFILE_B: UserPhenotype = {
  ...base(),
  userId: 'B',
  dxLevels: [dx('circadiano', 2), dx('estres', 3), dx('sueno', 3), dx('inflamacion', 3), dx('metabolismo', 3)],
  braverman: { dopamine: 'low', acetylcholine: 'low', gaba: 'medium', serotonin: 'medium', computedAt: NOW },
  labs: [lab('PCR', 1.8, 'mg/L', 1), lab('vitamina_d', 25, 'ng/mL', 1), lab('cortisol_matutino', 22, 'µg/dL', 2)],
  chronotype: { type: 'oso', transitionalState: null, wakeTime: '07:00', sleepTime: '23:00', peakFocusWindow: ['10:00', '14:00'], computedAt: NOW },
  cyclePhase: { currentPhase: 'follicular', cycleDay: 8, cycleLength: 28, lastPeriodStart: new Date('2026-07-07'), regularity: 'regular' },
  profile: { ...base().profile, age: 34, gender: 'female', goals: ['mas_energia', 'foco_concentracion'] },
};

// C · Misma mujer, fase lútea día 22.
export const PROFILE_C: UserPhenotype = {
  ...PROFILE_B,
  userId: 'C',
  cyclePhase: { currentPhase: 'luteal', cycleDay: 22, cycleLength: 28, lastPeriodStart: new Date('2026-06-24'), regularity: 'regular' },
};

// D · Adulto mayor 68 sarcopenia inicial.
export const PROFILE_D: UserPhenotype = {
  ...base(),
  userId: 'D',
  dxLevels: [dx('composicion_corporal', 2), dx('cardiovascular', 3), dx('cognitivo', 4), dx('movimiento', 2), dx('metabolismo', 3)],
  labs: [lab('HbA1c', 5.8, '%', 1), lab('apoB', 110, 'mg/dL', 2), lab('DHEA-S', 40, 'µg/dL', 2)],
  profile: { ...base().profile, age: 68, gender: 'male', conditions: ['sarcopenia_inicial'], goals: ['ganar_musculo', 'longevidad'] },
};

// E · Embarazada 2do trimestre.
export const PROFILE_E: UserPhenotype = {
  ...base(),
  userId: 'E',
  dxLevels: [dx('metabolismo', 3), dx('estres', 3), dx('sueno', 3)],
  profile: { ...base().profile, age: 31, gender: 'female', pregnancy: true, conditions: ['embarazo_2do_trimestre'], goals: ['vitalidad_general'] },
  cyclePhase: null,
};

// F · Fiebre viral activa (sobre perfil B-like masculino sano).
export const PROFILE_F: UserPhenotype = {
  ...base(),
  userId: 'F',
  dxLevels: [dx('inflamacion', 2), dx('inmunologico', 2), dx('energia', 2)],
  profile: { ...base().profile, age: 30, gender: 'male', feverViralActive: true, goals: ['vitalidad_general'] },
};
