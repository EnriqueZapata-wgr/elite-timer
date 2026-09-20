/**
 * Hero de HOY (ATP 3.0, ruta 2.1): los tres estados se distinguen, el delta
 * nunca se invierte y los tres marcadores son los mismos que Free ve con ficha.
 */
import { describe, it, expect } from 'vitest';
import {
  decidirEstadoHero, textoDeltaEdad, tonoDeltaEdad, edadIntegralTexto,
  top3Marcadores, cuentaFueraDeVentana, fechaTomaCorta, ultimaToma, esDeTomaAnterior,
  marcadoresConSexo, sexoDePerfil, AVISO_FALTA_SEXO,
  VENTANA_MISMO_ESTUDIO_DIAS, type DatosHero, type JuezPorSexo, type MarcadorHero, type ValorMedidoHero,
} from '@/src/services/hoy/hero-laboratorios-core';

const m = (key: string, estado: MarcadorHero['estado'], peso = 1, fecha: string | null = '2026-09-01'): MarcadorHero =>
  ({ key, etiqueta: key.toUpperCase(), estado, peso, fecha });

describe('decidirEstadoHero', () => {
  it('cargando sin datos ni fallo', () => {
    expect(decidirEstadoHero(null, true, false)).toBe('cargando');
  });
  it('regla 7: el fallo sin datos es "no se pudo leer", no "sin estudio"', () => {
    expect(decidirEstadoHero(null, false, true)).toBe('no_se_pudo_leer');
    expect(decidirEstadoHero(null, true, true)).toBe('no_se_pudo_leer');
  });
  it('sin valores de laboratorio es "sin estudio" aunque haya Edad ATP vieja', () => {
    const d: DatosHero = { tieneEstudio: false, edad: { integral: 40, cronologica: 42 }, marcadores: [], faltaSexo: false };
    expect(decidirEstadoHero(d, false, false)).toBe('sin_estudio');
  });
  it('con estudio pinta el hero completo, y datos viejos ganan a un fallo de recarga', () => {
    const d: DatosHero = { tieneEstudio: true, edad: null, marcadores: [m('hba1c', 'optimo')], faltaSexo: false };
    expect(decidirEstadoHero(d, false, false)).toBe('con_estudio');
    expect(decidirEstadoHero(d, false, true)).toBe('con_estudio');
  });
});

describe('marcadoresConSexo (20-sep-2026: nunca se asume el sexo)', () => {
  const valores: ValorMedidoHero[] = [
    { key: 'hba1c', etiqueta: 'HbA1c', value: 6.4, fecha: '2026-09-01' },
    { key: 'ferritina', etiqueta: 'Ferritina', value: 400, fecha: null },
  ];
  // Un juez que pone TODO en atencion con peso 5: si el sexo falta, no debe ni llamarse.
  const llamadas: string[] = [];
  const juezSevero: JuezPorSexo = (sexo, key) => { llamadas.push(`${sexo}:${key}`); return { peso: 5, estado: 'atencion' }; };

  it('con sexo null ningun marcador queda en atencion ni aceptable: todo sin_banda, peso 0, y el juez no se llama', () => {
    llamadas.length = 0;
    const out = marcadoresConSexo(null, valores, juezSevero);
    expect(out).toHaveLength(2);
    expect(out.every((x) => x.estado === 'sin_banda' && x.peso === 0)).toBe(true);
    expect(out.some((x) => x.estado === 'atencion')).toBe(false);
    expect(llamadas).toEqual([]);
    // Lo que no depende del sexo se conserva: llave, etiqueta y fecha.
    expect(out[0]).toEqual({ key: 'hba1c', etiqueta: 'HbA1c', peso: 0, estado: 'sin_banda', fecha: '2026-09-01' });
    expect(out[1].fecha).toBeNull();
  });
  it('con sexo conocido el juez decide, con ese sexo y por cada valor', () => {
    llamadas.length = 0;
    const out = marcadoresConSexo('female', valores, juezSevero);
    expect(out.map((x) => x.estado)).toEqual(['atencion', 'atencion']);
    expect(out.map((x) => x.peso)).toEqual([5, 5]);
    expect(llamadas).toEqual(['female:hba1c', 'female:ferritina']);
  });
  it('sexoDePerfil: solo male o female; NULL, vacio, intersex o basura es null (nunca hombre por defecto)', () => {
    expect(sexoDePerfil('male')).toBe('male');
    expect(sexoDePerfil('female')).toBe('female');
    expect(sexoDePerfil(null)).toBeNull();
    expect(sexoDePerfil(undefined)).toBeNull();
    expect(sexoDePerfil('')).toBeNull();
    expect(sexoDePerfil('intersex')).toBeNull();
    expect(sexoDePerfil('MALE')).toBeNull();
    expect(sexoDePerfil(1)).toBeNull();
  });
  it('el aviso no asume nada, no trae em dash y manda al perfil', () => {
    expect(AVISO_FALTA_SEXO.includes('—')).toBe(false);
    expect(AVISO_FALTA_SEXO).toMatch(/perfil/);
    expect(/hombre|mujer/i.test(AVISO_FALTA_SEXO)).toBe(false);
  });
});

