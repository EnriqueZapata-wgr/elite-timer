/**
 * ARGOS Configura la app — el escritor (NOCHE-ARGOS Pieza 7).
 *
 * El catálogo planea y veta; hasta ahora nadie aplicaba nada. Aquí se cierra el
 * ciclo: un PlanAjuste aprobado se convierte en una escritura real.
 *
 * LA PUERTA ES ÚNICA Y ES planearAjuste. Este servicio recibe el PLAN, no la
 * clave suelta. Si aceptara clave y valor se saltaría el veto de la lista blanca
 * y la validación del valor, que son justo lo que separa "ARGOS configura la
 * app" de "ARGOS movió algo que nadie pidió".
 *
 * NO IMPROVISA. Si el escritor de un ajuste no está registrado en el puente
 * (porque su provider no montó), falla y lo dice. Escribir el AsyncStorage por
 * detrás cambiaría el disco sin cambiar la pantalla: el usuario vería el toggle
 * en su lugar viejo y creería que ARGOS le mintió.
 *
 * DESPUÉS DE ESCRIBIR SE EMITE EL EVENTO, siempre. Sin eso la pantalla que ya
 * estaba abierta se queda con el valor viejo hasta que alguien la remonte, y el
 * usuario ve un ajuste aplicado que no se aplicó.
 */
import { DeviceEventEmitter } from 'react-native';
import type { PlanAjuste } from './argos-settings-core';
import { escritoresArgos } from './argos-writers-bridge';
import { saveModoDenso, SALUD_DENSO_EVENT } from './salud-denso-store';
import { setNutritionMode } from './nutrition-mode-service';
import { setInsightsEnabled, NUTRITION_INSIGHT_EVENT } from './argos-nutrition-insights';
import { setHabitState } from './hoy/habit-states-service';
import type { ThemeModeSetting } from './theme/theme-mode-core';
import type { NutritionMode } from './nutrition-mode-core';
import type { HabitEstado } from './hoy/habit-states-core';

export interface ContextoAjuste {
  userId: string | null;
  /**
   * Cuál hábito. `habito_estado` es el único ajuste que apunta a UNA cosa del
   * usuario y no a una preferencia global, así que sin esto no se puede aplicar.
   */
  habitKey?: string;
}

export type ResultadoAjuste =
  | { ok: true; mensaje: string }
  | { ok: false; mensaje: string; sugerirPantalla?: string };

/**
 * El catálogo expone "completo" (español de la calle) y el modelo de datos usa
 * 'complete'. Sin este mapa el upsert guarda un valor que la app no entiende.
 */
const MODO_NUTRICION: Readonly<Record<string, NutritionMode>> = {
  simple: 'simple',
  completo: 'complete',
};

function faltaEscritor(etiqueta: string, pantalla: string): ResultadoAjuste {
  return {
    ok: false,
    mensaje: `Ahorita no puedo cambiar ${etiqueta.toLowerCase()} desde aquí. Te dejo la pantalla para que lo muevas tú.`,
    sugerirPantalla: pantalla,
  };
}

/**
 * Aplica un plan ya aprobado. El llamador es responsable de haber confirmado
 * con el usuario: este servicio ya no pregunta, escribe.
 */
export async function aplicarAjuste(
  plan: PlanAjuste,
  ctx: ContextoAjuste,
): Promise<ResultadoAjuste> {
  if (plan.tipo === 'rechazado') return { ok: false, mensaje: plan.motivo };

  const { ajuste, valor } = plan;
  const w = escritoresArgos();

  switch (ajuste.clave) {
    case 'tema': {
      if (!w.setTema) return faltaEscritor(ajuste.etiqueta, ajuste.pantalla);
      w.setTema(valor as ThemeModeSetting);
      return { ok: true, mensaje: `Listo, dejé la app en tema ${valor}.` };
    }

    case 'velo_nocturno': {
      if (!w.setVelo) return faltaEscritor(ajuste.etiqueta, ajuste.pantalla);
      w.setVelo(valor === true);
      return { ok: true, mensaje: valor ? 'Listo, encendí el velo nocturno.' : 'Listo, apagué el velo nocturno.' };
    }

    case 'sonidos':
    case 'vibracion':
    case 'mantener_pantalla_encendida': {
      if (!w.setPreferencia) return faltaEscritor(ajuste.etiqueta, ajuste.pantalla);
      const claves = {
        sonidos: 'soundsEnabled',
        vibracion: 'vibrationEnabled',
        mantener_pantalla_encendida: 'keepAwake',
      } as const;
      w.setPreferencia(claves[ajuste.clave], valor === true);
      return {
        ok: true,
        mensaje: `Listo, ${valor ? 'encendí' : 'apagué'} ${ajuste.etiqueta.toLowerCase()}.`,
      };
    }

    case 'salud_modo_denso': {
      await saveModoDenso(valor === true);
      // El store no emite solo: si esto falta, SALUD abierto se queda con el
      // layout viejo y el cambio parece no haber ocurrido.
      DeviceEventEmitter.emit(SALUD_DENSO_EVENT);
      return {
        ok: true,
        mensaje: valor
          ? 'Listo, SALUD ya te muestra todas las secciones.'
          : 'Listo, SALUD vuelve al resumen corto.',
      };
    }

    case 'insights_nutricion': {
      await setInsightsEnabled(valor === true);
      DeviceEventEmitter.emit(NUTRITION_INSIGHT_EVENT);
      return {
        ok: true,
        mensaje: valor
          ? 'Listo, voy a comentar tus comidas al registrarlas.'
          : 'Listo, ya no comento tus comidas.',
      };
    }

    case 'nutricion_modo': {
      if (!ctx.userId) return { ok: false, mensaje: 'Necesito tu sesión para cambiar eso.' };
      const modo = MODO_NUTRICION[String(valor)];
      if (!modo) return { ok: false, mensaje: `No reconozco el modo "${valor}".` };
      const ok = await setNutritionMode(ctx.userId, modo);
      return ok
        ? { ok: true, mensaje: `Listo, Nutrición queda en modo ${valor}.` }
        : { ok: false, mensaje: 'No pude guardar el cambio. ¿Lo intentamos otra vez?' };
    }

    case 'habito_estado': {
      if (!ctx.userId) return { ok: false, mensaje: 'Necesito tu sesión para cambiar eso.' };
      // A propósito NO se adivina el hábito. Poner en reposo el equivocado le
      // quita del día algo que la persona sí quería hacer, y ese error se
      // descubre tarde: cuando ya no apareció la card.
      if (!ctx.habitKey) {
        return {
          ok: false,
          mensaje: 'Dime cuál hábito y lo cambio. O te abro tu día para que lo elijas ahí.',
          sugerirPantalla: ajuste.pantalla,
        };
      }
      const r = await setHabitState(ctx.userId, ctx.habitKey, valor as HabitEstado);
      return r.ok
        ? { ok: true, mensaje: `Listo, ese hábito queda en ${valor}. No borré nada de tu historial.` }
        : { ok: false, mensaje: 'No pude guardar el cambio. ¿Lo intentamos otra vez?' };
    }

    default:
      // Inalcanzable si el catálogo y este switch están sincronizados. Existe
      // porque agregar una entrada al catálogo sin escritor es un error fácil,
      // y el resultado silencioso sería un ARGOS que dice "listo" sin escribir.
      return { ok: false, mensaje: `Todavía no puedo cambiar ${ajuste.etiqueta.toLowerCase()} por ti.` };
  }
}
