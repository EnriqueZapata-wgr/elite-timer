/**
 * Aviso del día 7 (ATP 3.0, 5-sep-2026, ruta 2.8): lógica PURA.
 *
 * Al terminar el onboarding, un usuario Free recibe una sola notificación
 * local siete días después, a las 10:00 de su hora local, que abre el paywall
 * con `contexto=dia7`. Es el quinto momento de conversión del pivote (3.3):
 * suave, uno solo, y nunca para quien ya paga.
 */

export const AVISO_DIA7_ID = 'aviso-dia7';
export const AVISO_DIA7_DIAS = 7;
export const AVISO_DIA7_HORA = 10;
export const AVISO_DIA7_TITULO = 'Una semana con ATP';
export const AVISO_DIA7_CUERPO = 'Una semana con ATP. Mira todo lo que abre Pro.';
export const AVISO_DIA7_URL = '/paywall?contexto=dia7';

/** `desde` + 7 días, a las 10:00 hora local del dispositivo. */
export function fechaAvisoDia7(desde: Date): Date {
  const objetivo = new Date(desde.getTime());
  objetivo.setDate(objetivo.getDate() + AVISO_DIA7_DIAS);
  objetivo.setHours(AVISO_DIA7_HORA, 0, 0, 0);
  return objetivo;
}

export interface DecisionAvisoDia7 {
  tier: 'free' | 'premium' | 'elite';
  /**
   * 7-sep-2026: estado de `VENTA_AL_PUBLICO`. Este aviso es puro anzuelo de
   * venta ("mira todo lo que abre Pro"), así que con la venta al público
   * apagada no se programa para nadie. Se recibe como dato y no se importa la
   * bandera para que el test pruebe el contrato con la venta encendida y el
   * comportamiento de hoy con ella apagada.
   */
  ventaAlPublico: boolean;
  /** true si la lectura del nivel falló: no se sabe si paga, y no se le avisa. */
  nivelNoSePudoLeer: boolean;
  /** Permiso de notificaciones ya concedido. Sin permiso no se pide otra vez. */
  permisoConcedido: boolean;
}

/**
 * ¿Se programa el aviso? Solo con la venta al público encendida, y aun así
 * solo Free confirmado y con permiso. Ante la duda (no se pudo leer el nivel)
 * no se avisa: molestar a un miembro con "mira lo que abre Pro" es peor que no
 * avisar a un Free.
 */
export function debeProgramarAvisoDia7(d: DecisionAvisoDia7): boolean {
  if (d.ventaAlPublico !== true) return false;
  return d.tier === 'free' && !d.nivelNoSePudoLeer && d.permisoConcedido;
}

/**
 * La ruta que trae una notificación en `data.url`, o null. Solo rutas
 * internas (empiezan con '/'): un deep link externo en una notificación local
 * no tiene por qué existir, y si existiera no se navega a ciegas.
 */
export function rutaDeNotificacion(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const url = (data as { url?: unknown }).url;
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return null;
  return url;
}
