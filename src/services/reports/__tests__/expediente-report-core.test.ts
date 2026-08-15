import { describe, it, expect } from 'vitest';
import {
  construirInventario, estadoDe, etiquetaDe, fraseEstado, fuentesVacias,
  masReciente,
} from '../expediente-report-core';
import type { TimelineSources } from '@/src/services/salud/mi-expediente-core';

const VACIO: TimelineSources = {
  symptoms: [], interventionsActivated: [], labs: [],
  measurements: [], glucose: [], ketones: [],
};

describe('más reciente', () => {
  it('elige la fecha mayor sin importar el orden', () => {
    expect(masReciente(['2026-01-01', '2026-08-01', '2026-03-01'])).toBe('2026-08-01');
  });

  it('ignora nulos y basura en vez de reventar', () => {
    expect(masReciente([null, 'no es fecha', '2026-08-01', undefined])).toBe('2026-08-01');
    expect(masReciente([])).toBeNull();
    expect(masReciente([null, undefined])).toBeNull();
  });
});

describe('inventario', () => {
  it('lista TODAS las fuentes aunque estén vacías', () => {
    const inv = construirInventario(VACIO);
    expect(inv).toHaveLength(6);
    expect(inv.every((f) => f.registros === 0)).toBe(true);
  });

  it('cada fuente dice cómo se llena, tenga o no datos', () => {
    for (const f of construirInventario(VACIO)) {
      expect(f.comoSeLlena.length).toBeGreaterThan(20);
      expect(f.comoSeLlena).not.toContain('—');
      expect(f.route.startsWith('/')).toBe(true);
      expect(f.titulo.length).toBeGreaterThan(3);
    }
  });

  it('cuenta registros y toma la fecha más reciente de cada fuente', () => {
    const inv = construirInventario({
      ...VACIO,
      labs: [
        { marker: 'vitamina_d', measured_at: '2026-01-10' },
        { marker: 'hba1c', measured_at: '2026-06-10' },
      ],
      glucose: [{ value: 90, at: '2026-08-01T07:00:00.000Z' }],
    });
    const labs = inv.find((f) => f.key === 'labs')!;
    expect(labs.registros).toBe(2);
    expect(labs.ultimo).toBe('2026-06-10');
    expect(inv.find((f) => f.key === 'glucosa')!.registros).toBe(1);
    expect(inv.find((f) => f.key === 'cetonas')!.ultimo).toBeNull();
  });

  it('un síntoma sin resolver usa su fecha de inicio', () => {
    const inv = construirInventario({
      ...VACIO,
      symptoms: [{ id: '1', name: 'x', started_at: '2026-05-01', resolved_at: null, severity: 3 }],
    });
    expect(inv.find((f) => f.key === 'sintomas')!.ultimo).toBe('2026-05-01');
  });
});

describe('estado del expediente', () => {
  it('vacío se declara vacío y NO se felicita', () => {
    const e = estadoDe(construirInventario(VACIO));
    expect(e.vacio).toBe(true);
    expect(e.pct).toBe(0);
    expect(e.etiqueta).toBe('Expediente vacío');
    expect(fraseEstado(e)).toContain('nadie la borra');
  });

  it('el porcentaje mide FUENTES con datos, no registros', () => {
    const e = estadoDe(construirInventario({
      ...VACIO,
      labs: Array.from({ length: 50 }, (_, i) => ({ marker: `m${i}`, measured_at: '2026-01-01' })),
    }));
    expect(e.registros).toBe(50);
    expect(e.fuentesConDatos).toBe(1);
    expect(e.pct).toBe(17);
  });

  it('las etiquetas suben con el porcentaje y ninguna lleva em dash', () => {
    expect(etiquetaDe(0)).toBe('Expediente vacío');
    expect(etiquetaDe(20)).toBe('Expediente empezado');
    expect(etiquetaDe(50)).toBe('Expediente en construcción');
    expect(etiquetaDe(90)).toBe('Expediente casi completo');
    expect(etiquetaDe(100)).toBe('Expediente completo');
    for (const p of [0, 20, 50, 90, 100]) expect(etiquetaDe(p)).not.toContain('—');
  });

  it('las fuentes vacías se pueden listar para decir qué falta', () => {
    const inv = construirInventario({ ...VACIO, glucose: [{ value: 90, at: '2026-08-01' }] });
    const vacias = fuentesVacias(inv);
    expect(vacias).toHaveLength(5);
    expect(vacias.map((f) => f.key)).not.toContain('glucosa');
  });
});
