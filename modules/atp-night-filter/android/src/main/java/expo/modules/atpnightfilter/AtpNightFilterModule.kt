package expo.modules.atpnightfilter

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * MB-30B Pieza 1 — Puente JS del filtro nocturno (solo Android).
 *
 * Contrato con src/services/night-filter-service.ts (que hace lazy require:
 * en binarios viejos este módulo NO existe y la función degrada fail-soft):
 *  - canDrawOverlays(): ¿el usuario ya concedió la superposición?
 *  - openOverlaySettings(): abre el ajuste del sistema para concederla.
 *    NUNCA se llama al abrir la app: solo cuando el usuario activa la función.
 *  - startFilter(cutoff, end, stopsJson): arranca el servicio foreground.
 *    Devuelve false (sin lanzar) si el permiso no está concedido.
 *  - stopFilter(): apaga el filtro (el mismo efecto que el botón del aviso).
 *  - isFilterRunning(): estado real del servicio.
 *  - consumeStoppedFromNotification(): true UNA vez si el último apagado vino
 *    del aviso persistente — JS lo usa para apagar también la preferencia.
 */
class AtpNightFilterModule : Module() {

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("AtpNightFilter")

    Function("canDrawOverlays") {
      Settings.canDrawOverlays(context)
    }

    Function("openOverlaySettings") {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${context.packageName}"),
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("startFilter") { cutoffMinutes: Int, endMinutes: Int, stopsJson: String ->
      if (!Settings.canDrawOverlays(context)) {
        false
      } else {
        val intent = Intent(context, NightFilterService::class.java).apply {
          action = NightFilterService.ACTION_START
          putExtra(NightFilterService.EXTRA_CUTOFF_MINUTES, cutoffMinutes)
          putExtra(NightFilterService.EXTRA_END_MINUTES, endMinutes)
          putExtra(NightFilterService.EXTRA_STOPS_JSON, stopsJson)
        }
        context.startForegroundService(intent)
        true
      }
    }

    Function("stopFilter") {
      context.stopService(Intent(context, NightFilterService::class.java))
      true
    }

    Function("isFilterRunning") {
      NightFilterService.isRunning
    }

    Function("consumeStoppedFromNotification") {
      val prefs = context.getSharedPreferences(
        NightFilterService.PREFS_NAME,
        Context.MODE_PRIVATE,
      )
      val stopped = prefs.getBoolean(NightFilterService.PREF_STOPPED_BY_NOTIFICATION, false)
      if (stopped) {
        prefs.edit().putBoolean(NightFilterService.PREF_STOPPED_BY_NOTIFICATION, false).apply()
      }
      stopped
    }
  }
}
