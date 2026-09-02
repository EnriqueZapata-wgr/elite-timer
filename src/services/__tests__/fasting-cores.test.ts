/**
 * Núcleos de ayuno (31-ago-2026): "cumplí mi ayuno", día canónico, cierre
 * automático, huella del cierre y tira semanal. Los casos de borde vienen del
 * encargo de la noche: ayuno que cruza medianoche, ayuno abierto, cerrado antes
 * de la meta, meta de 16 h y cierre a las 15:59.
 */
import { describe, it, expect } from 'vitest';
import {
  ayunoCumplido, metaAlcanzada, fraccionDeMeta, horasEntre, diaCanonico, diasAntes,
  TOLERANCIA_META, VENTANA_DIA_CANONICO_DIAS,
} from '../fasting-cumplido-core';
import {
  decidirCierre, MAX_FAST_HOURS, FAST_CORRUPT_THRESHOLD_HOURS,
  leerHuella, serializarHuella, eventoDejaHuella,
} from '../fasting-autoclose-core';
import { construirSemana, formatDuration, formatSince, safeDate, fastErrorCopy } from '../fasting-screen-core';
import { calcularRacha } from '../fasting-stats-core';

/** ISO de una hora LOCAL (los días canónicos se calculan en local, regla #3). */
const L = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(y, mo - 1, d, h, mi).toISOString();
const fechaLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const H = 3_600_000;

describe('ayunoCumplido: ayuno CERRADO, con la tolerancia del calendario', () => {
  it('cumple al 95 % de la meta y no por debajo', () => {
    expect(TOLERANCIA_META).toBe(0.95);
    expect(ayunoCumplido({ status: 'completed', actual_hours: 16, target_hours: 16 })).toBe(true);
    expect(ayunoCumplido({ status: 'completed', actual_hours: 15.3, target_hours: 16 })).toBe(true);
    expect(ayunoCumplido({ status: 'completed', actual_hours: 14, target_hours: 16 })).toBe(false);
  });

  it('meta de 16 h cerrada a las 15:59 cuenta como cumplida', () => {
    expect(ayunoCumplido({ status: 'completed', actual_hours: 15 + 59 / 60, target_hours: 16 })).toBe(true);
  });

  it('solo completed cuenta: ni cancelado ni abierto', () => {
    expect(ayunoCumplido({ status: 'cancelled', actual_hours: 16, target_hours: 16 })).toBe(false);
    expect(ayunoCumplido({ status: 'active', actual_hours: null, target_hours: 16 })).toBe(false);
  });

  it('sin meta cuenta; sin horas o con 0 h no', () => {
    expect(ayunoCumplido({ status: 'completed', actual_hours: 14, target_hours: null })).toBe(true);
    expect(ayunoCumplido({ status: 'completed', actual_hours: 0, target_hours: null })).toBe(false);
    expect(ayunoCumplido({ status: 'completed', actual_hours: null, target_hours: 16 })).toBe(false);
  });
});

describe('metaAlcanzada: ayuno EN CURSO, estricta', () => {
  it('a las 15:59 de 16 todavía no llegó; a las 16:00 sí', () => {
    expect(metaAlcanzada(15 + 59 / 60, 16)).toBe(false);
    expect(metaAlcanzada(16, 16)).toBe(true);
    expect(metaAlcanzada(25.3, 16)).toBe(true);
  });

  it('sin meta útil o con horas basura, nunca', () => {
    expect(metaAlcanzada(12, 0)).toBe(false);
    expect(metaAlcanzada(12, null)).toBe(false);
    expect(metaAlcanzada(NaN, 16)).toBe(false);
  });
});

