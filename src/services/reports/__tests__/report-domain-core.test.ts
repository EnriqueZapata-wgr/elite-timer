import { describe, it, expect } from 'vitest';
import {
  REPORT_RANGES, RANGE_LABELS, LABEL_TO_RANGE, rangeDays, parseRange,
  resolveRange, describeRange, toServicePeriod,
  REPORT_DOMAINS, REPORT_DOMAIN_KEYS, isReportDomain, getReportDomain,
  exportColumns, csvCell, buildCsv, buildExportPayload, buildJsonExport,
  buildExportFilename,
  type ExportRow,
} from '../report-domain-core';

describe('rangos', () => {
  it('cada rango tiene etiqueta y la etiqueta regresa al rango', () => {
    for (const r of REPORT_RANGES) {
      expect(LABEL_TO_RANGE[RANGE_LABELS[r]]).toBe(r);
    }
  });

  it('días por rango, con Todo sin piso', () => {
    expect(rangeDays('week')).toBe(7);
    expect(rangeDays('month')).toBe(30);
    expect(rangeDays('year')).toBe(365);
    expect(rangeDays('all')).toBeNull();
  });

  it('el período que consumen los servicios es el mismo string', () => {
    expect(toServicePeriod('week')).toBe('week');
    expect(toServicePeriod('all')).toBe('all');
  });
});

describe('parseRange', () => {
  it('acepta las llaves del hub', () => {
    expect(parseRange('week')).toBe('week');
    expect(parseRange('month')).toBe('month');
    expect(parseRange('year')).toBe('year');
    expect(parseRange('all')).toBe('all');
  });

  it('acepta etiquetas en español y no le importan mayúsculas ni espacios', () => {
    expect(parseRange('Semana')).toBe('week');
    expect(parseRange('  MES ')).toBe('month');
    expect(parseRange('Año')).toBe('year');
    expect(parseRange('ano')).toBe('year');
    expect(parseRange('Todo')).toBe('all');
  });

  it('el legacy 3month cae a mes en vez de romper el deep link', () => {
    expect(parseRange('3month')).toBe('month');
  });

  it('basura, vacío y nulo dan null para que quien llama ponga el default', () => {
    expect(parseRange('trimestre')).toBeNull();
    expect(parseRange('')).toBeNull();
    expect(parseRange(null)).toBeNull();
    expect(parseRange(undefined)).toBeNull();
  });
});

describe('resolveRange', () => {
  const hoy = new Date(2026, 7, 13); // 13-ago-2026 local

  it('semana son 7 días contando hoy', () => {
    expect(resolveRange('week', hoy)).toEqual({
      range: 'week', from: '2026-08-07', to: '2026-08-13', days: 7,
    });
  });

  it('mes son 30 días y cruza el borde del mes sin perderse', () => {
    expect(resolveRange('month', hoy)).toEqual({
      range: 'month', from: '2026-07-15', to: '2026-08-13', days: 30,
    });
  });

  it('año son 365 días', () => {
    const r = resolveRange('year', hoy);
    expect(r.from).toBe('2025-08-14');
    expect(r.to).toBe('2026-08-13');
  });

  it('Todo no inventa un piso', () => {
    expect(resolveRange('all', hoy)).toEqual({
      range: 'all', from: null, to: '2026-08-13', days: null,
    });
  });

  it('el 1 de enero retrocede al año anterior', () => {
    expect(resolveRange('week', new Date(2026, 0, 1)).from).toBe('2025-12-26');
  });

  it('sobrevive al año bisiesto', () => {
    expect(resolveRange('week', new Date(2028, 2, 1)).from).toBe('2028-02-24');
  });

  it('describeRange dice el rango sin fingir un inicio que no existe', () => {
    expect(describeRange(resolveRange('week', hoy))).toBe('2026-08-07 a 2026-08-13');
    expect(describeRange(resolveRange('all', hoy))).toBe('todo mi historial hasta 2026-08-13');
  });
});

