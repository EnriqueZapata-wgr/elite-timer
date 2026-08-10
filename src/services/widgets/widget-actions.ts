/**
 * MB-32 — el DRENADOR de acciones del widget (la única mano que ejecuta).
 *
 * ⚠️ LEDGER — REGLA DURA (la misma de notification-actions.ts): lo que el
 * widget encoló entra por EXACTAMENTE los mismos writers que la UI:
 *   - toggle_habit → persistBooleanToggle (tarea-actions; candado del día:
 *                    serializado + lectura fresca — pieza 0)
 *   - add_water    → addWater (hydration-service, el writer de la card de
 *                    HOY y de la acción de notificación de MB-30B)
 * Aquí NO se toca supabase.from: una ruta paralela = ledger roto (test de
 * mutación que truena).
 *
 * Llega por tres puertas, todas al MISMO runtime y la misma cadena:
 *   1. HeadlessJsTaskService (tap con la app muerta o viva — registrado en
 *      index.js como 'AtpWidgetActions').
 *   2. Replay al arrancar la app (WidgetSyncBridge), doctrina del cold
 *      start de MB-30B: mejor tarde que por ruta paralela.
 *   3. AppState → active (belt para taps que el servicio no alcanzó).
 *
 * Resultado REAL, no intención: si el writer falla, el optimista del widget
 * se revierte y la acción se descarta con log (nada de reintentos infinitos
 * pintando un palomeo que no existe).
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { persistBooleanToggle } from '@/src/services/hoy/tarea-actions';
import { addWater } from '@/src/services/hydration-service';
import { parseWidgetActions, planDrain } from '@/src/services/widgets/widget-actions-core';
import { getWidgetsNative, type NativeAtpWidgets } from '@/src/services/widgets/widget-bridge';
import {
  patchHabitCompleted,
  patchWaterDelta,
  patchWaterTotal,
  snapshotSignedOut,
} from '@/src/services/widgets/widget-snapshot-core';

let drenando: Promise<{ ejecutadas: number }> | null = null;

/** Un solo drenado en vuelo por runtime; los demás se cuelgan del mismo. */
export function drainWidgetActions(): Promise<{ ejecutadas: number }> {
  if (!drenando) {
    drenando = drain().finally(() => {
      drenando = null;
    });
  }
  return drenando;
}

function patchSnapshot(native: NativeAtpWidgets, source: string, completed: boolean): void {
  try {
    const parchado = patchHabitCompleted(native.getSnapshot('habitos'), source, completed);
    if (parchado) native.setSnapshot('habitos', parchado);
  } catch { /* el snapshot completo llega con el próximo compile */ }
}

async function drain(): Promise<{ ejecutadas: number }> {
  const native = getWidgetsNative();
  if (!native) return { ejecutadas: 0 };

  let acciones;
  try {
    acciones = parseWidgetActions(native.getPendingActions());
  } catch {
    return { ejecutadas: 0 };
  }
  if (acciones.length === 0) return { ejecutadas: 0 };

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id ?? null;
  if (!userId) {
    // Sin sesión el widget NO escribe (test 6): la cola muere (esas acciones
    // ya no son de nadie) y el widget invita a abrir la app.
    native.markActionsHandled(acciones.map((a) => a.id));
    try {
      native.setSnapshot('habitos', JSON.stringify(snapshotSignedOut()));
    } catch { /* fail-soft */ }
    return { ejecutadas: 0 };
  }

  const plan = planDrain(acciones, new Set<string>());
  const planIds = new Set(plan.map((p) => p.id));
  // Lo colapsado/duplicado se marca atendido sin ejecutarse.
  const obsoletas = acciones.filter((a) => !planIds.has(a.id)).map((a) => a.id);
  if (obsoletas.length > 0) native.markActionsHandled(obsoletas);

  let ejecutadas = 0;
  for (const a of plan) {
    try {
      if (a.kind === 'toggle_habit') {
        // Mapa vacío a propósito: el candado del día (pieza 0) mezcla sobre
        // lectura FRESCA; {} solo sembraría el primer write del día.
        await persistBooleanToggle(userId, a.source, a.next, {});
        patchSnapshot(native, a.source, a.next);
      } else {
        const total = await addWater(userId, a.ml);
        if (total == null) throw new Error('addWater devolvió null');
        // El total REAL del día manda sobre el optimista del widget.
        try {
          const parchado = patchWaterTotal(native.getSnapshot('agua'), total);
          if (parchado) native.setSnapshot('agua', parchado);
        } catch { /* el snapshot completo llega con el próximo compile */ }
      }
      ejecutadas += 1;
    } catch (e) {
      logWarn('[widget-actions] acción falló; se revierte el optimista y se descarta', {
        kind: a.kind,
        error: e,
      });
      if (a.kind === 'toggle_habit') {
        patchSnapshot(native, a.source, !a.next);
      } else {
        try {
          const revertido = patchWaterDelta(native.getSnapshot('agua'), -a.ml);
          if (revertido) native.setSnapshot('agua', revertido);
        } catch { /* fail-soft */ }
      }
    } finally {
      native.markActionsHandled([a.id]);
    }
  }
  try {
    native.refreshWidgets();
  } catch { /* fail-soft */ }
  return { ejecutadas };
}

/** La tarea headless registrada en index.js (AppRegistry). */
export async function runWidgetActionsTask(): Promise<void> {
  try {
    await drainWidgetActions();
  } catch (e) {
    logWarn('[widget-actions] headless task failed', e);
  }
}