describe('textoDeltaEdad (convención cron - integral, + = más joven)', () => {
  it('más joven', () => {
    expect(textoDeltaEdad({ integral: 35, cronologica: 42 })).toBe('7 años más joven');
    expect(tonoDeltaEdad({ integral: 35, cronologica: 42 })).toBe('exito');
  });
  it('por encima, sin juicio', () => {
    expect(textoDeltaEdad({ integral: 45, cronologica: 42 })).toBe('3 años por encima');
    expect(tonoDeltaEdad({ integral: 45, cronologica: 42 })).toBe('advertencia');
  });
  it('en línea', () => {
    expect(textoDeltaEdad({ integral: 42.02, cronologica: 42 })).toBe('En línea con tu edad real');
    expect(tonoDeltaEdad({ integral: 42.02, cronologica: 42 })).toBe('neutro');
  });
  it('decimal y singular', () => {
    expect(textoDeltaEdad({ integral: 40.5, cronologica: 42 })).toBe('1.5 años más joven');
    expect(textoDeltaEdad({ integral: 43, cronologica: 42 })).toBe('1 año por encima');
  });
  it('no lleva em dash ni palabras rojas', () => {
    for (const e of [{ integral: 35, cronologica: 42 }, { integral: 45, cronologica: 42 }, { integral: 42, cronologica: 42 }]) {
      const t = textoDeltaEdad(e);
      expect(t).not.toContain('—');
      expect(t.toLowerCase()).not.toMatch(/diagn|tratamiento|cura|previene/);
    }
  });
  it('el número grande va a un decimal', () => {
    expect(edadIntegralTexto({ integral: 41.26, cronologica: 42 })).toBe('41.3');
  });
});

describe('top3Marcadores', () => {
  it('prioriza lo que pide atención, luego peso, y devuelve los objetos completos', () => {
    const lista = [
      m('a_optimo', 'optimo', 5), m('b_atencion', 'atencion', 1), m('c_aceptable', 'aceptable', 3),
      m('d_atencion', 'atencion', 4), m('e_sin_banda', 'sin_banda', 9),
    ];
    const top = top3Marcadores(lista);
    expect(top.map((x) => x.key)).toEqual(['d_atencion', 'b_atencion', 'c_aceptable']);
    expect(top[0].etiqueta).toBe('D_ATENCION');
  });
  it('con tres o menos salen todos, y los duplicados no cuentan dos veces', () => {
    expect(top3Marcadores([m('x', 'optimo'), m('x', 'optimo'), m('y', 'atencion')]).map((x) => x.key))
      .toEqual(['y', 'x']);
  });
  it('sin marcadores, lista vacía', () => {
    expect(top3Marcadores([])).toEqual([]);
  });
});

describe('fecha de la toma (20-sep-2026)', () => {
  it('fechaTomaCorta lee dia, mes corto y anio; con solo mes no inventa dia', () => {
    expect(fechaTomaCorta('2026-05-12')).toBe('12 may 2026');
    expect(fechaTomaCorta('2026-05-12T10:00:00Z')).toBe('12 may 2026');
    expect(fechaTomaCorta('2026-05')).toBe('may 2026');
    expect(fechaTomaCorta(null)).toBeNull();
    expect(fechaTomaCorta('ayer')).toBe('ayer');
  });
  it('ultimaToma es la mas reciente; sin fechas es null', () => {
    expect(ultimaToma([m('a', 'optimo', 1, '2026-01-10'), m('b', 'optimo', 1, '2026-09-01'), m('c', 'optimo', 1, null)])).toBe('2026-09-01');
    expect(ultimaToma([m('c', 'optimo', 1, null)])).toBeNull();
    expect(ultimaToma([])).toBeNull();
  });
  it('esDeTomaAnterior: mas alla de la ventana es anterior; dentro, o sin fecha, no', () => {
    const ultima = '2026-09-01';
    expect(esDeTomaAnterior(m('a', 'atencion', 1, '2026-05-01'), ultima)).toBe(true);
    expect(esDeTomaAnterior(m('a', 'atencion', 1, '2026-08-20'), ultima)).toBe(false);
    expect(esDeTomaAnterior(m('a', 'atencion', 1, null), ultima)).toBe(false);
    expect(esDeTomaAnterior(m('a', 'atencion', 1, '2026-05-01'), null)).toBe(false);
    expect(VENTANA_MISMO_ESTUDIO_DIAS).toBe(30);
  });
  it('un valor de hace meses en atencion NO gana sobre los optimos del ultimo estudio', () => {
    const lista = [
      m('viejo_atencion', 'atencion', 9, '2026-03-01'),
      m('hoy_optimo_1', 'optimo', 1, '2026-09-01'),
      m('hoy_optimo_2', 'optimo', 2, '2026-09-01'),
      m('hoy_aceptable', 'aceptable', 1, '2026-09-02'),
    ];
    expect(top3Marcadores(lista).map((x) => x.key)).toEqual(['hoy_aceptable', 'hoy_optimo_2', 'hoy_optimo_1']);
  });
  it('pero si el ultimo estudio trae menos de tres, los anteriores rellenan (no desaparecen)', () => {
    const lista = [
      m('viejo_atencion', 'atencion', 9, '2026-03-01'),
      m('viejo_optimo', 'optimo', 1, '2026-03-01'),
      m('hoy_optimo', 'optimo', 1, '2026-09-01'),
    ];
    expect(top3Marcadores(lista).map((x) => x.key)).toEqual(['hoy_optimo', 'viejo_atencion', 'viejo_optimo']);
  });
  it('sin fechas todo compite igual que antes', () => {
    const lista = [m('a', 'optimo', 5, null), m('b', 'atencion', 1, null), m('c', 'aceptable', 3, null)];
    expect(top3Marcadores(lista).map((x) => x.key)).toEqual(['b', 'c', 'a']);
  });
});

describe('cuentaFueraDeVentana', () => {
  it('cuenta atención y aceptable; óptimo y sin banda no', () => {
    expect(cuentaFueraDeVentana([m('a', 'optimo'), m('b', 'atencion'), m('c', 'aceptable'), m('d', 'sin_banda')])).toBe(2);
  });
});
