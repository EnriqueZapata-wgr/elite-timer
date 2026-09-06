/**
 * Ventana de lanzamiento (ATP 3.0, 5-sep-2026, ruta 2.6).
 *
 * El PRECIO nunca se escribe en el bundle: sale de RevenueCat (Apple 3.1.2).
 * Lo único que vive aquí es la FECHA hasta la que se sostiene el precio de
 * lanzamiento, porque la tienda no la sabe. Enrique la llena cuando apruebe
 * el pivote y encienda `activa`; mientras esté apagada el paywall no dice
 * nada de lanzamiento.
 *
 * Apple 3.1.2(a): "se mantiene" es verdad solo si al subir el precio se
 * preserva el de los suscriptores existentes en App Store Connect (ruta 0.6).
 * Prometerlo sin hacerlo es bait-and-switch, así que esto NO se enciende
 * antes de ese trámite.
 */
export const VENTANA_LANZAMIENTO = {
  activa: false,
  /** Fecha legible en español de México, por ejemplo '31 de octubre de 2026'. */
  hasta: '',
} as const;

/**
 * ATP 3.0 (6-sep-2026, ruta 3.5): quién firma el plan Elite dentro de la app.
 * Las filas de `user_supplements` con `source='coach'` llevan la etiqueta
 * "Asignado por Enrique"; si algún día lo carga otra persona, se cambia aquí.
 */
export const NOMBRE_COACH_ELITE = 'Enrique';

/**
 * ATP 3.0 (6-sep-2026, ruta 3.4 y pagina /elite): el correo al que abre el
 * boton "Escribenos" de la pagina Elite (mailto, Apple 3.1.3: comunicar fuera
 * de la app si se puede; vender adentro no). Enrique confirma el buzon: si el
 * correo real es otro, se cambia aqui y en ningun otro lado.
 */
export const CONTACTO_ELITE_EMAIL = 'hola@somosatp.com';

/** El copy del paywall cuando la ventana está activa. Puro, para probarlo. */
export function copyLanzamiento(v: { activa: boolean; hasta: string }): string | null {
  if (!v.activa || !v.hasta.trim()) return null;
  return `Precio de lanzamiento: se mantiene para quien se suscriba antes del ${v.hasta.trim()}. Después sube.`;
}
