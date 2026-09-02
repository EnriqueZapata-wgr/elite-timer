import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/src/lib/logger', () => ({ warn: vi.fn(), error: vi.fn(), log: vi.fn() }));

import {
  fcMaxima, zonasKarvonen, zonaDeFC, vo2maxUth, vo2maxCooper, vo2maxRockport,
  edadDesdeFechas, restarDias, minutosPorZona, resumirSesiones,
  type SesionCardioLite,
} from '../cardio-core';
import { clasificarVo2 } from '../cardio-perfil-service';

// Valores de las publicaciones originales (ver FUENTES_CARDIO). Si un test de
// aqui falla porque alguien "ajusto" una constante, el ratchet gana: la
// constante vuelve a la de la fuente o la funcion se retira con Mariana.

describe('fcMaxima (Tanaka 2001: 208 - 0.7 * edad)', () => {
  it('40 años -> 180, 20 -> 194, 60 -> 166', () => {
    expect(fcMaxima(40)).toBe(180);
    expect(fcMaxima(20)).toBe(194);
    expect(fcMaxima(60)).toBe(166);
  });
  it('fuera del rango estudiado (18 a 81) o sin edad -> null, nunca inventa', () => {
    expect(fcMaxima(17)).toBeNull();
    expect(fcMaxima(82)).toBeNull();
    expect(fcMaxima(null)).toBeNull();
    expect(fcMaxima(NaN)).toBeNull();
  });
});

describe('zonasKarvonen (FCR = FCmax - FCreposo; zona = FCreposo + %FCR)', () => {
  const z = zonasKarvonen(180, 60)!;
  it('FCmax 180 / reposo 60 -> FCR 120: cortes 120/132/144/156/168/180', () => {
    expect(z.map((x) => [x.desde, x.hasta])).toEqual([[120, 132], [132, 144], [144, 156], [156, 168], [168, 180]]);
  });
  it('falta un dato o reposo >= maxima -> null', () => {
    expect(zonasKarvonen(180, null)).toBeNull();
    expect(zonasKarvonen(null, 60)).toBeNull();
    expect(zonasKarvonen(180, 190)).toBeNull();
  });
  it('zonaDeFC: 0 por debajo de zona 1, 5 por arriba de FCmax', () => {
    expect(zonaDeFC(100, z)).toBe(0);
    expect(zonaDeFC(120, z)).toBe(1);
    expect(zonaDeFC(131, z)).toBe(1);
    expect(zonaDeFC(132, z)).toBe(2);
    expect(zonaDeFC(150, z)).toBe(3);
    expect(zonaDeFC(160, z)).toBe(4);
    expect(zonaDeFC(170, z)).toBe(5);
    expect(zonaDeFC(195, z)).toBe(5);
    expect(zonaDeFC(null, z)).toBeNull();
    expect(zonaDeFC(150, null)).toBeNull();
  });
});

describe('vo2maxUth (Uth 2004: 15.3 * FCmax / FCreposo)', () => {
  it('190 / 60 -> 48.5 (ejemplo del brief)', () => {
    expect(vo2maxUth(190, 60)).toBe(48.5);
  });
  it('180 / 60 -> 45.9', () => {
    expect(vo2maxUth(180, 60)).toBe(45.9);
  });
  it('sin dato o sin sentido -> null', () => {
    expect(vo2maxUth(null, 60)).toBeNull();
    expect(vo2maxUth(180, null)).toBeNull();
    expect(vo2maxUth(180, 200)).toBeNull();
  });
});

describe('clasificarVo2 (bordes 36, 42, 50: estado y banda no se contradicen)', () => {
  // 4EP (31-ago-2026): score9Bands abre con >= y cierra con <; la banda pintada
  // tiene que seguir la misma regla o en el limite exacto se contradicen.
  it('36 -> aceptable, banda 36 a 42', () => {
    expect(clasificarVo2(36, 'male')).toEqual({ estado: 'aceptable', banda: { lo: 36, hi: 42 } });
  });
  it('42 -> optimo, banda 42 a 50', () => {
    expect(clasificarVo2(42, 'female')).toEqual({ estado: 'optimo', banda: { lo: 42, hi: 50 } });
  });
  it('50 -> optimo, banda 50 a 100; 100 inclusivo; 30 -> atencion 30 a 36', () => {
    expect(clasificarVo2(50, 'male')).toEqual({ estado: 'optimo', banda: { lo: 50, hi: 100 } });
    expect(clasificarVo2(100, 'male')).toEqual({ estado: 'optimo', banda: { lo: 50, hi: 100 } });
    expect(clasificarVo2(30, 'male')).toEqual({ estado: 'atencion', banda: { lo: 30, hi: 36 } });
    expect(clasificarVo2(29.9, 'male')).toEqual({ estado: 'atencion', banda: { lo: null, hi: 30 } });
    expect(clasificarVo2(101, 'male')).toBeNull();
    expect(clasificarVo2(45, null)).toBeNull();
  });
});

