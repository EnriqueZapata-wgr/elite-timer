/**
 * Tests que amarran LA función de fase (MB-27 Pieza 3, mutaciones 9 y 10).
 *
 * Una sola función, una sola fuente: la misma usuaria, el mismo día, da la
 * misma fase en /cycle, en el calendario y en Entrenar. La mutación que
 * plante umbrales locales en un consumidor truena en el ratchet de abajo.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  getPhase, resolverCiclo, largoDeCiclo, FRESCURA_DIAS_EXTRA,
  PHASE_FOLLICULAR_END, PHASE_OVULATION_END, predecirProximo,
  predecirOvulacion, LUTEA_ESTANDAR, LUTEA_CICLO_CORTO } from '@/src/services/cycle/cycle-phase-core';
import { agruparPeriodos } from '@/src/services/cycle/cycle-periods-core';
import { toLocalDateString } from '@/src/utils/date-helpers';

const ROOT = path.resolve(__dirname, '../../../..');

describe('getPhase — el corte canónico', () => {
  it('ciclo de 28 y periodo de 5: menstrual 1-5, folicular 6-13, ovulación 14-16, lútea 17+', () => {
    expect(getPhase(1)).toBe('menstrual');
    expect(getPhase(5)).toBe('menstrual');
    expect(getPhase(6)).toBe('follicular');
    expect(getPhase(13)).toBe('follicular');
    expect(getPhase(14)).toBe('ovulation');
    expect(getPhase(16)).toBe('ovulation');
    expect(getPhase(17)).toBe('luteal');
    expect(getPhase(28)).toBe('luteal');
  });

  it('los cortes escalan con la duración del ciclo (0.46 / 0.57)', () => {
    // Ciclo de 32: folicular hasta round(32*0.46)=15, ovulación hasta round(32*0.57)=18.
    expect(getPhase(15, 32)).toBe('follicular');
    expect(getPhase(16, 32)).toBe('ovulation');
    expect(getPhase(18, 32)).toBe('ovulation');
    expect(getPhase(19, 32)).toBe('luteal');
    expect(PHASE_FOLLICULAR_END).toBe(0.46);
    expect(PHASE_OVULATION_END).toBe(0.57);
  });

  it('un ciclo alargado no inventa fases: más allá del largo sigue lútea', () => {
    expect(getPhase(35, 28)).toBe('luteal');
  });

  it('el copy canónico de PHASES cubre las cuatro fases (a nivel fuente: el arnés es node-only)', () => {
    // cycle-service jala supabase→react-native: no se importa desde tests.
    const src = fs.readFileSync(path.join(ROOT, 'src/services/cycle-service.ts'), 'utf8');
    for (const phase of ['menstrual', 'follicular', 'ovulation', 'luteal']) {
      expect(src, `PHASES.${phase} falta en cycle-service`).toMatch(
        new RegExp(`${phase}: \\{[\\s\\S]*?exercise: '[^']+'`),
      );
    }
  });
});

describe('audit B1: UNA resolución de {inicio, largo, periodo} para todas las superficies', () => {
  // Usuaria del caso del audit: ciclos observados de 31 días (3 inicios con
  // gaps de 31), ajuste manual en 28, hoy es su día 14.
  const PERIODS_31 = [
    { start_date: '2026-07-24' }, // inicio actual → hoy 2026-08-06 = día 14
    { start_date: '2026-06-23' },
    { start_date: '2026-05-23' },
  ];

  it('el caso del audit da UNA fase: observado 31 manda sobre ajuste 28 → folicular', () => {
    const res = resolverCiclo({
      periods: PERIODS_31,
      avgCycleLength: 28,
      avgPeriodLength: 5,
      hoy: '2026-08-06',
    });
    // round(31·0.46) = 14 → día 14 sigue folicular. La vieja resolución de
    // Entrenar (ajuste 28: round(28·0.46) = 13) habría dicho ovulación:
    expect(getPhase(14, 28, 5)).toBe('ovulation'); // lo que decía Entrenar
    expect(res).toMatchObject({
      day: 14, cycleLen: 31, phase: 'follicular', largoFuente: 'observado',
    });
    // La MISMA entrada da la MISMA salida para /cycle, sus bandas y
    // Entrenar: las tres superficies llaman esta función (ratchet abajo).
  });

  it('sin ciclos observados suficientes manda el ajuste manual', () => {
    const res = resolverCiclo({
      periods: [{ start_date: '2026-07-24' }],
      avgCycleLength: 30,
      avgPeriodLength: 6,
      hoy: '2026-08-06',
    });
    expect(res).toMatchObject({ cycleLen: 30, periodLen: 6, largoFuente: 'ajuste' });
    expect(largoDeCiclo([], null)).toMatchObject({ cycleLen: 28, fuente: 'ajuste' });
  });

  it('guarda de frescura ADENTRO: sin periodo nuevo tras largo+14 días no hay fase', () => {
    // Último periodo hace ~187 días: nadie ve "fase lútea, día 187".
    const res = resolverCiclo({
      periods: [{ start_date: '2026-02-01' }],
      avgCycleLength: 28,
      avgPeriodLength: 5,
      hoy: '2026-08-06',
    });
    expect(res).toBe(null);
    // La frontera exacta: día cycleLen+14 aún resuelve; +15 ya no.
    expect(resolverCiclo({
      periods: [{ start_date: '2026-07-01' }], avgCycleLength: 28, hoy: '2026-08-11',
    })?.day).toBe(28 + FRESCURA_DIAS_EXTRA);
    expect(resolverCiclo({
      periods: [{ start_date: '2026-07-01' }], avgCycleLength: 28, hoy: '2026-08-12',
    })).toBe(null);
  });

  it('precedencia de inicio: cycle_periods manda; los logs solo son fallback sin periods', () => {
    const conAmbos = resolverCiclo({
      periods: [{ start_date: '2026-07-24' }],
      inicioDeLogs: '2026-08-01',
      avgCycleLength: 28,
      hoy: '2026-08-06',
    });
    expect(conAmbos?.inicio).toBe('2026-07-24');
    const soloLogs = resolverCiclo({
      periods: [],
      inicioDeLogs: '2026-08-01',
      avgCycleLength: 28,
      hoy: '2026-08-06',
    });
    expect(soloLogs?.inicio).toBe('2026-08-01');
    expect(soloLogs?.day).toBe(6);
    expect(resolverCiclo({ periods: [], hoy: '2026-08-06' })).toBe(null);
  });

  it('fecha futura respecto al inicio → null (no se inventa día negativo)', () => {
    expect(resolverCiclo({
      periods: [{ start_date: '2026-08-10' }], avgCycleLength: 28, hoy: '2026-08-06',
    })).toBe(null);
  });
});

describe('audit V2 B1: el zombi de cycle_periods, EJECUTABLE (no textual)', () => {
  /** Días consecutivos desde un inicio 'YYYY-MM-DD'. */
  const marcar = (inicio: string, dias: number): string[] => {
    const [y, m, d] = inicio.split('-').map(Number);
    return Array.from({ length: dias }, (_, i) => {
      const f = new Date(y, m - 1, d + i, 12);
      return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    });
  };
  // El caso del audit: ciclos reales 23-may, 23-jun, 24-jul (5 días c/u).
  const LOGS_REALES = [
    ...marcar('2026-05-23', 5), ...marcar('2026-06-23', 5), ...marcar('2026-07-24', 5),
  ];

  it('marcar por error y desmarcar deja los períodos EXACTAMENTE como antes', () => {
    const antes = agruparPeriodos(LOGS_REALES);
    expect(antes.map((p) => p.start_date)).toEqual(['2026-05-23', '2026-06-23', '2026-07-24']);
    // La usuaria marca el 20-ago por error → el período fantasma existe:
    const zombi = agruparPeriodos([...LOGS_REALES, '2026-08-20']);
    expect(zombi.map((p) => p.start_date)).toContain('2026-08-20');
    // Desmarca → recalc corre con CUALQUIER cambio de is_period (la
    // pantalla ya reconstruye también al desmarcar) → idéntico al original:
    expect(agruparPeriodos(LOGS_REALES)).toEqual(antes);
  });

  it('la MISMA fase en todas las superficies con los mismos datos (los dos caminos de entrada)', () => {
    const periodos = agruparPeriodos(LOGS_REALES);
    const periodsDesc = [...periodos].reverse().map((p) => ({ start_date: p.start_date }));
    const hoy = '2026-08-20';
    // Camino de getCycleInfo (Entrenar/day-compiler/motor): solo periods.
    const viaInfo = resolverCiclo({ periods: periodsDesc, avgCycleLength: 28, avgPeriodLength: 5, hoy });
    // Camino de la card de /cycle: periods + inicio derivado de logs.
    const viaPantalla = resolverCiclo({
      periods: periodsDesc, inicioDeLogs: '2026-07-24', avgCycleLength: 28, avgPeriodLength: 5, hoy,
    });
    expect(viaPantalla).toEqual(viaInfo);
    // Y es la fase CORRECTA: día 28 de un ciclo observado de 31 → lútea.
    expect(viaInfo).toMatchObject({ day: 28, cycleLen: 31, phase: 'luteal', largoFuente: 'observado' });
  });

  it('con el zombi vivo la fase se corrompía a Día 1 Menstrual y el observado promediaba basura', () => {
    const zombi = agruparPeriodos([...LOGS_REALES, '2026-08-20']);
    const zombiDesc = [...zombi].reverse().map((p) => ({ start_date: p.start_date }));
    const res = resolverCiclo({ periods: zombiDesc, avgCycleLength: 28, avgPeriodLength: 5, hoy: '2026-08-20' });
    // Esto es lo que TODAS las superficies decían tras desmarcar (sin el fix):
    expect(res).toMatchObject({ day: 1, phase: 'menstrual' });
    // Y el hueco de 27 días pasaba el filtro fisiológico → promedio contaminado.
    expect(res?.largoFuente).toBe('observado');
    expect(res?.cycleLen).not.toBe(31);
  });

  it('desmarcar el último día con período deja la lista vacía (la tabla se limpia)', () => {
    expect(agruparPeriodos([])).toEqual([]);
    // Y el agrupado aguanta desorden y duplicados (la query ya ordena, pero
    // el core no depende de eso):
    const desordenado = agruparPeriodos(['2026-07-26', '2026-07-24', '2026-07-25', '2026-07-24']);
    expect(desordenado).toEqual([
      { start_date: '2026-07-24', end_date: '2026-07-26', period_length: 3, cycle_length: null },
    ]);
  });

  it('ratchet: la pantalla reconstruye ante cualquier cambio y todo el calendario usa UNA ancla', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app/cycle.tsx'), 'utf8');
    // recalc con marcar Y desmarcar (comparación contra el valor previo):
    expect(src).toMatch(/!== periodoAntes\) await recalcPeriods\(\)/);
    expect(src, 'el recalc solo-al-marcar no puede volver').not.toMatch(/if \(d\.is_period\) await recalcPeriods/);
    // el agrupado es el del core (con el zombi en test):
    expect(src).toMatch(/agruparPeriodos/);
    // predicciones y bandas comparten ancla:
    expect(src).toMatch(/inicioCalendario/);
    expect(src, 'las predicciones no pueden re-anclarse a los logs').not.toMatch(/addDays\(lastPeriodStart/);
  });
});

