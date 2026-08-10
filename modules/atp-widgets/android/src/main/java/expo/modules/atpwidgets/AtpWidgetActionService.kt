package expo.modules.atpwidgets

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * MB-32 — el despertador del runtime de JS.
 *
 * HeadlessJsTaskService: si la app está viva reutiliza su ReactContext (el
 * mismo runtime, la misma cadena del candado del día); si está muerta,
 * levanta el bundle sin Activity. En ambos casos corre la tarea
 * 'AtpWidgetActions' registrada en index.js, que drena la cola por los
 * writers canónicos. allowedInForeground=true: UN solo camino de despertar,
 * esté la app donde esté (el drenador es idempotente y serializado).
 */
class AtpWidgetActionService : HeadlessJsTaskService() {

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig =
    HeadlessJsTaskConfig(TASK_NAME, Arguments.createMap(), TIMEOUT_MS, true)

  companion object {
    const val TASK_NAME = "AtpWidgetActions"
    const val TIMEOUT_MS = 30_000L
  }
}
