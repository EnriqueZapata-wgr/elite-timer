package expo.modules.atpwidgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import java.time.LocalDate
import java.util.Calendar
import org.json.JSONObject

/**
 * MB-32 · PIEZA 1 — el widget de hábitos.
 *
 * Pinta el snapshot que la app empuja (WidgetStore) y NADA más: aquí no hay
 * red ni datos propios. Muestra los hábitos del MOMENTO actual (mañana /
 * tarde / noche, espejo de momentoForHour: <12 / <18), pendientes primero,
 * hasta 4 renglones ("cabe lo que cabe") y un pie con lo que falta del día.
 *
 * Gestos:
 *  - Renglón palomeable -> WidgetTapReceiver (optimista + cola + despertar
 *    JS). Los VERIFICADOS no se palomean jamás desde aquí: su check nace de
 *    actividad real, el tap abre la app.
 *  - Fondo -> abre HOY (la pantalla inicial de la app).
 *  - Sin snapshot o sin sesión -> todo el widget abre la app.
 *
 * Tri-estado MB-26: graduados y en reposo NO vienen en el snapshot (el
 * compile los filtra y buildHabitosSnapshot los vuelve a filtrar).
 */
class HabitosWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
    for (id in ids) mgr.updateAppWidget(id, buildViews(context))
  }

  companion object {
    private val ROW_IDS = intArrayOf(R.id.hab_row1, R.id.hab_row2, R.id.hab_row3, R.id.hab_row4)
    private val CHECK_IDS = intArrayOf(R.id.hab_check1, R.id.hab_check2, R.id.hab_check3, R.id.hab_check4)
    private val NAME_IDS = intArrayOf(R.id.hab_name1, R.id.hab_name2, R.id.hab_name3, R.id.hab_name4)

    fun pushUpdate(context: Context) {
      val mgr = AppWidgetManager.getInstance(context)
      val ids = mgr.getAppWidgetIds(ComponentName(context, HabitosWidgetProvider::class.java))
      for (id in ids) mgr.updateAppWidget(id, buildViews(context))
    }

    /** Espejo de momentoForHour (tareas-core.ts): <12 mañana, <18 tarde. */
    fun momentoForHour(hour: Int): String = when {
      hour < 12 -> "manana"
      hour < 18 -> "tarde"
      else -> "noche"
    }

    private fun momentoLabel(momento: String): String = when (momento) {
      "manana" -> "MAÑANA"
      "tarde" -> "TARDE"
      else -> "NOCHE"
    }

    private fun openAppIntent(context: Context): PendingIntent? {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: return null
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      return PendingIntent.getActivity(
        context, 0, launch,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
    }

    private fun toggleIntent(context: Context, source: String, next: Boolean): PendingIntent {
      val intent = Intent(context, WidgetTapReceiver::class.java).apply {
        action = WidgetTapReceiver.ACTION_TOGGLE_HABIT
        // data única por (source, next): PendingIntents distintos sin pelear
        // por requestCode.
        data = Uri.parse("atpwidget://toggle/$source/$next")
        putExtra(WidgetTapReceiver.EXTRA_SOURCE, source)
        putExtra(WidgetTapReceiver.EXTRA_NEXT, next)
      }
      return PendingIntent.getBroadcast(
        context, 0, intent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
    }

    fun buildViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.widget_habitos)
      val snap = WidgetStore.getSnapshot(context, "habitos")
      val isLight = WidgetTheme.isLight(context, snap)

      views.setInt(R.id.hab_root, "setBackgroundResource", WidgetPalette.bgRes(isLight))
      views.setTextColor(R.id.hab_header, WidgetPalette.textSec(isLight))
      views.setTextColor(R.id.hab_resumen, WidgetPalette.textSec(isLight))
      views.setTextColor(R.id.hab_footer, WidgetPalette.textSec(isLight))
      views.setTextColor(R.id.hab_vacio, WidgetPalette.text(isLight))
      openAppIntent(context)?.let { views.setOnClickPendingIntent(R.id.hab_root, it) }

      val signedIn = snap?.optBoolean("signedIn", false) == true
      val habitsJson = snap?.optJSONArray("habits")
      if (!signedIn || habitsJson == null) {
        // Sin sesión o sin snapshot: el widget no truena — invita a abrir ATP.
        views.setViewVisibility(R.id.hab_vacio, View.VISIBLE)
        views.setTextViewText(R.id.hab_vacio, context.getString(R.string.widget_abre_atp))
        for (row in ROW_IDS) views.setViewVisibility(row, View.GONE)
        views.setViewVisibility(R.id.hab_footer, View.GONE)
        views.setTextViewText(R.id.hab_header, context.getString(R.string.widget_habitos_header_hoy))
        views.setTextViewText(R.id.hab_resumen, "")
        return views
      }

      // Día vencido (el snapshot es de ayer): el set de hábitos sirve, los
      // palomeos de ayer NO — hoy nada está hecho todavía.
      val hoy = LocalDate.now().toString()
      val stale = snap.optString("date") != hoy

      val habits = mutableListOf<JSONObject>()
      for (i in 0 until habitsJson.length()) {
        habitsJson.optJSONObject(i)?.let { habits.add(it) }
      }
      val completed = { h: JSONObject -> !stale && h.optBoolean("completed") }

      val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
      val momento = momentoForHour(hour)
      var delMomento = habits.filter { it.optString("momento") == momento }
      if (delMomento.isEmpty()) delMomento = habits.filter { !completed(it) }
      val ordenados = delMomento.sortedWith(
        compareBy({ completed(it) }, { it.optInt("timeMin", 720) }),
      )

      views.setViewVisibility(R.id.hab_vacio, View.GONE)
      views.setTextViewText(
        R.id.hab_header,
        context.getString(R.string.widget_habitos_header, momentoLabel(momento)),
      )
      val doneDia = habits.count { completed(it) }
      views.setTextViewText(R.id.hab_resumen, "$doneDia/${habits.size}")

      for (i in ROW_IDS.indices) {
        if (i >= ordenados.size) {
          views.setViewVisibility(ROW_IDS[i], View.GONE)
          continue
        }
        val h = ordenados[i]
        val hecho = completed(h)
        views.setViewVisibility(ROW_IDS[i], View.VISIBLE)
        views.setTextViewText(NAME_IDS[i], h.optString("name"))
        views.setTextColor(NAME_IDS[i], if (hecho) WidgetPalette.textSec(isLight) else WidgetPalette.text(isLight))
        views.setImageViewResource(
          CHECK_IDS[i],
          if (hecho) R.drawable.ic_atp_check_on else R.drawable.ic_atp_check_off,
        )
        if (!hecho) views.setInt(CHECK_IDS[i], "setColorFilter", WidgetPalette.checkOff(isLight))
        else views.setInt(CHECK_IDS[i], "setColorFilter", 0)

        val palomeable = h.optBoolean("palomeable", false)
        if (palomeable) {
          views.setOnClickPendingIntent(
            ROW_IDS[i],
            toggleIntent(context, h.optString("key"), !hecho),
          )
        } else {
          // Verificado: su check nace de actividad real — el tap abre la app.
          openAppIntent(context)?.let { views.setOnClickPendingIntent(ROW_IDS[i], it) }
        }
      }

      val pendientesDia = habits.count { !completed(it) }
      val mostrados = minOf(ordenados.size, ROW_IDS.size)
      val pendientesMostrados = ordenados.take(mostrados).count { !completed(it) }
      val restantes = pendientesDia - pendientesMostrados
      if (restantes > 0) {
        views.setViewVisibility(R.id.hab_footer, View.VISIBLE)
        views.setTextViewText(
          R.id.hab_footer,
          context.resources.getQuantityString(R.plurals.widget_habitos_mas, restantes, restantes),
        )
      } else {
        views.setViewVisibility(R.id.hab_footer, View.GONE)
      }
      return views
    }
  }
}