describe('mutación 9: los umbrales viven en UN solo lugar', () => {
  // Nota del audit: CycleCalendar.tsx murió (cero importadores vivos — el
  // ratchet amarraba un componente muerto). Si renace, entra a esta lista.
  const CONSUMIDORES = [
    'app/cycle.tsx',
    'src/services/cycle-service.ts',
    'app/fitness-train.tsx',
  ];

  it('ningún consumidor redefine 0.46/0.57 ni el ovDay = len/2 viejo', () => {
    for (const rel of CONSUMIDORES) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} redefine umbrales de fase`).not.toMatch(/0\.46|0\.57/);
      // 23-ago-2026: este candado anclaba el NOMBRE DE LA VARIABLE
      // (`const ovDay = ...`) y el código real decía `const ovDate = ...`,
      // así que la regex nunca hizo match y el ratchet pasó en verde durante
      // meses con la fórmula prohibida viva en app/cycle.tsx. Ahora ancla la
      // ARITMÉTICA, que es lo que no puede volver, sin importar cómo se llame.
      expect(src, `${rel} vuelve a partir el ciclo a la mitad para ovular`).not.toMatch(
        /Math\.round\(\s*[\w.$]+\s*\/\s*2\s*\)/,
      );
    }
  });

  it('audit B1: las superficies consumen LA RESOLUCIÓN, no solo la función de fase', () => {
    const usaCore = (rel: string, patron: RegExp, msg: string) => {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel}: ${msg}`).toMatch(patron);
    };
    // La card de /cycle y getCycleInfo (Entrenar/day-compiler/motor) pasan
    // por resolverCiclo: mismo inicio, mismo largo, misma guarda. (El viejo
    // CycleCalendar.tsx se borró: cero importadores vivos.)
    usaCore('app/cycle.tsx', /resolverCiclo/, 'la card debe resolver con resolverCiclo');
    usaCore('src/services/cycle-service.ts', /resolverCiclo/, 'getCycleInfo debe resolver con resolverCiclo');
    // Y la resolución paralela vieja no puede volver:
    const cycleService = fs.readFileSync(path.join(ROOT, 'src/services/cycle-service.ts'), 'utf8');
    expect(cycleService, 'getCycleDay era la resolución paralela sin frescura').not.toMatch(/function getCycleDay/);
    // 22-ago-2026: predictNext era la OTRA resolución paralela, y a ésta el
    // candado no la cubría. Aprendía el largo con un solo ciclo y caía a 28
    // duro en vez de al ajuste manual, así que ARGOS publicaba una fecha
    // distinta de la que pintaba la tarjeta. Cinco días de diferencia en el
    // ejemplo que lo destapó. La predicción ahora se DERIVA de resolverCiclo.
    expect(cycleService, 'predictNext era una segunda resolución del largo').not.toMatch(
      /function predictNext/,
    );
    expect(cycleService, 'la predicción debe derivarse de la resolución').toMatch(
      /predecirProximo\(res\)/,
    );
    const cycleTsx = fs.readFileSync(path.join(ROOT, 'app/cycle.tsx'), 'utf8');
    expect(cycleTsx, 'las bandas no pueden volver a cortar con settings crudo').not.toMatch(
      /cycleDay = daysDiff >= 0 \? \(daysDiff % settings\.avg_cycle_length\)/,
    );
    // La tira de fase vive en el hub de Fitness desde Ola 2 PR2 (ex
    // fitness-train) y SOLO llega por getCycleInfo: el gate (mujer + modo
    // propio) viene incluido — mutación 10: acompañante y sin-datos degradan
    // a null y la pantalla queda como era.
    usaCore('app/fitness-hub.tsx', /getCycleInfo/, 'la fase del hub de Fitness solo llega por getCycleInfo');
  });

  it('mutación 10: el hub de Fitness no abre camino lateral a las tablas del ciclo', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app/fitness-hub.tsx'), 'utf8');
    expect(src).not.toMatch(/cycle_periods|cycle_daily_logs|cycle_settings/);
  });
});

