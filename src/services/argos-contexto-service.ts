/**
 * ARGOS Contexto de apertura — el lado con red (HUB-ARGOS, 31-ago-2026).
 *
 * Resuelve el contrato `/argos-chat?contexto=<clave>&ref=<id>` (ver
 * argos-contexto-core) a un bloque de sistema listo para el turno. La única
 * clave que lee la base es `receta`: busca el id primero en `recipes` (el
 * catálogo) y luego en `user_recipes` (las propias), porque la ficha de
 * recetas puede venir de cualquiera de las dos y solo manda el uuid.
 *
 * supabase-js no lanza en 4xx: un `error` en una tabla no es "no existe la
 * receta", es "no pude leer". Aquí las dos se tratan igual (bloque de
 * "no se pudo cargar") porque el modelo no puede hacer nada distinto con la
 * diferencia; lo que sí se distingue es en el log.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import {
  construirInyeccionContexto,
  recetaDesdeCatalogo,
  recetaDesdePropia,
  type ContextoDeApertura,
  type RecetaParaContexto,
} from './argos-contexto-core';

export async function cargarRecetaParaContexto(id: string): Promise<RecetaParaContexto | null> {
  const [cat, propia] = await Promise.allSettled([
    supabase
      .from('recipes')
      .select('name, ingredients, instructions, servings, calories, protein_g, carbs_g, fat_g')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('user_recipes')
      .select('name, ingredients, total_calories, total_protein, total_carbs, total_fat')
      .eq('id', id)
      .maybeSingle(),
  ]);
  if (cat.status === 'fulfilled') {
    if (cat.value.error) logWarn('[argos-contexto] recipes:', cat.value.error.message);
    else if (cat.value.data) return recetaDesdeCatalogo(cat.value.data as Record<string, unknown>);
  } else {
    logWarn('[argos-contexto] recipes rechazó (sin red):', cat.reason);
  }
  if (propia.status === 'fulfilled') {
    if (propia.value.error) logWarn('[argos-contexto] user_recipes:', propia.value.error.message);
    else if (propia.value.data) return recetaDesdePropia(propia.value.data as Record<string, unknown>);
  } else {
    logWarn('[argos-contexto] user_recipes rechazó (sin red):', propia.reason);
  }
  return null;
}

/** El bloque de sistema del contexto de apertura. Nunca lanza. */
export async function resolverInyeccionDeContexto(ctx: ContextoDeApertura): Promise<string> {
  try {
    if (ctx.clave === 'receta' && ctx.ref) {
      const receta = await cargarRecetaParaContexto(ctx.ref);
      return construirInyeccionContexto(ctx, { receta });
    }
    return construirInyeccionContexto(ctx);
  } catch (e) {
    logWarn('[argos-contexto] resolver falló:', e);
    return construirInyeccionContexto(ctx, { receta: null });
  }
}
