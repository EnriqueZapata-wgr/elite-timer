/**
 * Master Export Service (NOCHE-REP) — corre la lectura de TODOS los dominios
 * del rango, arma un archivo y lo pasa al compartir nativo.
 *
 * POR QUÉ LAS DEFINICIONES SE RECIBEN POR PARÁMETRO. El registro de
 * definiciones vive en la capa de componentes (cada dominio dice cómo se lee y
 * qué pinta, y lo segundo es JSX). Si este servicio lo importara, un archivo de
 * servicios acabaría arrastrando react-native y dejaría de poder probarse en
 * node. Quien llama, que ya es una pantalla, le pasa el registro.
 *
 * Los módulos nativos se requieren DENTRO del try, nunca arriba: una OTA sobre
 * un binario viejo revienta en requireNativeModule si se importan al cargar el
 * módulo. Mismo patrón que report-export-service.
 */
import { warn as logWarn } from '@/src/lib/logger';
import {
  REPORT_DOMAINS, toServicePeriod,
  type ExportRow, type ReportDomainKey, type ResolvedRange,
} from './report-domain-core';
import {
  buildMasterCsv, buildMasterJson, buildMasterFilename, buildManifiesto,
  clasificar, resumenParaUsuario,
  type SeccionExport, type ManifiestoExport,
} from './master-export-core';

export type MasterExportFormat = 'csv' | 'json';

/**
 * Lo mínimo que el maestro necesita de un dominio: leerlo y volverlo filas.
 * Es un subconjunto de ReportDomainDefinition a propósito, para no arrastrar
 * el render ni el guard hasta acá.
 */
export interface ExportableDomain {
  key: ReportDomainKey;
  load: (period: ReturnType<typeof toServicePeriod>, range: ResolvedRange) => Promise<any>;
  toRows: (data: any) => ExportRow[];
  /**
   * Presente en los dominios cuyas cifras NO dependen del rango. Se propaga al
   * archivo para que la sección diga que trae el historial completo, no el mes
   * que la persona eligió arriba.
   */
  fixedRange?: string;
}

export type MasterExportOutcome =
  /** Se abrió la hoja de compartir. */
  | { result: 'shared'; manifiesto: ManifiestoExport; resumen: string }
  /** Ni un solo dominio trajo una fila. No se genera un archivo de encabezados. */
  | { result: 'empty'; manifiesto: ManifiestoExport; resumen: string }
  /** El binario no trae el módulo de compartir (OTA sobre versión vieja). */
  | { result: 'unavailable' }
  | { result: 'error' };

/**
 * Lee cada dominio por separado. Uno que truene NO tumba el archivo: entra
 * declarado como no leído, que es la única forma honesta de entregarlo.
 * Omitirlo haría creer que ese pilar nunca tuvo registros.
 */
export async function gatherMasterSections(
  domains: readonly ExportableDomain[],
  range: ResolvedRange,
): Promise<SeccionExport[]> {
  const period = toServicePeriod(range.range);
  const secciones = await Promise.all(domains.map(async (d): Promise<SeccionExport> => {
    const meta = REPORT_DOMAINS[d.key];
    const alcance = d.fixedRange ? 'historial' as const : 'rango' as const;
    try {
      const data = await d.load(period, range);
      const filas = d.toRows(data);
      return { dominio: d.key, titulo: meta.title, estado: clasificar(true, filas), filas, alcance };
    } catch (e) {
      logWarn(`[reports] el export maestro no pudo leer ${d.key}`, e);
      return { dominio: d.key, titulo: meta.title, estado: clasificar(false, []), filas: [], alcance };
    }
  }));
  return secciones;
}

export async function shareMasterExport(
  domains: readonly ExportableDomain[],
  range: ResolvedRange,
  format: MasterExportFormat,
): Promise<MasterExportOutcome> {
  let secciones: SeccionExport[];
  try {
    secciones = await gatherMasterSections(domains, range);
  } catch (e) {
    logWarn('[reports] el export maestro falló al juntar los dominios', e);
    return { result: 'error' };
  }

  const ahora = new Date();
  const manifiesto = buildManifiesto(secciones, range, ahora);
  const resumen = resumenParaUsuario(manifiesto);

  // Sin una sola fila y sin nada caído, no hay archivo que valga: un documento
  // de puros encabezados miente sobre lo que la persona tiene guardado.
  if (manifiesto.totalFilas === 0 && manifiesto.dominiosNoLeidos.length === 0) {
    return { result: 'empty', manifiesto, resumen };
  }

  try {
    const contenido = format === 'csv'
      ? buildMasterCsv(secciones, range, ahora)
      : buildMasterJson(secciones, range, ahora);

    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');

    const file = new File(Paths.cache, buildMasterFilename(range, format));
    if (file.exists) file.delete();
    file.create();
    file.write(contenido);

    if (!(await Sharing.isAvailableAsync())) return { result: 'unavailable' };
    await Sharing.shareAsync(file.uri, {
      mimeType: format === 'csv' ? 'text/csv' : 'application/json',
      dialogTitle: 'Llevarme todos mis datos',
      UTI: format === 'csv' ? 'public.comma-separated-values-text' : 'public.json',
    });
    return { result: 'shared', manifiesto, resumen };
  } catch (e) {
    logWarn('[reports] el export maestro falló al escribir el archivo', e);
    return { result: 'error' };
  }
}