describe('fraccionDeMeta y horasEntre', () => {
  it('fracción topada a 1 y con meta por omisión de 16', () => {
    expect(fraccionDeMeta(8, 16)).toBe(0.5);
    expect(fraccionDeMeta(20, 16)).toBe(1);
    expect(fraccionDeMeta(8, null)).toBe(0.5);
    expect(fraccionDeMeta(null, 16)).toBe(0);
  });

  it('horasEntre rechaza fin antes de inicio y basura', () => {
    expect(horasEntre('2026-08-30T20:00:00.000Z', '2026-08-31T12:00:00.000Z')).toBe(16);
    expect(horasEntre('2026-08-31T12:00:00.000Z', '2026-08-30T20:00:00.000Z')).toBe(null);
    expect(horasEntre('basura', '2026-08-31T12:00:00.000Z')).toBe(null);
  });
});

describe('diaCanonico: el día en que TERMINA', () => {
  it('ayuno que cruza medianoche cae en el día de fin', () => {
    expect(diaCanonico({ fast_start: L(2026, 8, 30, 20), fast_end: L(2026, 8, 31, 12), date: '2026-08-30' })).toBe('2026-08-31');
  });

  it('ayuno abierto cae en el día de inicio', () => {
    expect(diaCanonico({ fast_start: L(2026, 8, 30, 20), fast_end: null, date: '2026-08-30' })).toBe('2026-08-30');
  });

  it('sin timestamps cae a `date`; sin nada, null', () => {
    expect(diaCanonico({ fast_start: 'basura', fast_end: null, date: '2026-08-30' })).toBe('2026-08-30');
    expect(diaCanonico({ fast_start: null, fast_end: null })).toBe(null);
  });

  it('diasAntes aguanta cruces de mes y de año', () => {
    expect(VENTANA_DIA_CANONICO_DIAS).toBe(6);
    expect(diasAntes('2026-09-01', 6)).toBe('2026-08-26');
    expect(diasAntes('2027-01-02', 6)).toBe('2026-12-27');
  });
});

describe('calcularRacha con día canónico', () => {
  it('el 16:8 de anoche cuenta HOY, no ayer', () => {
    const r = calcularRacha([
      { actual_hours: 16, status: 'completed', date: '2026-08-29', fast_start: L(2026, 8, 29, 20), fast_end: L(2026, 8, 30, 12) },
      { actual_hours: 16, status: 'completed', date: '2026-08-30', fast_start: L(2026, 8, 30, 20), fast_end: L(2026, 8, 31, 12) },
    ], '2026-08-31');
    expect(r).toBe(2);
  });

  it('las filas sin timestamps siguen usando `date`', () => {
    const dias = (...ds: string[]) => ds.map((date) => ({ actual_hours: 16, status: 'completed', date }));
    expect(calcularRacha(dias('2026-08-26', '2026-08-25', '2026-08-24'), '2026-08-26')).toBe(3);
  });
});

describe('decidirCierre: la política de 120 / 144 h', () => {
  const ini = new Date('2026-08-20T00:00:00.000Z').getTime();
  const iso = new Date(ini).toISOString();

  it('por debajo de 120 h mantiene', () => {
    expect(decidirCierre(iso, ini + 119.99 * H)).toMatchObject({ accion: 'mantener' });
    expect(decidirCierre(iso, ini + 16 * H)).toMatchObject({ accion: 'mantener', horas: 16 });
  });

  it('entre 120 y 144 h cierra a 120 exactas, con fin = inicio + 120 h (no "ahora")', () => {
    const d = decidirCierre(iso, ini + 130 * H);
    expect(d.accion).toBe('cerrar_en_limite');
    if (d.accion === 'cerrar_en_limite') {
      expect(d.horas).toBe(MAX_FAST_HOURS);
      expect(d.fin.getTime()).toBe(ini + 120 * H);
    }
    expect(decidirCierre(iso, ini + 144 * H).accion).toBe('cerrar_en_limite');
  });

  it('pasado de 144 h cancela como olvidado; inicio basura cancela como inválido', () => {
    expect(FAST_CORRUPT_THRESHOLD_HOURS).toBe(144);
    expect(decidirCierre(iso, ini + 144.01 * H)).toMatchObject({ accion: 'cancelar', motivo: 'olvidado' });
    expect(decidirCierre('basura', ini)).toMatchObject({ accion: 'cancelar', motivo: 'inicio_invalido' });
    expect(decidirCierre(null, ini)).toMatchObject({ accion: 'cancelar', motivo: 'inicio_invalido' });
  });
});

