/**
 * app-tour-core — datos PUROS del welcome tour (MB-10). Sin RN/brand/imágenes
 * (no importa brand.ts: arrastra require() de .jpg y rompe vitest — se espejan
 * los hex con comentario). El componente mapea `imageKey` → require estático.
 *
 * 7 pantallas (una por pilar). La 6ª depende del sexo: Ciclo solo para 'female'
 * (nunca contenido de ciclo a un hombre — doctrina biological_sex de MB-7),
 * Comunidad para el resto.
 */

export type TourImageKey =
  | 'hoy' | 'fitness' | 'nutricion' | 'mente' | 'salud' | 'ciclo' | 'comunidad' | 'tests';

export interface TourStepData {
  kicker: string;
  title: string;
  imageKey: TourImageKey;
  /** Espejo de CATEGORY_COLORS (brand.ts) — no se importa el token aquí. */
  color: string;
}

// Espejo de CATEGORY_COLORS:
const FITNESS = '#A8E02A';
const NUTRITION = '#5B9BD5';
const MIND = '#7F77DD';
const METRICS = '#1D9E75';
const CYCLE = '#D4537E';

export function buildTourSteps(sex?: string | null): TourStepData[] {
  const isFemale = sex === 'female';
  return [
    { kicker: 'HOY', title: 'Tu día, en un solo lugar. Cada acción suma electrones y carga tu momentum.', imageKey: 'hoy', color: FITNESS },
    { kicker: 'FITNESS', title: 'Rutinas y métodos propietarios que se ajustan a ti, no al revés.', imageKey: 'fitness', color: FITNESS },
    { kicker: 'NUTRICIÓN', title: 'Registra por foto o texto. Ayuno, hidratación y suplementos con criterio funcional.', imageKey: 'nutricion', color: NUTRITION },
    { kicker: 'MENTE', title: 'Respira, medita, escribe. Tu sistema nervioso también entrena.', imageKey: 'mente', color: MIND },
    { kicker: 'SALUD', title: 'Tus labs, tu Edad ATP y tu mapa funcional — la raíz, no el síntoma.', imageKey: 'salud', color: METRICS },
    isFemale
      ? { kicker: 'CICLO', title: 'Tu fisiología tiene ventanas que un hombre no tiene. Aprende a aprovecharlas.', imageKey: 'ciclo', color: CYCLE }
      : { kicker: 'COMUNIDAD', title: 'No lo haces solo. La Tribu ATP avanza contigo.', imageKey: 'comunidad', color: MIND },
    { kicker: 'EMPIEZA', title: 'ARGOS ya conoce tus datos. Abre HOY y carga tu primer electrón.', imageKey: 'tests', color: FITNESS },
  ];
}
