/**
 * sexo-core — el sexo biológico del perfil como lo entiende la matriz V7/V6.
 *
 * 2026-09-21 (SEXO NUNCA ASUMIDO). Regla de la casa: nunca cambiar en
 * silencio el dato de una persona, y un rango calculado con un sexo asumido
 * es exactamente eso. Durante meses diez sitios resolvían el sexo con
 * `=== 'female' ? 'female' : 'male'` o `?? 'male'`: cualquier cosa que no
 * fuera exactamente 'female' (NULL, fila ausente, 'intersex', una consulta
 * que falló) caía a hombre y se calculaba con la matriz equivocada. Medido
 * sobre las dos pacientes del Excel, eso le sumaba 3.20 años de Edad ATP a
 * la de 28 y 1.64 a la de 65.
 *
 * Aquí vive el único traductor: solo 'male' y 'female' son sexo; todo lo
 * demás es null, y con null NO se calcula nada por sexo. Quien pinta dice
 * que falta el sexo en el perfil y manda a `/profile`, donde ya existe la
 * UI para capturarlo. Nunca 'male' ni 'female' por defecto.
 *
 * Módulo puro: sin react-native ni supabase, para que corra en node.
 */
import type { Sex } from '@/src/types/edad-atp-v2';

/** `biological_sex` tal como lo guarda `client_profiles`; null si falta o no es binario. */
export function sexoDePerfil(valor: unknown): Sex | null {
  return valor === 'male' || valor === 'female' ? valor : null;
}

/** Copy de rangos (labs, lectura, reportes) cuando falta el sexo. Honesto y con destino. */
export const AVISO_FALTA_SEXO_RANGOS = 'Para leer tus rangos falta tu sexo en tu perfil';

/** Copy de Edad ATP cuando falta el sexo. */
export const AVISO_FALTA_SEXO_EDAD = 'Para calcular tu Edad ATP falta tu sexo en tu perfil';

/** Copy cuando el perfil no se pudo leer (regla 7: distinto de "no hay"). */
export const AVISO_PERFIL_ILEGIBLE = 'No se pudo leer tu perfil. Vuelve a intentar en un momento';

/** Donde ya existe la UI para capturar el sexo (literal: expo-router tiene typedRoutes). */
export const RUTA_PERFIL = '/profile' as const;

/** Etiqueta del botón que acompaña al aviso. */
export const ACCION_COMPLETAR_PERFIL = 'Completar mi perfil';

/** Etiqueta del botón cuando el perfil NO se pudo leer: se relanza la lectura. */
export const ACCION_REINTENTAR = 'Reintentar';

/**
 * Qué acción acompaña a un aviso de sexo (ronda de arreglos, regla 7). Un
 * perfil ilegible pide REINTENTAR la lectura, no ir a /profile a capturar un
 * dato que quizá ya está. Solo cuando de verdad falta el sexo se manda a
 * completar el perfil.
 */
export function accionDeAviso(aviso: string): { label: string; reintentar: boolean } {
  return aviso === AVISO_PERFIL_ILEGIBLE
    ? { label: ACCION_REINTENTAR, reintentar: true }
    : { label: ACCION_COMPLETAR_PERFIL, reintentar: false };
}

/**
 * Género gramatical del copy ("agradecido/a", "a ti mismo/a") según el sexo
 * del perfil. Sin sexo, la forma NEUTRA: nunca el masculino por defecto.
 */
export function conGenero(sexo: Sex | null | undefined, masculino: string, femenino: string, neutro: string): string {
  if (sexo === 'male') return masculino;
  if (sexo === 'female') return femenino;
  return neutro;
}

/**
 * Para los adaptadores que alimentan al motor (que exige `Sex`): el
 * orquestador intercepta el null ANTES y devuelve `faltaSexo`; si algo llega
 * aquí con null es un bug de cableado, y se dice con un error claro en vez
 * de calcular con un sexo inventado.
 */
export function exigirSexo(sexo: Sex | null | undefined, contexto: string): Sex {
  if (sexo !== 'male' && sexo !== 'female') {
    throw new Error(`[${contexto}] ${AVISO_FALTA_SEXO_EDAD}`);
  }
  return sexo;
}
