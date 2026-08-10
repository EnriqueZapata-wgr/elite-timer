package expo.modules.atpwidgets

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * MB-32 — Puente JS de los widgets (solo Android).
 *
 * Contrato con src/services/widgets/widget-bridge.ts (lazy require: en
 * binarios viejos este módulo NO existe y todo degrada fail-soft):
 *  - setSnapshot(kind, json): la app empuja lo que el widget pinta.
 *  - getSnapshot(kind): el snapshot guardado (para parches del drenador).
 *  - getPendingActions(): la cola de taps pendientes (JSON array).
 *  - markActionsHandled(ids): saca de la cola lo ya ejecutado (dedup).
 *  - clearAll(): logout — snapshots y cola fuera, widgets a "Abre ATP".
 *  - refreshWidgets(): repintar con lo guardado.
 *
 * El módulo NO escribe datos: es el buzón entre el widget y el drenador.
 */
class AtpWidgetsModule : Module() {

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AtpWidgets")

    Function("setSnapshot") { kind: String, json: String ->
      WidgetStore.setSnapshot(context, kind, json)
      updateAllProviders(context)
      true
    }

    Function("getSnapshot") { kind: String ->
      WidgetStore.getSnapshotRaw(context, kind)
    }

    Function("getPendingActions") {
      WidgetStore.getQueueJson(context)
    }

    Function("markActionsHandled") { ids: List<String> ->
      WidgetStore.markHandled(context, ids)
      true
    }

    Function("clearAll") {
      WidgetStore.clearAll(context)
      updateAllProviders(context)
      true
    }

    Function("refreshWidgets") {
      updateAllProviders(context)
      true
    }
  }

  companion object {
    /** Las piezas 2 y 3 suman aquí sus providers. */
    fun updateAllProviders(context: Context) {
      HabitosWidgetProvider.pushUpdate(context)
    }
  }
}
