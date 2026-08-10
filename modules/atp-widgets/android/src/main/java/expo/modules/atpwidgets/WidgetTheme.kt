package expo.modules.atpwidgets

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import java.util.Calendar
import org.json.JSONObject

/**
 * MB-32 — el tema del widget, espejo de theme-mode-core.ts (MB-31A).
 *
 * El widget vive fuera del runtime de JS, así que la resolución de los
 * cuatro modos del manual 3.7b se replica aquí con la MISMA semántica
 * (hay test de contrato en JS que lee este archivo):
 *   claro      -> siempre acero.
 *   oscuro     -> siempre oscuro. Default de quien no elige y de todo dato raro.
 *   adaptativo -> claro entre despertar y corte (la ventana puede cruzar
 *                 medianoche; ventana degenerada = oscuro).
 *   sistema    -> el ajuste dia/noche del telefono; sin dato -> oscuro.
 *
 * El snapshot trae mode + despertarMin + corteMin resueltos por la app.
 */
object WidgetTheme {

  fun nowMinutes(): Int {
    val cal = Calendar.getInstance()
    return cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
  }

  /** Espejo exacto de adaptiveKindAt (theme-mode-core.ts). */
  fun adaptiveIsLight(nowMin: Int, despertarMin: Int, corteMin: Int): Boolean {
    if (despertarMin == corteMin) return false
    val now = ((nowMin % 1440) + 1440) % 1440
    return if (despertarMin < corteMin) {
      now >= despertarMin && now < corteMin
    } else {
      now >= despertarMin || now < corteMin
    }
  }

  /** true = acero (claro). Espejo de resolveThemeKind (theme-mode-core.ts). */
  fun isLight(context: Context, snapshot: JSONObject?): Boolean {
    val theme = snapshot?.optJSONObject("theme")
    return when (theme?.optString("mode") ?: "oscuro") {
      "claro" -> true
      "adaptativo" -> adaptiveIsLight(
        nowMinutes(),
        theme?.optInt("despertarMin", 420) ?: 420,
        theme?.optInt("corteMin", 1290) ?: 1290,
      )
      "sistema" -> {
        val night = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        night == Configuration.UI_MODE_NIGHT_NO
      }
      else -> false
    }
  }
}

/**
 * La paleta del manual de marca (cap. 3), en los DOS temas. El widget vive
 * sobre el fondo del usuario: fondo solido siempre (nunca transparente) y
 * el lima con la disciplina de siempre (uno o dos elementos, jamas texto
 * en claro: relleno con negro encima, 13.36 AAA).
 */
object WidgetPalette {
  val LIME: Int = Color.parseColor("#A8E02A")
  val ON_LIME: Int = Color.parseColor("#000000")

  // Oscuro (manual 3.5): lienzo negro puro, texto blanco / #888888.
  val DARK_TEXT: Int = Color.parseColor("#FFFFFF")
  val DARK_TEXT_SEC: Int = Color.parseColor("#888888")
  val DARK_CHECK_OFF: Int = Color.parseColor("#888888")

  // Claro ACERO (manual 3.6): texto #0F1518 / #4A555C; tenue solo grande.
  val LIGHT_TEXT: Int = Color.parseColor("#0F1518")
  val LIGHT_TEXT_SEC: Int = Color.parseColor("#4A555C")
  val LIGHT_CHECK_OFF: Int = Color.parseColor("#7A868E")

  fun text(isLight: Boolean): Int = if (isLight) LIGHT_TEXT else DARK_TEXT
  fun textSec(isLight: Boolean): Int = if (isLight) LIGHT_TEXT_SEC else DARK_TEXT_SEC
  fun checkOff(isLight: Boolean): Int = if (isLight) LIGHT_CHECK_OFF else DARK_CHECK_OFF
  fun bgRes(isLight: Boolean): Int =
    if (isLight) R.drawable.widget_bg_light else R.drawable.widget_bg_dark
}
