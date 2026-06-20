/**
 * Tipos puros del motor de cuestionarios (sin imports de RN) para que servicios/constantes
 * testeables no arrastren el .tsx (JSX + react-native) al entorno de vitest (node).
 */
export interface TestOption { id: string; text: string }

export interface TestQuestion {
  id: string;
  text: string;
  hint?: string;
  options: TestOption[];
  multi?: boolean;
  optional?: boolean;
}

export type TestAnswers = Record<string, string | string[]>;