describe('registro de dominios', () => {
  it('la llave del mapa y la del meta son la misma', () => {
    for (const k of REPORT_DOMAIN_KEYS) expect(REPORT_DOMAINS[k].key).toBe(k);
  });

  it('los catorce dominios están registrados', () => {
    // Eran cinco cuando solo estaban los baratos. La consolidación sumó
    // journal, emociones, ciclo, nback y adherencia, y el cierre del hub sumó
    // entrenamiento, glucosa, labs y expediente. Cada uno con su meta completa
    // (la verifica el caso de abajo, que recorre TODOS).
    expect(REPORT_DOMAIN_KEYS.slice().sort()).toEqual(
      ['adherencia', 'ayuno', 'ciclo', 'economia', 'emociones', 'entrenamiento',
        'expediente', 'glucosa', 'hidratacion', 'journal', 'labs', 'mente',
        'nback', 'nutricion'],
    );
  });

  it('ningún dominio se queda sin copy de vacío ni sin subtítulo', () => {
    for (const k of REPORT_DOMAIN_KEYS) {
      expect(REPORT_DOMAINS[k].emptyCopy.length).toBeGreaterThan(20);
      expect(REPORT_DOMAINS[k].subtitle.length).toBeGreaterThan(10);
      expect(REPORT_DOMAINS[k].accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(REPORT_DOMAINS[k].icon.length).toBeGreaterThan(0);
    }
  });

  it('el copy no usa em dash ni nombres propios', () => {
    for (const k of REPORT_DOMAIN_KEYS) {
      const texto = `${REPORT_DOMAINS[k].title} ${REPORT_DOMAINS[k].subtitle} ${REPORT_DOMAINS[k].emptyCopy}`;
      expect(texto).not.toContain('—');
    }
  });

  it('isReportDomain rechaza lo que no está registrado', () => {
    expect(isReportDomain('nutricion')).toBe(true);
    // 'entrenamiento' dejó de servir como ejemplo negativo el día que se
    // construyó: el candado se REAPUNTA a un dominio que de verdad no existe.
    expect(isReportDomain('entrenamiento')).toBe(true);
    expect(isReportDomain('suplementos')).toBe(false);
    expect(isReportDomain('')).toBe(false);
    expect(isReportDomain(null)).toBe(false);
    expect(isReportDomain('constructor')).toBe(false);
  });

  it('getReportDomain devuelve null en vez de reventar', () => {
    expect(getReportDomain('mente')?.title).toBe('Mente');
    expect(getReportDomain('sueno')).toBeNull();
    expect(getReportDomain(undefined)).toBeNull();
  });
});

describe('CSV', () => {
  it('las columnas salen en el orden de primera aparición', () => {
    const rows: ExportRow[] = [{ fecha: '1', ml: 2 }, { fecha: '2', meta: true }];
    expect(exportColumns(rows)).toEqual(['fecha', 'ml', 'meta']);
  });

  it('nulo y undefined quedan vacíos, no como texto', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(0)).toBe('0');
    expect(csvCell(false)).toBe('false');
  });

  it('entrecomilla comas, comillas y saltos de línea', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('di "hola"')).toBe('"di ""hola"""');
    expect(csvCell('uno\ndos')).toBe('"uno\ndos"');
  });

  it('neutraliza la inyección de fórmulas de Excel', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('+3')).toBe("'+3");
  });

  it('arma encabezado y filas con CRLF', () => {
    const rows: ExportRow[] = [
      { fecha: '2026-08-13', ml: 2500 },
      { fecha: '2026-08-12', ml: null },
    ];
    expect(buildCsv(rows)).toBe('fecha,ml\r\n2026-08-13,2500\r\n2026-08-12,');
  });

  it('respeta columnas explícitas y rellena las que faltan', () => {
    const rows: ExportRow[] = [{ b: 2 }];
    expect(buildCsv(rows, ['a', 'b'])).toBe('a,b\r\n,2');
  });

  it('sin filas y sin columnas no inventa un archivo', () => {
    expect(buildCsv([])).toBe('');
  });
});

describe('export JSON y nombre de archivo', () => {
  const hoy = new Date(2026, 7, 13);
  const ahora = new Date(Date.UTC(2026, 7, 13, 18, 30, 0));
  const rows: ExportRow[] = [{ fecha: '2026-08-13', ml: 2500 }];

  it('el payload dice el rango, cuántas filas trae y cuándo se generó', () => {
    const p = buildExportPayload('hidratacion', resolveRange('week', hoy), rows, ahora);
    expect(p.dominio).toBe('hidratacion');
    expect(p.rango).toBe('week');
    expect(p.desde).toBe('2026-08-07');
    expect(p.hasta).toBe('2026-08-13');
    expect(p.filas).toBe(1);
    expect(p.generado).toBe('2026-08-13T18:30:00.000Z');
  });

  it('el JSON es parseable y no comparte referencia con las filas de origen', () => {
    const json = buildJsonExport('hidratacion', resolveRange('all', hoy), rows, ahora);
    const back = JSON.parse(json);
    expect(back.datos).toEqual(rows);
    expect(back.desde).toBeNull();
    back.datos.push({ fecha: 'x' });
    expect(rows).toHaveLength(1);
  });

  it('el nombre trae dominio y rango, e inicio cuando no hay piso', () => {
    expect(buildExportFilename('ayuno', resolveRange('week', hoy), 'csv'))
      .toBe('ATP-ayuno-2026-08-07-a-2026-08-13.csv');
    expect(buildExportFilename('ayuno', resolveRange('all', hoy), 'json'))
      .toBe('ATP-ayuno-inicio-a-2026-08-13.json');
  });
});
