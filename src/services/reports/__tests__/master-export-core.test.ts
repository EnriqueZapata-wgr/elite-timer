import { describe, it, expect } from 'vitest';
import {
  clasificar, buildManifiesto, buildMasterJson, buildMasterCsv,
  buildMasterFilename, resumenParaUsuario, ESTADO_SECCION_LABEL, ALCANCE_LABEL,
  type SeccionExport,
} from '../master-export-core';
import { resolveRange } from '../report-domain-core';

const HOY = new Date(2026, 7, 13);
const AHORA = new Date(Date.UTC(2026, 7, 13, 18, 30, 0));
const RANGO = resolveRange('week', HOY);

const seccion = (
  dominio: SeccionExport['dominio'], estado: SeccionExport['estado'],
  filas: SeccionExport['filas'] = [], alcance: SeccionExport['alcance'] = 'rango',
): SeccionExport => ({ dominio, titulo: dominio, estado, filas, alcance });

describe('clasificar', () => {
  it('leído con filas es ok, leído sin filas es vacío', () => {
    expect(clasificar(true, [{ a: 1 }])).toBe('ok');
    expect(clasificar(true, [])).toBe('vacio');
  });

  it('NO leído es no_leido aunque no traiga filas: son cosas distintas', () => {
    expect(clasificar(false, [])).toBe('no_leido');
  });
});

describe('manifiesto', () => {
  const secciones = [
    seccion('nutricion', 'ok', [{ fecha: '2026-08-10', kcal: 2100 }]),
    seccion('ayuno', 'vacio'),
    seccion('ciclo', 'no_leido'),
  ];

  it('cuenta filas y separa con datos, vacíos y no leídos', () => {
    const m = buildManifiesto(secciones, RANGO, AHORA);
    expect(m.totalFilas).toBe(1);
    expect(m.dominiosConDatos).toBe(1);
    expect(m.dominiosVacios).toBe(1);
    expect(m.dominiosNoLeidos).toEqual(['ciclo']);
  });

  it('el rango se declara tal cual, sin inventar un piso en Todo', () => {
    const m = buildManifiesto(secciones, resolveRange('all', HOY), AHORA);
    expect(m.rango).toEqual({ clave: 'all', desde: null, hasta: '2026-08-13' });
  });
});

describe('JSON maestro', () => {
  const secciones = [
    seccion('nutricion', 'ok', [{ fecha: '2026-08-10', kcal: 2100 }]),
    seccion('ayuno', 'no_leido'),
    seccion('nback', 'ok', [{ metrica: 'rounds', valor: 40 }], 'historial'),
  ];

  it('el dominio que no se pudo leer SÍ aparece, declarado', () => {
    const back = JSON.parse(buildMasterJson(secciones, RANGO, AHORA));
    const ayuno = back.dominios.find((d: any) => d.dominio === 'ayuno');
    expect(ayuno).toBeDefined();
    expect(ayuno.estado).toBe('no_leido');
    expect(ayuno.estadoTexto).toBe(ESTADO_SECCION_LABEL.no_leido);
  });

  it('una sección que no depende del rango lo declara en vez de mentir', () => {
    const back = JSON.parse(buildMasterJson(secciones, RANGO, AHORA));
    const nback = back.dominios.find((d: any) => d.dominio === 'nback');
    expect(nback.alcance).toBe(ALCANCE_LABEL.historial);
  });

  it('no comparte referencia con las filas de origen', () => {
    const back = JSON.parse(buildMasterJson(secciones, RANGO, AHORA));
    back.dominios[0].datos.push({ fecha: 'x' });
    expect(secciones[0].filas).toHaveLength(1);
  });
});

describe('CSV maestro', () => {
  const secciones = [
    seccion('nutricion', 'ok', [{ fecha: '2026-08-10', kcal: 2100 }]),
    seccion('ayuno', 'vacio'),
    seccion('ciclo', 'no_leido'),
  ];
  const csv = buildMasterCsv(secciones, RANGO, AHORA);

  it('abre con el manifiesto y el rango', () => {
    expect(csv.startsWith('# ATP, mis datos')).toBe(true);
    expect(csv).toContain('# Rango: 2026-08-07 a 2026-08-13');
  });

  it('cada sección lleva su encabezado, incluidas la vacía y la caída', () => {
    expect(csv).toContain(`# ayuno (${ESTADO_SECCION_LABEL.vacio}`);
    expect(csv).toContain(`# ciclo (${ESTADO_SECCION_LABEL.no_leido}`);
  });

  it('la sección con datos trae encabezado de columnas y su fila', () => {
    expect(csv).toContain('fecha,kcal');
    expect(csv).toContain('2026-08-10,2100');
  });

  it('hereda el escape de fórmulas de Excel del core de dominios', () => {
    const conFormula = buildMasterCsv(
      [seccion('journal', 'ok', [{ texto: '=1+1' }])], RANGO, AHORA,
    );
    expect(conFormula).toContain("'=1+1");
  });
});

describe('nombre de archivo', () => {
  it('dice el rango, y en Todo dice inicio en vez de inventar una fecha', () => {
    expect(buildMasterFilename(RANGO, 'csv')).toBe('ATP-mis-datos-2026-08-07-a-2026-08-13.csv');
    expect(buildMasterFilename(resolveRange('all', HOY), 'json'))
      .toBe('ATP-mis-datos-inicio-a-2026-08-13.json');
  });
});

describe('resumen para el usuario', () => {
  it('sin nada y sin fallas lo dice claro', () => {
    const m = buildManifiesto([seccion('ayuno', 'vacio')], RANGO, AHORA);
    expect(resumenParaUsuario(m)).toContain('No hay ni un registro');
  });

  it('nombra lo que no cargó en vez de dejar que se descubra abriendo el archivo', () => {
    const m = buildManifiesto([
      seccion('nutricion', 'ok', [{ a: 1 }]),
      seccion('ciclo', 'no_leido'),
    ], RANGO, AHORA);
    const copy = resumenParaUsuario(m);
    expect(copy).toContain('no cargaron');
    expect(copy).not.toContain('—');
  });

  it('todo caído no se confunde con todo vacío', () => {
    const m = buildManifiesto([seccion('ciclo', 'no_leido')], RANGO, AHORA);
    expect(resumenParaUsuario(m)).not.toContain('No hay ni un registro');
  });
});
