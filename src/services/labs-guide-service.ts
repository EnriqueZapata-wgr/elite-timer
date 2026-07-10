/**
 * Guía de Laboratorios — generación PDF + share (Sprint LABS GUÍA T2).
 *
 * expo-print convierte el HTML (labs-guide-html.ts) a PDF on-device y
 * expo-sharing abre el share sheet (WhatsApp al doctor, guardar, etc.).
 *
 * ⚠️ expo-print es módulo NATIVO nuevo (instalado en este sprint): funciona a
 * partir del build del lunes; en binarios viejos vía OTA el módulo no existe
 * → por eso todo va en try/catch con mensaje amable (fail-soft, no crash).
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { buildLabsGuideHtml } from './labs-guide-html';
import { warn as logWarn } from '@/src/lib/logger';

export type LabsGuideShareResult = 'shared' | 'unavailable' | 'error';

/**
 * Genera el PDF de la guía y abre el share sheet.
 * Devuelve el estado para que la pantalla muestre feedback correcto.
 */
export async function generateAndShareLabsGuide(firstName = ''): Promise<LabsGuideShareResult> {
  try {
    const html = buildLabsGuideHtml(firstName);
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    // Renombrar al nombre amable que verá el doctor en WhatsApp.
    let shareUri = uri;
    try {
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
