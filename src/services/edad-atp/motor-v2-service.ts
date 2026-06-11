/**
 * Motor v2 — orquestador (hoja `8_MOTOR_Resultado`).
 * Flujo: 5 edades ciegas → anclaje a cronológica por confiabilidad → promedio
 * ponderado → modulador de hábitos → cap [20,100].
 *
 * PURO y verificado contra los 4 fixtures (edad_atp_integral ±1e-4):
 *   H1 47.46, H2 27.27, M1 22.40, M2 73.79.
 */
import {
  MOTOR_V2_PESOS_AREAS as PESOS,
  MOTOR_V2_FACTORES_ANCLAJE as ANCLAJE,
  MOTOR_V2_CAPS as CAPS,
  anclarEdad,
  type MotorAreaKey,
} from '@/src/constants/edad-atp-motor-v2-config';
import type { MotorAreaResult, MotorV2Input, MotorV2Result } from '@/src/types/motor-edad-atp-v2';
import { computeAreaLabs } from './area-labs-service';
import { computeAreaComposicion } from './area-composicion-service';
import { computeAreaFitness } from './area-fitness-service';
import { computeAreaCognicion } from './area-cognicion-service';
import { computeAreaRiesgos } from './area-riesgos-service';
import { computeHabitosModulador } from './habitos-modulador-service';

export function computeMotorV2(input: MotorV2Input): MotorV2Result {
  const cron = input.chronological_age;

  const ciegas = {
    labs: computeAreaLabs(input),
    composicion: computeAreaComposicion(input),
    fitness: computeAreaFitness(input),
    cognicion: computeAreaCognicion(input),
    riesgos: computeAreaRiesgos(input),
  } as const;

  const areas = {} as Record<MotorAreaKey, MotorAreaResult>;
  let pre = 0;
  for (const key of Object.keys(PESOS) as MotorAreaKey[]) {
    const c = ciegas[key];
    const ajustada = anclarEdad(c.edad_ciega, cron, ANCLAJE[key]);
    areas[key] = {
      ...c,
      edad_ajustada: ajustada,
      peso: PESOS[key],
      factor_anclaje: ANCLAJE[key],
    };
    pre += ajustada * PESOS[key];
  }

  const habitos = computeHabitosModulador(input);
  const conMod = pre * habitos.factor;
  const integral = Math.max(CAPS.min, Math.min(CAPS.max, conMod));

  return {
    edad_atp_integral: integral,
    cronologica: cron,
    delta_anos: cron - integral,
    areas,
    habitos: { score: habitos.score, factor: habitos.factor },
    edad_pre_modulador: pre,
    capped: conMod < CAPS.min || conMod > CAPS.max,
  };
}