describe('vo2maxCooper (1968: (m - 504.9) / 44.73)', () => {
  it('2400 m -> 42.4; 3000 m -> 55.8 (mismo redondeo que /tests/run/cooper)', () => {
    expect(vo2maxCooper(2400)).toBe(42.4);
    expect(vo2maxCooper(3000)).toBe(55.8);
  });
  it('fuera de 505 a 5000 m -> null', () => {
    expect(vo2maxCooper(500)).toBeNull();
    expect(vo2maxCooper(5001)).toBeNull();
    expect(vo2maxCooper(null)).toBeNull();
  });
});

describe('vo2maxRockport (Kline 1987)', () => {
  const base = { pesoKg: 70, edad: 40, sexo: 'male' as const, tiempoMin: 15, fcFinal: 120 };
  const esperado = 132.853 - 0.0769 * 70 * 2.20462 - 0.3877 * 40 + 6.315 - 3.2649 * 15 - 0.1565 * 120;
  it('reproduce la ecuacion con el peso convertido a libras', () => {
    expect(vo2maxRockport(base)).toBe(Math.round(esperado * 10) / 10);
  });
  it('mujer: sin el termino 6.315', () => {
    expect(vo2maxRockport({ ...base, sexo: 'female' })).toBe(Math.round((esperado - 6.315) * 10) / 10);
  });
  it('falta un dato -> null', () => {
    expect(vo2maxRockport({ ...base, pesoKg: null })).toBeNull();
    expect(vo2maxRockport({ ...base, sexo: null })).toBeNull();
  });
});

describe('fechas sin zona horaria', () => {
  it('edadDesdeFechas cuenta cumpleaños', () => {
    expect(edadDesdeFechas('1986-08-31', '2026-08-31')).toBe(40);
    expect(edadDesdeFechas('1986-09-01', '2026-08-31')).toBe(39);
    expect(edadDesdeFechas(null, '2026-08-31')).toBeNull();
  });
  it('restarDias cruza mes y año', () => {
    expect(restarDias('2026-08-31', 28)).toBe('2026-08-03');
    expect(restarDias('2026-03-01', 1)).toBe('2026-02-28');
    expect(restarDias('2026-01-01', 1)).toBe('2025-12-31');
  });
});

describe('minutosPorZona y resumen', () => {
  const z = zonasKarvonen(180, 60);
  const ses: SesionCardioLite[] = [
    { date: '2026-08-30', discipline: 'running', duration_seconds: 1800, distance_meters: 5000, avg_heart_rate: 150, source: 'manual' },
    { date: '2026-08-29', discipline: 'cycling', duration_seconds: 3600, distance_meters: null, avg_heart_rate: null, source: 'manual' },
    { date: '2026-08-28', discipline: 'running', duration_seconds: 600, distance_meters: 2000, avg_heart_rate: 100, source: 'health_connect' },
    { date: '2026-08-01', discipline: 'running', duration_seconds: 1200, distance_meters: 3000, avg_heart_rate: 170, source: 'manual' },
    { date: '2026-08-27', discipline: 'rowing', duration_seconds: null, distance_meters: null, avg_heart_rate: 150, source: 'manual' },
  ];
  it('cada sesion entera va a la zona de su FC media; sin FC se cuenta aparte', () => {
    const mz = minutosPorZona(ses, z)!;
    expect(mz.minutos).toEqual([0, 0, 30, 0, 20]);
    expect(mz.bajoZona1).toBe(10);
    expect(mz.sinFC).toBe(60);
    expect(mz.totalMin).toBe(120);
    expect(mz.sesiones).toBe(4);
    expect(mz.sesionesConFC).toBe(3);
  });
  it('sin zonas -> null (no se reparte nada)', () => {
    expect(minutosPorZona(ses, null)).toBeNull();
  });
  it('resumirSesiones respeta la ventana inclusive', () => {
    const rs = resumirSesiones(ses, '2026-08-25', '2026-08-31');
    expect(rs).toMatchObject({ sesiones: 4, totalMin: 100, km: 7, conFC: 3 });
    expect(resumirSesiones(ses, '2026-08-04', '2026-08-31').sesiones).toBe(4);
    expect(resumirSesiones(ses, '2026-08-01', '2026-08-31').sesiones).toBe(5);
  });
});
