/**
 * Report Export Service (OLA1 R-0) — escribe el rango visible de un dominio a
 * un archivo y lo pasa al compartir nativo.
 *
 * Los módulos nativos se requieren DENTRO del try, nunca arriba: una OTA sobre
 * un binario viejo revienta en requireNativeModule si se importan al cargar el
 * módulo. Mismo patrón que consulta-report-service.
 */
import { warn as logWarn } from '@/src/lib/logger';
import {
  buildCsv, buildJsonExport, buildExportFilename,
  type ExportRow, type ReportDomainKey, type ResolvedRange,
} from './report-domain-core';

export type ReportExportFormat = 'csv' | 'json';

export type ReportExportResult =
  /** Se abrió la hoja de compartir. */
  | 'shared'
  /** El rango visible no tiene una sola fila: no hay qué exportar. */
  | 'empty'
  /** El binario no trae el módulo de compartir (OTA sobre versión vieja). */
  | 'unavailable'
  | 'error';

export async function shareReportExport(
  domain: ReportDomainKey,
  range: ResolvedRange,
  rows: readonly ExportRow[],
  format: ReportExportFormat,
): Promise<ReportExportResult> {
  if (rows.length === 0) return 'empty';
  try {
    const content = format === 'csv'
      ? buildCsv(rows)
      : buildJsonExport(domain, range, rows, new Date());
    if (!content) return 'empty';

    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');

    const file = new File(Paths.cache, buildExportFilename(domain, range, format));
    if (file.exists) file.delete();
    file.create();
    file.write(content);

    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    await Sharing.shareAsync(file.uri, {
      mimeType: format === 'csv' ? 'text/csv' : 'application/json',
      dialogTitle: 'Compartir mis datos',
      UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'public.json',
    });
    return 'shared';
  } catch (e) {
    logWarn('[reports] export del dominio falló', e);
    return 'error';
  }
}
