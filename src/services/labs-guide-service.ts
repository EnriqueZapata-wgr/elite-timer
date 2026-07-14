/**
 * Guía de Laboratorios — generación PDF + share (Sprint LABS GUÍA T2).
 *
 * expo-print convierte el HTML (labs-guide-html.ts) a PDF on-device y
 * expo-sharing abre el share sheet (WhatsApp al doctor, guardar, etc.).
 *
 * ⚠️ expo-print es módulo NATIVO nuevo (instalado en este sprint): funciona a
 * partir del build del lunes; en binarios viejos vía OTA el módulo no existe
 * y requireNativeModule revienta AL IMPORTAR → los imports nativos van lazy
 * (require dentro del try/catch), nunca a nivel de módulo. Import estático
 * aquí = crash al abrir cualquier pantalla que importe este service.
 */
import { buildLabsGuideHtml } from './labs-guide-html';
import { warn as logWarn } from '@/src/lib/logger';

export type LabsGuideShareResult = 'shared' | 'unavailable' | 'error';

/**
 * Genera el PDF de la guía y abre el share sheet.
 * Devuelve el estado para que la pantalla muestre feedback correcto.
 */
export async function generateAndShareLabsGuide(firstName = ''): Promise<LabsGuideShareResult> {
  try {
    const Print = require('expo-print') as typeof import('expo-print');
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');

    const html = buildLabsGuideHtml(firstName);
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    // Renombrar al nombre amable que verá el doctor en WhatsApp.
    let shareUri = uri;
    try {
      const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
      const pretty = new File(Paths.cache, 'Guia-Laboratorios-ATP.pdf');
      if (pretty.exists) pretty.delete();
      new File(uri).move(pretty);
      shareUri = pretty.uri;
    } catch { /* el rename es cosmético — compartir el original si falla */ }

    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir Guía de Laboratorios ATP',
      UTI: 'com.adobe.pdf',
    });
    return 'shared';
  } catch (e) {
    logWarn('[labs-guide] generateAndShareLabsGuide failed', e);
    return 'error';
  }
}
