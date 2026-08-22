/**
 * Bajar una foto antes de mandarla a un modelo.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * Esta función estaba copiada tres veces (SupplementScanSheet, BhaScanSheet,
 * PhotoSensor). La cuarta copia, en el escáner de etiquetas del Súper, es la
 * que obligó a sacarla: se había escrito sin ella y mandaba el base64 crudo
 * del picker declarando `image/jpeg`. Dos consecuencias medidas:
 *
 *  · Una captura de pantalla es PNG, y una foto del carrete en iOS puede ser
 *    HEIC. Declarar JPEG y mandar otra cosa devuelve 400, y el usuario leía
 *    "revisa tu conexión", que es mentira y lo manda a buscar donde no es.
 *  · Sin redimensionar, una foto de 12 MP se va arriba de 3 MB en base64, con
 *    su costo y su espera.
 *
 * El módulo nativo se carga perezoso a propósito (gotcha conocido de Expo): si
 * el binario no lo trae, se devuelve el base64 original en vez de tronar.
 */

let ImageManipulator: any = null;
try { ImageManipulator = require('expo-image-manipulator'); } catch { /* sin módulo nativo */ }

/** Ancho al que se baja la foto. 1024 alcanza para leer letra chica de etiqueta. */
export const ANCHO_PARA_IA = 1024;

/**
 * Devuelve el base64 de la foto reducida a 1024px y forzada a JPEG.
 * Si el módulo nativo no está, devuelve `respaldo` sin tronar.
 */
export async function encogerFotoParaIA(
  uri: string,
  respaldo: string | null,
): Promise<string | null> {
  if (!ImageManipulator?.manipulateAsync) return respaldo;
  try {
    const m = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: ANCHO_PARA_IA } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    return m?.base64 ?? respaldo;
  } catch {
    return respaldo;
  }
}
