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
import java.util.Locale

/**
 * MB-32 · PIEZA 2 — el widget de agua.
 *
 * Cuánto llevas, cuánto te falta y el botón de +250. El botón encola
 * add_water y el drenador ejecuta por addWater (hydration-service), el
 * MISMO writer que la card de HOY y que la acción de notificación de
 * MB-30B. Mismo camino, cero excepciones.
 *
 * El fondo abre la pantalla de hidratación (atp://hydration). Día vencido
 * en el snapshot = hoy no has tomado nada: se pinta 0.
 */
class AguaWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
    for (id in ids) mgr.updateAppWidget(id, buildViews(context))
  }

  companion object {
    fun pushUpdate(context: Context) {
      val mgr = AppWidgetManager.getInstance(context)
      val ids = mgr.getAppWidgetIds(ComponentName(context, AguaWidgetProvider::class.java))
      for (id in ids) mgr.updateAppWidget(id, buildViews(context))
    }

    /** Espejo de fmtQuant('water') del day-compiler: 1.2L / 850ml. */
    fun formatMl(ml: Int): String =
      if (ml >= 1000) String.format(Locale.US, "%.1fL", ml / 1000.0) else "${ml}ml"

    private fun openHydrationIntent(context: Context): PendingIntent? = try {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("atp://hydration")).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      PendingIntent.getActivity(
        context, 0, intent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
    } catch (_: Exception) {
      null
    }

    private fun addWaterIntent(context: Context, ml: Int): PendingIntent {
      val intent = Intent(context, WidgetTapReceiver::class.java).apply {
        action = WidgetTapReceiver.ACTION_ADD_WATER
        data = Uri.parse("atpwidget://water/$ml")
        putExtra(WidgetTapReceiver.EXTRA_ML, ml)
      }
      return PendingIntent.getBroadcast(
        context, 0, intent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
    }

    fun buildViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.widget_agua)
      val snap = WidgetStore.getSnapshot(context, "agua")
      val isLight = WidgetTheme.isLight(context, snap)

      views.setInt(R.id.agua_root, "setBackgroundResource", WidgetPalette.bgRes(isLight))
      views.setTextColor(R.id.agua_header, WidgetPalette.textSec(isLight))
      views.setTextColor(R.id.agua_actual, WidgetPalette.text(isLight))
      views.setTextColor(R.id.agua_meta, WidgetPalette.textSec(isLight))
      views.setTextColor(R.id.agua_vacio, WidgetPalette.text(isLight))
      openHydrationIntent(context)?.let { views.setOnClickPendingIntent(R.id.agua_root, it) }

      val water = snap?.optJSONObject("water")
      val signedIn = snap?.optBoolean("signedIn", false) == true
      if (!signedIn || water == null) {
        views.setViewVisibility(R.id.agua_vacio, View.VISIBLE)
        views.setTextViewText(R.id.agua_vacio, context.getString(R.string.widget_abre_atp))
        views.setViewVisibility(R.id.agua_cuerpo, View.GONE)
        views.setViewVisibility(R.id.agua_boton, View.GONE)
        return views
      }

      val stale = snap.optString("date") != LocalDate.now().toString()
      val current = if (stale) 0 else water.optInt("current", 0)
      val target = water.optInt("target", 2500)

      views.setViewVisibility(R.id.agua_vacio, View.GONE)
      views.setViewVisibility(R.id.agua_cuerpo, View.VISIBLE)
      views.setViewVisibility(R.id.agua_boton, View.VISIBLE)
      views.setTextViewText(R.id.agua_actual, formatMl(current))
      val falta = target - current
      views.setTextViewText(
        R.id.agua_meta,
        if (falta > 0) {
          context.getString(R.string.widget_agua_meta, formatMl(target), formatMl(falta))
        } else {
          context.getString(R.string.widget_agua_meta_lograda, formatMl(target))
        },
      )
      views.setProgressBar(
        R.id.agua_progreso, 100,
        if (target > 0) ((current * 100) / target).coerceIn(0, 100) else 0,
        false,
      )
      views.setOnClickPendingIntent(R.id.agua_boton, addWaterIntent(context, 250))
      return views
    }
  }
}
