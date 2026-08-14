/**
 * OLA3 · Contrato de los paneles de sensor de /food-log.
 *
 * El SENSOR es el único eje que distinguía a food-text, food-scan y
 * food-barcode. Todo lo demás (tipo de comida, hora, gateo de modo,
 * saveFoodLog como ruta única a food_logs) es común y vive en la carcasa.
 *
 * Reglas duras que heredan los tres paneles:
 *  - Escribir SOLO vía saveFoodLog.
 *  - `source` sigue distinguiendo el sensor real:
 *    manual_text | scan_photo | scan_text | scan_raw | barcode.
 *  - wasEdited real (no un true de adorno).
 *  - updateFrequentFood tras guardar cuando hay números.
 *  - maybeGeneratePostMealInsight tras guardar.
 */

/** Los 3 sensores del registro. El param de ruta usa estos mismos valores. */
export type SensorId = 'foto' | 'texto' | 'codigo';

/** Sub-modo del sensor foto: comida (score + macros) o etiqueta (cleanliness). */
export type CaptureIntent = 'comida' | 'etiqueta';

export interface SensorPanelProps {
  /** Tipo de comida vivo — lo manda la barra persistente de la carcasa. */
  mealType: string;
  /** Hora del registro en HH:MM — editable en la carcasa, común a los 3. */
  mealTime: string;
  /** Sub-modo del sensor foto; los otros dos lo ignoran. */
  intent: CaptureIntent;
  /**
   * El panel toma la pantalla completa (preview, análisis, resultado o el
   * editor de revisión). La carcasa esconde su chrome mientras dure.
   */
  onTakeover: (activo: boolean) => void;
  /** Se guardó algo en food_logs: la zona "de un toque" se refresca. */
  onSaved: () => void;
}
