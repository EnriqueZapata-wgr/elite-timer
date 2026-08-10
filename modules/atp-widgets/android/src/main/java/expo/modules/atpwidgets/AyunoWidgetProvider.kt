package expo.modules.atpwidgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * MB-32 · PIEZA 3 — el widget de ayuno. SOLO LECTURA.
 *
 * No es acción, es presencia: el contador corre en un Chronometer nativo
 * (tictac del sistema, sin despertar a la app ni a JS) y la ventana se ve
 * de un vistazo. Abrir y cerrar el ayuno se hace en la app, donde hay
 * contexto para decidir — todo tap aquí lleva a atp://fasting.
 */
class AyunoWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
    for (id in ids) mgr.updateAppWidget(id, buildViews(context))
  }

  companion object {
    fun pushUpdate(context: Context) {
      val mgr = AppWidgetManager.getInstance(context)
      val ids = mgr.getAppWidgetIds(ComponentName(context, AyunoWidgetProvider::class.java))
      for (id in ids) mgr.updateAppWidget(id, buildViews(context))
    }

    private fun openFastingIntent(context: Context): PendingIntent? = try {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("atp://fasting")).apply {
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

    fun buildViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.widget_ayuno)
      val snap = WidgetStore.getSnapshot(context, "ayuno")
      val isLight = WidgetTheme.isLight(context, snap)

      views.setInt(R.id.ayuno_root, "setBackgroundResource", WidgetPalette.bgRes(isLight))
      views.setTextColor(R.id.ayuno_header, WidgetPalette.textSec(isLight))
      views.setTextColor(R.id.ayuno_contador, WidgetPalette.text(isLight))
      views.setTextColor(R.id.ayuno_detalle, WidgetPalette.textSec(isLight))
      views.setTextColor(R.id.ayuno_vacio, WidgetPalette.text(isLight))
      openFastingIntent(context)?.let { views.setOnClickPendingIntent(R.id.ayuno_root, it) }

      val fast = snap?.optJSONObject("fast")
      val signedIn = snap?.optBoolean("signedIn", false) == true
      val active = signedIn && fast != null && fast.optBoolean("active", false)

      if (!active) {
        views.setViewVisibility(R.id.ayuno_contador, View.GONE)
        views.setViewVisibility(R.id.ayuno_detalle, View.GONE)
        views.setViewVisibility(R.id.ayuno_vacio, View.VISIBLE)
        views.setTextViewText(
          R.id.ayuno_vacio,
          context.getString(
            if (signedIn) R.string.widget_ayuno_sin_activo else R.string.widget_abre_atp,
          ),
        )
        return views
      }

      // Contador vivo: Chronometer del sistema — la base se ancla al
      // elapsedRealtime del arranque del ayuno y el tictac es del SO.
      val startMs = try {
        Instant.parse(fast!!.optString("startIso")).toEpochMilli()
      } catch (_: Exception) {
        null
      }
      if (startMs == null) {
        views.setViewVisibility(R.id.ayuno_contador, View.GONE)
        views.setViewVisibility(R.id.ayuno_detalle, View.GONE)
        views.setViewVisibility(R.id.ayuno_vacio, View.VISIBLE)
        views.setTextViewText(R.id.ayuno_vacio, context.getString(R.string.widget_abre_atp))
        return views
      }
      val elapsed = (System.currentTimeMillis() - startMs).coerceAtLeast(0)
      views.setViewVisibility(R.id.ayuno_vacio, View.GONE)
      views.setViewVisibility(R.id.ayuno_contador, View.VISIBLE)
      views.setViewVisibility(R.id.ayuno_detalle, View.VISIBLE)
      views.setChronometer(
        R.id.ayuno_contador,
        SystemClock.elapsedRealtime() - elapsed,
        null,
        true,
      )

      val target = fast.optInt("targetHours", 0)
      val inicio = Instant.ofEpochMilli(startMs).atZone(ZoneId.systemDefault())
        .format(DateTimeFormatter.ofPattern("HH:mm"))
      views.setTextViewText(
        R.id.ayuno_detalle,
        if (target > 0) {
          context.getString(R.string.widget_ayuno_detalle, target, inicio)
        } else {
          context.getString(R.string.widget_ayuno_detalle_sin_meta, inicio)
        },
      )
      return views
    }
  }
}
