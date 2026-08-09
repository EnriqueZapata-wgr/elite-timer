package expo.modules.atpnightfilter

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import org.json.JSONArray
import java.util.Calendar

/**
 * MB-30B Pieza 1 — Servicio foreground del filtro nocturno.
 *
 * Dibuja un View de color encima de TODO el teléfono (TYPE_APPLICATION_OVERLAY,
 * lo que usa Twilight) con una progresión ámbar → naranja → rojo anclada a la
 * hora de corte de pantallas del usuario (screen_time_cutoff).
 *
 * Doctrina del brief:
 *  - El overlay NUNCA captura toques (FLAG_NOT_TOUCHABLE): el teléfono sigue
 *    siendo 100% usable con el filtro puesto.
 *  - El aviso persistente (la notificación del foreground service) no
 *    desaparece mientras el filtro está activo y SIEMPRE trae el botón
 *    "Apagar filtro" — apagable de un toque desde cualquier pantalla.
 *  - Si el permiso de superposición se revoca a media ejecución, el servicio
 *    se detiene solo (no cuelga, no re-pide nada).
 *  - La rampa de color viene de JS (night-filter-core.ts es la fuente única);
 *    aquí solo se interpola. Si no llegan stops, hay un fallback idéntico.
 */
class NightFilterService : Service() {

  companion object {
    const val ACTION_START = "expo.modules.atpnightfilter.action.START"
    const val ACTION_STOP = "expo.modules.atpnightfilter.action.STOP"
    const val EXTRA_CUTOFF_MINUTES = "cutoffMinutes"
    const val EXTRA_END_MINUTES = "endMinutes"
    const val EXTRA_STOPS_JSON = "stopsJson"

    const val CHANNEL_ID = "atp_night_filter"
    const val NOTIFICATION_ID = 30301

    const val PREFS_NAME = "atp_night_filter"
    const val PREF_STOPPED_BY_NOTIFICATION = "stopped_by_notification"

    @Volatile
    var isRunning = false
      private set
  }

  private var overlayView: View? = null
  private var windowManager: WindowManager? = null
  private val handler = Handler(Looper.getMainLooper())

  // Defaults espejo de NIGHT_FILTER_RAMP en src/services/night-filter-core.ts
  private var cutoffMinutes = 21 * 60 + 45 // fallback canónico '21:45' (tareas-core)
  private var endMinutes = 5 * 60          // 05:00 — la mañana apaga el filtro
  private var stopOffsets = intArrayOf(-60, 0, 60)
  private var stopColors = intArrayOf(0x1AFFBF00, 0x38FF8C00.toInt(), 0x57FF3C00.toInt())

  private val tick = object : Runnable {
    override fun run() {
      applyCurrentState()
      if (isRunning) handler.postDelayed(this, nextDelayMs())
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        // Apagado desde el aviso persistente: se marca para que JS apague
        // también la preferencia (que el "off" de un toque sea permanente).
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
          .edit().putBoolean(PREF_STOPPED_BY_NOTIFICATION, true).apply()
        stopSelf()
        return START_NOT_STICKY
      }
      ACTION_START -> {
        cutoffMinutes = intent.getIntExtra(EXTRA_CUTOFF_MINUTES, cutoffMinutes)
        endMinutes = intent.getIntExtra(EXTRA_END_MINUTES, endMinutes)
        intent.getStringExtra(EXTRA_STOPS_JSON)?.let { parseStops(it) }
      }
    }

    if (!Settings.canDrawOverlays(this)) {
      // Sin permiso el filtro no puede existir: honesto, fuera.
      stopSelf()
      return START_NOT_STICKY
    }

