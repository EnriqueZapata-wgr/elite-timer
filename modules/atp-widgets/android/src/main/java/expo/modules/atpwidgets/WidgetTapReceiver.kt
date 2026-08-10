package expo.modules.atpwidgets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import java.util.UUID
import org.json.JSONObject

/**
 * MB-32 — el receptor de taps de los widgets. EL CANDADO EN ACCIÓN:
 *
 *   1. Pinta optimista (el cambio se ve de inmediato en el widget).
 *   2. Encola la acción en WidgetStore — NUNCA escribe datos: no conoce
 *      Supabase ni al ledger.
 *   3. Despierta al runtime de JS (AtpWidgetActionService). El drenador de
 *      widget-actions.ts ejecuta por los writers canónicos (pieza 0) y
 *      corrige el snapshot si algo falló.
 *
 * Si el servicio no puede arrancar (restricción del sistema), el plan B del
 * brief: abrir la app medio segundo para que ELLA escriba — la cola ya
 * quedó guardada y el replay del arranque la drena.
 */
class WidgetTapReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_TOGGLE_HABIT -> {
        val source = intent.getStringExtra(EXTRA_SOURCE) ?: return
        val next = intent.getBooleanExtra(EXTRA_NEXT, true)
        WidgetStore.applyHabitOptimistic(context, source, next)
        HabitosWidgetProvider.pushUpdate(context)
        enqueue(context, JSONObject().apply {
          put("id", UUID.randomUUID().toString())
          put("kind", "toggle_habit")
          put("source", source)
          put("next", next)
        })
      }
      ACTION_ADD_WATER -> {
        val ml = intent.getIntExtra(EXTRA_ML, 0)
        if (ml <= 0) return
        WidgetStore.applyWaterOptimistic(context, ml)
        AguaWidgetProvider.pushUpdate(context)
        enqueue(context, JSONObject().apply {
          put("id", UUID.randomUUID().toString())
          put("kind", "add_water")
          put("ml", ml)
        })
      }
    }
  }

  private fun enqueue(context: Context, action: JSONObject) {
    WidgetStore.enqueueAction(context, action)
    wakeJs(context)
  }

  companion object {
    const val ACTION_TOGGLE_HABIT = "com.atpperformance.app.widget.TOGGLE_HABIT"
    const val ACTION_ADD_WATER = "com.atpperformance.app.widget.ADD_WATER"
    const val EXTRA_SOURCE = "source"
    const val EXTRA_NEXT = "next"
    const val EXTRA_ML = "ml"

    fun wakeJs(context: Context) {
      try {
        context.startService(Intent(context, AtpWidgetActionService::class.java))
        HeadlessJsTaskService.acquireWakeLockNow(context)
      } catch (e: Exception) {
        // Plan B del brief: mejor abrir la app medio segundo que inventar
        // un camino propio a la base. La cola ya está guardada.
        try {
          context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(it)
          }
        } catch (_: Exception) {
          // Sin launcher intent no hay nada que hacer: el replay del
          // próximo arranque drena la cola.
        }
      }
    }
  }
}