describe('el vocabulario es uno (la etiqueta ovulatory murió)', () => {
  it('el catálogo y el motor hablan ovulation', () => {
    for (const rel of [
      'src/constants/interventions-catalog.ts',
      'src/services/interventions/personalize-types.ts',
      'src/services/interventions/personalize-interventions.ts',
    ]) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} sigue usando la etiqueta vieja`).not.toMatch(/'ovulatory'/);
    }
  });

});

// MENOR-3 (4EP): este bloque vivía anidado dentro del describe del
// vocabulario, así que el reporte lo listaba como "el vocabulario es uno > la
// predicción...". Nadie lo iba a buscar ahí. Va al nivel raíz, que es donde
// corresponde.
describe('la predicción es la misma cuenta que pinta la tarjeta', () => {
  it('deriva de inicio y cycleLen, no de un promedio propio', () => {
    // El caso que destapó el problema: UN solo intervalo de 27 días y ajuste
    // manual de 32. La doctrina dice que con menos de dos ciclos manda el
    // ajuste, así que el largo es 32 y la próxima cae a 32 días del inicio.
    const res = { inicio: '2026-08-01', day: 22, cycleLen: 32, cyclesUsed: 1 };
    const p = predecirProximo(res);
    expect(toLocalDateString(p.date)).toBe('2026-09-02');
    // Y los días que faltan son el mismo despeje de la tarjeta.
    expect(p.daysUntil).toBe(32 - 22 + 1);
    expect(p.confidence).toBe('baja');
  });

  it('con el ciclo cumplido no devuelve días negativos', () => {
    const p = predecirProximo({ inicio: '2026-07-01', day: 40, cycleLen: 28, cyclesUsed: 3 });
    expect(p.daysUntil).toBe(0);
    expect(p.confidence).toBe('alta');
  });

  // 4EP MEDIO-2: `daysUntil` estaba clampeado a 0 y `date` no, así que con
  // retraso ARGOS publicaba una fecha del pasado con "próximo" delante.
  it('cuando la estimada ya venció lo declara en vez de fingir futuro', () => {
    const p = predecirProximo({ inicio: '2026-07-01', day: 40, cycleLen: 28, cyclesUsed: 3 });
    expect(p.retrasada, 'día 40 de un ciclo de 28 es retraso').toBe(true);
    // 28 - 40 + 1 = -11: la fecha estimada quedó 11 días atrás.
    expect(p.diasDeRetraso).toBe(11);
    // La fecha cruda sigue siendo la estimada, que es del pasado: por eso
    // quien publica tiene que mirar `retrasada` antes de enseñarla.
    expect(toLocalDateString(p.date)).toBe('2026-07-29');
  });

  it('dentro del ciclo no marca retraso', () => {
    const p = predecirProximo({ inicio: '2026-08-01', day: 22, cycleLen: 32, cyclesUsed: 1 });
    expect(p.retrasada).toBe(false);
    expect(p.diasDeRetraso).toBe(0);
  });

  // El borde exacto: la estimada cae HOY, todavía no es retraso.
  it('el día en que cae la estimada todavía no es retraso', () => {
    const p = predecirProximo({ inicio: '2026-08-01', day: 29, cycleLen: 28, cyclesUsed: 3 });
    expect(p.daysUntil).toBe(0);
    expect(p.retrasada).toBe(false);
  });

  it('la confianza sale de cuántos ciclos se usaron de verdad', () => {
    expect(predecirProximo({ inicio: '2026-08-01', day: 1, cycleLen: 28, cyclesUsed: 2 }).confidence)
      .toBe('media');
    expect(predecirProximo({ inicio: '2026-08-01', day: 1, cycleLen: 28 }).confidence)
      .toBe('baja');
  });
});

describe('predecirOvulacion — la ventana fértil, con fuentes', () => {
  // Base documental completa en
  // R and D/CICLO_OVULACION_BASE_DOCUMENTAL_2026-08-23.md

  it('ciclo regular de 28: punto en 14, alta 12-14, baja 9-14', () => {
    const v = predecirOvulacion({ cycleLen: 28, minLen: 28, maxLen: 28, cyclesUsed: 4 })!;
    expect(v.diaOvulacion).toBe(14);
    expect([v.altaInicio, v.altaFin]).toEqual([12, 14]);
    // 9 a 14 son EXACTAMENTE los seis días de Wilcox 1995 para un ciclo de 28:
    // los cinco previos más el día de la ovulación. Si esto cambia, algo se rompió.
    expect([v.bajaInicio, v.bajaFin]).toEqual([9, 14]);
  });

  it('la banda NUNCA mete días posteriores a la ovulación', () => {
    // Wilcox 1995 no registró un solo embarazo por coito posterior a la
    // ovulación. Meter días de más fue una de las razones por las que se mató
    // la fórmula anterior; el reemplazo no puede repetirlo.
    for (let largo = 21; largo <= 45; largo++) {
      for (const [minL, maxL] of [[largo, largo], [largo - 4, largo + 4], [largo - 1, largo + 6]]) {
        const v = predecirOvulacion({ cycleLen: largo, minLen: minL, maxLen: maxL, cyclesUsed: 4 })!;
        expect(v.bajaFin, `largo ${largo} min ${minL} max ${maxL}`).toBeLessThanOrEqual(largo);
      }
    }
  });

  it('usa la fase lútea de ASRM (14) y no parte el ciclo a la mitad', () => {
    // La fórmula vieja daba 20 para un ciclo de 40. La documentada da 26.
    expect(predecirOvulacion({ cycleLen: 40, cyclesUsed: 4 })!.diaOvulacion).toBe(40 - LUTEA_ESTANDAR);
    expect(predecirOvulacion({ cycleLen: 35, cyclesUsed: 4 })!.diaOvulacion).toBe(21);
    expect(predecirOvulacion({ cycleLen: 24, cyclesUsed: 4 })!.diaOvulacion).toBe(10);
  });

  it('ciclos cortos usan la lútea medida por Bull 2019, no la convención', () => {
    // Bull midió 8.0 días de lútea en el tramo de 15 a 20. Con la convención
    // de 14, un ciclo de 18 daría día 4, que es absurdo.
    const v = predecirOvulacion({ cycleLen: 18, cyclesUsed: 4 })!;
    expect(v.luteaUsada).toBe(LUTEA_CICLO_CORTO);
    expect(v.diaOvulacion).toBe(10);
    // El corte está en 20: a 21 ya manda la convención.
    expect(predecirOvulacion({ cycleLen: 21, cyclesUsed: 4 })!.luteaUsada).toBe(LUTEA_ESTANDAR);
  });

  it('la banda baja se ensancha con la variabilidad real de esa persona', () => {
    // Parejo da 10-15 (los seis de Wilcox). Variable 26-32 da 7-18: la
    // incertidumbre se confiesa en el ancho, no en un texto de advertencia.
    const parejo = predecirOvulacion({ cycleLen: 29, minLen: 29, maxLen: 29, cyclesUsed: 4 })!;
    const variable = predecirOvulacion({ cycleLen: 29, minLen: 26, maxLen: 32, cyclesUsed: 4 })!;
    const anchoParejo = parejo.bajaFin - parejo.bajaInicio;
    const anchoVariable = variable.bajaFin - variable.bajaInicio;
    expect(anchoVariable).toBeGreaterThan(anchoParejo);
    // El punto NO se mueve: solo cambia cuánta incertidumbre se confiesa.
    expect(variable.diaOvulacion).toBe(parejo.diaOvulacion);
  });

  it('INVARIANTE: la banda baja siempre contiene a la alta y al punto', () => {
    // Si esto se rompe, la pantalla enseñaría un punto fuera de su propio
    // rango, que es una contradicción visible para la usuaria.
    for (let largo = 15; largo <= 60; largo++) {
      for (let minL = 15; minL <= largo; minL++) {
        for (let maxL = largo; maxL <= 60; maxL += 3) {
          const v = predecirOvulacion({ cycleLen: largo, minLen: minL, maxLen: maxL, cyclesUsed: 3 })!;
          expect(v.bajaInicio).toBeLessThanOrEqual(v.altaInicio);
          expect(v.bajaFin).toBeGreaterThanOrEqual(v.altaFin);
          expect(v.altaInicio).toBeLessThanOrEqual(v.altaFin);
          expect(v.bajaInicio).toBeGreaterThanOrEqual(1);
          expect(v.diaOvulacion).toBeGreaterThanOrEqual(1);
          // La banda no se mete en el ciclo siguiente, donde ya empieza la
          // menstruación predicha.
          expect(v.bajaFin).toBeLessThanOrEqual(largo);
        }
      }
    }
  });

  it('el nivel confiesa cuánta confianza merece el punto', () => {
    // Fuera del rango normal de FIGO (24-38), siempre baja.
    expect(predecirOvulacion({ cycleLen: 23, minLen: 23, maxLen: 23, cyclesUsed: 5 })!.nivel).toBe('baja');
    expect(predecirOvulacion({ cycleLen: 40, minLen: 40, maxLen: 40, cyclesUsed: 5 })!.nivel).toBe('baja');
    // Variación mayor a 7 días: irregular según FIGO.
    expect(predecirOvulacion({ cycleLen: 29, minLen: 24, maxLen: 34, cyclesUsed: 5 })!.nivel).toBe('baja');
    // Sin ciclos suficientes tampoco se presume.
    expect(predecirOvulacion({ cycleLen: 28, minLen: 28, maxLen: 28, cyclesUsed: 0 })!.nivel).toBe('baja');
    // Parejo, dentro de 26-32 y con 4 ciclos: alta.
    expect(predecirOvulacion({ cycleLen: 28, minLen: 27, maxLen: 29, cyclesUsed: 4 })!.nivel).toBe('alta');
    // Normal pero sin llegar a los criterios de alta: media.
    expect(predecirOvulacion({ cycleLen: 36, minLen: 34, maxLen: 38, cyclesUsed: 4 })!.nivel).toBe('media');
  });

  it('devuelve null con datos imposibles en vez de inventar un día', () => {
    expect(predecirOvulacion({ cycleLen: 5 })).toBeNull();
    expect(predecirOvulacion({ cycleLen: 120 })).toBeNull();
    expect(predecirOvulacion({ cycleLen: NaN })).toBeNull();
  });
});