    startInForeground()
    isRunning = true
    handler.removeCallbacks(tick)
    handler.post(tick)
    return START_STICKY
  }

  override fun onDestroy() {
    isRunning = false
    handler.removeCallbacks(tick)
    removeOverlay()
    super.onDestroy()
  }

  // ── Rampa ────────────────────────────────────────────────────────────────

  private fun parseStops(json: String) {
    try {
      val arr = JSONArray(json)
      if (arr.length() < 2) return
      val offsets = IntArray(arr.length())
      val colors = IntArray(arr.length())
      for (i in 0 until arr.length()) {
        val o = arr.getJSONObject(i)
        offsets[i] = o.getInt("at")
        colors[i] = o.getLong("argb").toInt()
      }
      stopOffsets = offsets
      stopColors = colors
    } catch (_: Exception) {
      // JSON malformado → se queda el fallback espejo. Nunca tumbar el servicio.
    }
  }

  /** Minutos relativos al corte, normalizados a (-720, 720]. */
  private fun relMinutesNow(): Int {
    val cal = Calendar.getInstance()
    val now = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
    var rel = ((now - cutoffMinutes) % 1440 + 1440) % 1440
    if (rel > 720) rel -= 1440
    return rel
  }

  private fun endRelMinutes(): Int =
    ((endMinutes - cutoffMinutes) % 1440 + 1440) % 1440

  private fun isActiveAt(rel: Int): Boolean =
    rel >= stopOffsets.first() && rel <= endRelMinutes()

  /** Interpolación lineal por canal ARGB entre stops, con clamp en los extremos. */
  private fun colorAt(rel: Int): Int {
    if (rel <= stopOffsets.first()) return stopColors.first()
    if (rel >= stopOffsets.last()) return stopColors.last()
    for (i in 1 until stopOffsets.size) {
      if (rel <= stopOffsets[i]) {
        val span = (stopOffsets[i] - stopOffsets[i - 1]).coerceAtLeast(1)
        val t = (rel - stopOffsets[i - 1]).toFloat() / span
        return lerpArgb(stopColors[i - 1], stopColors[i], t)
      }
    }
    return stopColors.last()
  }

  private fun lerpArgb(from: Int, to: Int, t: Float): Int {
    fun ch(shift: Int): Int {
      val a = (from shr shift) and 0xFF
      val b = (to shr shift) and 0xFF
      return (a + ((b - a) * t)).toInt().coerceIn(0, 255)
    }
    return (ch(24) shl 24) or (ch(16) shl 16) or (ch(8) shl 8) or ch(0)
  }

  // ── Estado por tick ──────────────────────────────────────────────────────

  private fun applyCurrentState() {
    if (!Settings.canDrawOverlays(this)) {
      // Permiso revocado a media ejecución → apagado honesto.
      stopSelf()
      return
    }
    val rel = relMinutesNow()
    if (isActiveAt(rel)) {
      showOverlay(colorAt(rel))
      updateNotification(activo = true)
    } else {
      removeOverlay()
      updateNotification(activo = false)
    }
  }

  private fun nextDelayMs(): Long {
    val rel = relMinutesNow()
    if (isActiveAt(rel)) return 60_000L
    // Fuera de ventana: despertar cuando arranque la rampa (tope 30 min por
    // si cambia la hora del sistema).
    val minutesToStart = ((stopOffsets.first() - rel) % 1440 + 1440) % 1440
    return (minutesToStart.coerceAtMost(30)) * 60_000L + 1_000L
  }

  // ── Overlay ──────────────────────────────────────────────────────────────

  private fun showOverlay(color: Int) {
    try {
      if (overlayView == null) {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val view = View(this)
        val params = WindowManager.LayoutParams(
          WindowManager.LayoutParams.MATCH_PARENT,
          WindowManager.LayoutParams.MATCH_PARENT,
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
          WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
            or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
            or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
            or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
            or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
          PixelFormat.TRANSLUCENT,
        )
        params.gravity = Gravity.TOP or Gravity.START
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          params.layoutInDisplayCutoutMode =
            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        windowManager?.addView(view, params)
        overlayView = view
      }
      overlayView?.setBackgroundColor(color)
    } catch (_: Exception) {
      // BadTokenException / SecurityException: sin overlay no hay filtro.
      stopSelf()
    }
  }

  private fun removeOverlay() {
    val view = overlayView ?: return
    overlayView = null
    try {
      windowManager?.removeView(view)
    } catch (_: Exception) {
      // Ya no estaba montado: nada que hacer.
    }
  }

  // ── Aviso persistente ────────────────────────────────────────────────────

  private fun startInForeground() {
    createChannel()
    val notification = buildNotification(activo = isActiveAt(relMinutesNow()))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun createChannel() {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Filtro nocturno",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Aviso persistente mientras el filtro nocturno está encendido"
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(activo: Boolean): Notification {
    val stopIntent = Intent(this, NightFilterService::class.java).setAction(ACTION_STOP)
    val stopPending = PendingIntent.getService(
      this, 1, stopIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentPending = launchIntent?.let {
      PendingIntent.getActivity(this, 2, it, PendingIntent.FLAG_IMMUTABLE)
    }
    val cutoffLabel = String.format("%02d:%02d", cutoffMinutes / 60, cutoffMinutes % 60)
    return Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_atp_night_filter)
      .setContentTitle(if (activo) "Filtro nocturno activo" else "Filtro nocturno en espera")
      .setContentText(
        if (activo) "Tu pantalla se va calentando hacia el rojo. Apágalo cuando quieras."
        else "Se enciende solo alrededor de tu corte de pantallas ($cutoffLabel).",
      )
      .setOngoing(true)
      .setContentIntent(contentPending)
      .addAction(
        Notification.Action.Builder(null, "Apagar filtro", stopPending).build(),
      )
      .build()
  }

  private fun updateNotification(activo: Boolean) {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(NOTIFICATION_ID, buildNotification(activo))
  }
}
