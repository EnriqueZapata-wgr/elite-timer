/**
 * Master Export Core (NOCHE-REP) — lógica PURA del export maestro: juntar
 * TODOS los dominios del rango en un solo archivo que la persona se lleva.
 *
 * DOS DESTINATARIOS Y DOS ARCHIVOS DISTINTOS, A PROPÓSITO.
 *
 *   · EL USUARIO se lleva ESTO: todo, crudo, con los nombres de campo tal cual
 *     y sin una sola interpretación encima. Es su dato y se lo puede llevar a
 *     donde quiera, incluso fuera de ATP. Sin candados y sin resumen que
 *     decida por él qué era importante.
 *
 *   · EL MÉDICO recibe el PDF de consulta, que ya existe
 *     (consulta-report-service) y que está escrito para leerse en cinco
 *     minutos entre paciente y paciente. Aquí NO se construye un segundo PDF:
 *     dos documentos para el médico acabarían diciendo cosas distintas del
 *     mismo mes. La tarjeta del hub manda a ese, y punto.
 *
 * Y UNA REGLA DE HONESTIDAD QUE MANDA SOBRE TODO LO DEMÁS: un dominio que no
 * se pudo leer entra al archivo DECLARADO como no leído. No se omite. Si se
 * omitiera, la persona abriría el archivo, no vería su ayuno, y creería que
 * perdió meses de registro.
 */
import {
  buildCsv, csvCell, exportColumns,
  type ExportRow, type ReportDomainKey, type ResolvedRange,
} from './report-domain-core';

export type EstadoSeccion = 'ok' | 'vacio' | 'no_leido';

export const ESTADO_SECCION_LABEL: Record<EstadoSeccion, string> = {
  ok: 'con datos',
  vacio: 'sin registros en el rango',
  no_leido: 'no se pudo leer',
};

export interface SeccionExport {
  dominio: ReportDomainKey;
  titulo: string;
  estado: EstadoSeccion;
  filas: ExportRow[];
  /**
   * Qué periodo cubre ESTA sección. Casi todas cubren el rango elegido, pero
   * un par de dominios reportan siempre su acumulado completo (N-Back, por
   * ejemplo, cuyas cifras no dependen del rango). Declararlo evita que el
   * archivo diga "agosto" arriba y traiga adentro dos años de rounds.
   */
  alcance: 'rango' | 'historial';
}

export const ALCANCE_LABEL: Record<SeccionExport['alcance'], string> = {
  rango: 'del rango',
  historial: 'de todo tu historial',
};

/** Clasifica una sección a partir de lo que devolvió su lectura. */
export function clasificar(leido: boolean, filas: readonly ExportRow[]): EstadoSeccion {
  if (!leido) return 'no_leido';
  return filas.length === 0 ? 'vacio' : 'ok';
}

// ── Manifiesto ───────────────────────────────────────────────────────────

export interface ManifiestoExport {
  app: 'ATP';
  generado: string;
  rango: { clave: string; desde: string | null; hasta: string };
  totalFilas: number;
  dominiosConDatos: number;
  dominiosVacios: number;
  dominiosNoLeidos: string[];
}

export function buildManifiesto(
  secciones: readonly SeccionExport[], range: ResolvedRange, now: Date,
): ManifiestoExport {
  return {
    app: 'ATP',
    generado: now.toISOString(),
    rango: { clave: range.range, desde: range.from, hasta: range.to },
    totalFilas: secciones.reduce((a, s) => a + s.filas.length, 0),
    dominiosConDatos: secciones.filter((s) => s.estado === 'ok').length,
    dominiosVacios: secciones.filter((s) => s.estado === 'vacio').length,
    dominiosNoLeidos: secciones.filter((s) => s.estado === 'no_leido').map((s) => s.dominio),
  };
}

// ── JSON ─────────────────────────────────────────────────────────────────

export function buildMasterJson(
  secciones: readonly SeccionExport[], range: ResolvedRange, now: Date,
): string {
  return JSON.stringify({
    ...buildManifiesto(secciones, range, now),
    dominios: secciones.map((s) => ({
      dominio: s.dominio,
      titulo: s.titulo,
      estado: s.estado,
      estadoTexto: ESTADO_SECCION_LABEL[s.estado],
      alcance: ALCANCE_LABEL[s.alcance],
      filas: s.filas.length,
      datos: [...s.filas],
    })),
  }, null, 2);
}

// ── CSV ──────────────────────────────────────────────────────────────────

/**
 * Un CSV por secciones. Los dominios no comparten columnas (una comida y una
 * marca de fuerza no se parecen en nada), así que meterlos en una sola tabla
 * daría cincuenta columnas vacías por renglón. Se escriben uno tras otro con
 * un encabezado de comentario en medio, que es como Excel y Sheets ya abren
 * los reportes bancarios: se ve raro un segundo y se entiende para siempre.
 *
 * Las secciones vacías y las no leídas también salen, con su encabezado y su
 * razón. Un dominio ausente del archivo se lee como dato perdido.
 */
export function buildMasterCsv(
  secciones: readonly SeccionExport[], range: ResolvedRange, now: Date,
): string {
  const m = buildManifiesto(secciones, range, now);
  const bloques: string[] = [
    [
      `# ATP, mis datos`,
      `# Rango: ${m.rango.desde ?? 'inicio'} a ${m.rango.hasta}`,
      `# Generado: ${m.generado}`,
      `# Filas totales: ${m.totalFilas}`,
    ].join('\r\n'),
  ];

  for (const s of secciones) {
    const cabeza = `# ${s.titulo} (${ESTADO_SECCION_LABEL[s.estado]}, ${ALCANCE_LABEL[s.alcance]})`;
    if (s.estado !== 'ok') { bloques.push(cabeza); continue; }
    const cols = exportColumns(s.filas);
    bloques.push(`${cabeza}\r\n${buildCsv(s.filas, cols)}`);
  }

  // csvCell se usa arriba vía buildCsv; se referencia aquí para que quede
  // explícito que el escape de fórmulas de Excel aplica igual en el maestro.
  void csvCell;

  return bloques.join('\r\n\r\n');
}

// ── Nombre de archivo ────────────────────────────────────────────────────

export function buildMasterFilename(range: ResolvedRange, ext: 'csv' | 'json'): string {
  const desde = range.from ?? 'inicio';
  return `ATP-mis-datos-${desde}-a-${range.to}.${ext}`;
}

// ── Copy del resultado ───────────────────────────────────────────────────

/**
 * Lo que se le dice a la persona después de generar. Se nombra lo que no se
 * pudo leer: enterarse por un archivo incompleto es peor que enterarse aquí.
 */
export function resumenParaUsuario(m: ManifiestoExport): string {
  if (m.totalFilas === 0 && m.dominiosNoLeidos.length === 0) {
    return 'No hay ni un registro en este rango. Cambia el rango y vuelve a intentar.';
  }
  const partes = [`${m.totalFilas} ${m.totalFilas === 1 ? 'registro' : 'registros'} de ${m.dominiosConDatos} ${m.dominiosConDatos === 1 ? 'sección' : 'secciones'}`];
  if (m.dominiosVacios > 0) {
    partes.push(`${m.dominiosVacios} sin nada en el rango`);
  }
  if (m.dominiosNoLeidos.length > 0) {
    partes.push(`${m.dominiosNoLeidos.length} que no cargaron y van marcadas dentro del archivo`);
  }
  return `${partes.join(', ')}.`;
}