describe('huella del auto-cierre: el aviso §2.5 tiene que llegar a la pantalla', () => {
  it('solo el cierre a límite y el olvidado dejan huella', () => {
    expect(eventoDejaHuella('cerrado_en_limite')).toBe(true);
    expect(eventoDejaHuella('cancelado_olvidado')).toBe(true);
    expect(eventoDejaHuella('cancelado_invalido')).toBe(false);
    expect(eventoDejaHuella('ya_cerrado')).toBe(false);
  });

  it('ida y vuelta, y basura devuelve null', () => {
    const raw = serializarHuella({ fastId: 'abc', evento: 'cerrado_en_limite', cuando: '2026-08-31T10:00:00.000Z' });
    expect(leerHuella(raw)).toEqual({ fastId: 'abc', evento: 'cerrado_en_limite', cuando: '2026-08-31T10:00:00.000Z' });
    expect(leerHuella(null)).toBe(null);
    expect(leerHuella('')).toBe(null);
    expect(leerHuella('{no es json')).toBe(null);
    expect(leerHuella(JSON.stringify({ fastId: 'abc', evento: 'ya_cerrado', cuando: 'x' }))).toBe(null);
    expect(leerHuella(JSON.stringify({ evento: 'cerrado_en_limite', cuando: 'x' }))).toBe(null);
  });
});

describe('construirSemana: la tira por día canónico', () => {
  const hoy = new Date(2026, 7, 31, 10, 0); // lunes 31 de agosto

  it('el ayuno que cruza medianoche pinta HOY y deja AYER vacío', () => {
    const sem = construirSemana([
      { actual_hours: 16, target_hours: 16, date: '2026-08-30', fast_start: L(2026, 8, 30, 20), fast_end: L(2026, 8, 31, 12) },
    ], hoy, 0.3, fechaLocal);
    expect(sem).toHaveLength(7);
    expect(sem[6]).toMatchObject({ key: '2026-08-31', isToday: true, pct: 1, letter: 'L' });
    expect(sem[5]).toMatchObject({ key: '2026-08-30', pct: 0 });
    expect(sem[0].key).toBe('2026-08-25');
  });

  it('dos ayunos el mismo día: gana el mejor; el activo pinta su progreso', () => {
    const sem = construirSemana([
      { actual_hours: 8, target_hours: 16, fast_start: L(2026, 8, 28, 20), fast_end: L(2026, 8, 29, 4) },
      { actual_hours: 12, target_hours: 16, fast_start: L(2026, 8, 28, 6), fast_end: L(2026, 8, 29, 6) },
    ], hoy, 0.3, fechaLocal);
    expect(sem[4].pct).toBe(0.75);
    expect(sem[6].pct).toBe(0.3);
    expect(construirSemana([], hoy, null, fechaLocal)[6].pct).toBe(0);
  });
});

describe('formateadores de la pantalla', () => {
  it('duración y "desde tu último ayuno"', () => {
    expect(formatDuration(990)).toBe('16h 30m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(-90)).toBe('0m');
    expect(formatSince(2880)).toBe('2 días');
    expect(formatSince(1500)).toBe('25h 0m');
  });

  it('safeDate y el copy de errores', () => {
    expect(safeDate('basura')).toBe(null);
    expect(safeDate(null)).toBe(null);
    expect(safeDate('2026-08-31T00:00:00Z')).toBeInstanceOf(Date);
    expect(fastErrorCopy('already_closed')).toContain('ya estaba cerrado');
    expect(fastErrorCopy('fin_antes_de_inicio')).toBe('El fin debe ser después del inicio.');
  });
});
