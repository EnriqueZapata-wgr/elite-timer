package expo.modules.atpwidgets

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * MB-32 — el almacén compartido de los widgets (SharedPreferences).
 *
 * Guarda TRES cosas, todas JSON en texto:
 *  - snap_<kind>: el snapshot que la app (JS) empuja y el widget pinta.
 *  - queue: la cola de acciones pendientes que los taps encolan y el
 *    drenador de JS ejecuta por los writers canónicos (pieza 0).
 *  - handled: anillo de ids ya atendidos (dedup del replay en frío,
 *    misma doctrina que markResponseHandled de MB-30B).
 *
 * Aquí NO hay red, NO hay Supabase y NO hay decisiones de ledger: es un
 * buzón. Todo read-modify-write va @Synchronized para que un tap y el
 * drenador no se pisen la cola.
 */
object WidgetStore {
  const val PREFS_NAME = "atp_widgets_store"
  private const val KEY_SNAP_PREFIX = "snap_"
  private const val KEY_QUEUE = "queue"
  private const val KEY_HANDLED = "handled"
  private const val MAX_QUEUE = 100
  private const val MAX_HANDLED = 200

  private fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  // ── Snapshots ──

  fun getSnapshotRaw(context: Context, kind: String): String? =
    prefs(context).getString(KEY_SNAP_PREFIX + kind, null)

  fun getSnapshot(context: Context, kind: String): JSONObject? {
    val raw = getSnapshotRaw(context, kind) ?: return null
    return try {
      JSONObject(raw)
    } catch (_: Exception) {
      null
    }
  }

  @Synchronized
  fun setSnapshot(context: Context, kind: String, json: String) {
    prefs(context).edit().putString(KEY_SNAP_PREFIX + kind, json).apply()
  }

  /** Logout: fuera snapshots y cola — el widget queda en "Abre ATP". */
  @Synchronized
  fun clearAll(context: Context) {
    prefs(context).edit().clear().apply()
  }

  // ── Cola de acciones (el buzón del candado) ──

  fun getQueueJson(context: Context): String =
    prefs(context).getString(KEY_QUEUE, null) ?: "[]"

  @Synchronized
  fun enqueueAction(context: Context, action: JSONObject) {
    val queue = try {
      JSONArray(getQueueJson(context))
    } catch (_: Exception) {
      JSONArray()
    }
    if (queue.length() >= MAX_QUEUE) return // tope defensivo: eso ya es un bug
    queue.put(action)
    prefs(context).edit().putString(KEY_QUEUE, queue.toString()).apply()
  }

  /** Saca esos ids de la cola y los suma al anillo de atendidos. */
  @Synchronized
  fun markHandled(context: Context, ids: List<String>) {
    if (ids.isEmpty()) return
    val idSet = ids.toHashSet()
    val queue = try {
      JSONArray(getQueueJson(context))
    } catch (_: Exception) {
      JSONArray()
    }
    val restante = JSONArray()
    for (i in 0 until queue.length()) {
      val item = queue.optJSONObject(i) ?: continue
      if (!idSet.contains(item.optString("id"))) restante.put(item)
    }
    val handled = try {
      JSONArray(prefs(context).getString(KEY_HANDLED, null) ?: "[]")
    } catch (_: Exception) {
      JSONArray()
    }
    for (id in ids) handled.put(id)
    // Anillo: los más viejos salen para que esto jamás crezca sin freno.
    val recortado = if (handled.length() > MAX_HANDLED) {
      val r = JSONArray()
      for (i in (handled.length() - MAX_HANDLED) until handled.length()) r.put(handled.get(i))
      r
    } else handled
    prefs(context).edit()
      .putString(KEY_QUEUE, restante.toString())
      .putString(KEY_HANDLED, recortado.toString())
      .apply()
  }

  // ── Optimista (el tap pinta de inmediato; la verdad llega del drenador) ──

  /**
   * Marca un hábito en el snapshot local para que el widget pinte el cambio
   * al instante. NO es una escritura de datos: el registro real lo hace JS
   * por persistBooleanToggle; si falla, el drenador revierte este flag.
   */
  @Synchronized
  fun applyHabitOptimistic(context: Context, source: String, next: Boolean) {
    val snap = getSnapshot(context, "habitos") ?: return
    val habits = snap.optJSONArray("habits") ?: return
    var done = 0
    for (i in 0 until habits.length()) {
      val h = habits.optJSONObject(i) ?: continue
      if (h.optString("key") == source) h.put("completed", next)
      if (h.optBoolean("completed")) done += 1
    }
    snap.put("done", done)
    setSnapshot(context, "habitos", snap.toString())
  }

  /**
   * Suma optimista de agua (pieza 2). Igual que el hábito: solo pinta; el
   * total REAL llega del drenador (addWater devuelve el total del día).
   */
  @Synchronized
  fun applyWaterOptimistic(context: Context, ml: Int) {
    val snap = getSnapshot(context, "agua") ?: return
    val water = snap.optJSONObject("water") ?: return
    water.put("current", (water.optInt("current", 0) + ml).coerceAtLeast(0))
    setSnapshot(context, "agua", snap.toString())
  }
}
