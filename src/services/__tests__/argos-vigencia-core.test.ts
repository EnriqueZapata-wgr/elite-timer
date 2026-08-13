/**
 * Pieza 1 — vigencia de los datos del contexto.
 *
 * EL BUG REAL: ARGOS leyó una deficiencia de GABA de un Braverman de hace tres
 * meses, la citó como hecho de HOY y la encadenó como causa de la energía de
 * hoy. El contexto entregaba el rasgo sin fecha, y sin fecha el modelo asume
 * presente. Estos tests entierran esa mutación: si alguien vuelve a mandar un
 * rasgo sin sello de fecha, o afloja los umbrales, aquí truena.
 */
import { describe, it, expect } from 'vitest';
import {
  conVigencia,
  evaluarVigencia,
  describirAntiguedad,
  diasDesde,
  buildContextPrompt,
  REGLA_VIGENCIA_GLOBAL,
  VIGENCIA_DIAS_TENDENCIA,
  VIGENCIA_DIAS_CADUCADO,
  type UserContext,
} from '@/src/services/argos-context-core';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';

// Relativo al hoy REAL: buildContextPrompt evalúa contra getLocalToday(), así
// que fijar una fecha aquí haría que estos tests caducaran mañana.
const HOY = getLocalToday();

/** Fecha YYYY-MM-DD a N días antes de hoy. */
function hace(dias: number): string {
  const d = parseLocalDate(HOY);
  d.setDate(d.getDate() - dias);
  return toLocalDateString(d);
}

describe('diasDesde', () => {
  it('cuenta días contra hoy en zona local', () => {
    expect(diasDesde(hace(0), HOY)).toBe(0);
    expect(diasDesde(hace(1), HOY)).toBe(1);
    expect(diasDesde(hace(90), HOY)).toBe(90);
  });

  it('acepta timestamp ISO completo, no solo YYYY-MM-DD', () => {
    expect(diasDesde(`${hace(3)}T22:15:00.000Z`, HOY)).toBe(3);
  });

  it('fecha futura (reloj movido) cuenta como 0, nunca negativo', () => {
    expect(diasDesde(hace(-30), HOY)).toBe(0);
  });

  it('sin fecha o basura devuelve null — el bloque no se cae, solo no sella', () => {
    expect(diasDesde(null, HOY)).toBeNull();
    expect(diasDesde(undefined, HOY)).toBeNull();
    expect(diasDesde('', HOY)).toBeNull();
    expect(diasDesde('no-es-fecha', HOY)).toBeNull();
  });
});

describe('describirAntiguedad — lenguaje natural es-MX', () => {
  it('días recientes', () => {
    expect(describirAntiguedad(0)).toBe('hoy');
    expect(describirAntiguedad(1)).toBe('ayer');
    expect(describirAntiguedad(5)).toBe('hace 5 días');
  });

  it('semanas y meses', () => {
    expect(describirAntiguedad(21)).toBe('hace 3 semanas');
    // Debajo de 60 días el corte natural son semanas, no meses: "hace 4
    // semanas" se lee más cerca que "hace 1 mes" y ese dato todavía es vigente.
    expect(describirAntiguedad(31)).toBe('hace 4 semanas');
    expect(describirAntiguedad(91)).toBe('hace 3 meses');
    expect(describirAntiguedad(200)).toBe('hace 7 meses');
  });

  it('años en singular y plural', () => {
    expect(describirAntiguedad(365)).toBe('hace 1 año');
    expect(describirAntiguedad(800)).toBe('hace 2 años');
  });
});

describe('evaluarVigencia — los tres niveles', () => {
  it(`hasta ${VIGENCIA_DIAS_TENDENCIA} días es reciente`, () => {
    expect(evaluarVigencia(hace(0), HOY)?.nivel).toBe('reciente');
    expect(evaluarVigencia(hace(VIGENCIA_DIAS_TENDENCIA), HOY)?.nivel).toBe('reciente');
  });

  it(`pasando ${VIGENCIA_DIAS_TENDENCIA} días deja de ser presente`, () => {
    expect(evaluarVigencia(hace(VIGENCIA_DIAS_TENDENCIA + 1), HOY)?.nivel).toBe('tendencia');
    expect(evaluarVigencia(hace(VIGENCIA_DIAS_CADUCADO), HOY)?.nivel).toBe('tendencia');
  });

  it(`pasando ${VIGENCIA_DIAS_CADUCADO} días queda marcado como desactualizado`, () => {
    expect(evaluarVigencia(hace(VIGENCIA_DIAS_CADUCADO + 1), HOY)?.nivel).toBe('caducado');
  });
});

describe('conVigencia — la regla viaja pegada al dato', () => {
  it('dato reciente: sello con fecha, sin sermón', () => {
    const out = conVigencia('Deficiencia GABA moderada', hace(10), { hoy: HOY });
    expect(out).toContain('hace 10 días');
    expect(out).toContain(hace(10));
    expect(out).not.toContain('NO lo digas en presente');
  });

  it('EL BUG: un rasgo de hace 3 meses NO puede citarse en presente ni como causa de hoy', () => {
    const out = conVigencia('Deficiencia GABA moderada', hace(91), { hoy: HOY });
    expect(out).toContain('hace 3 meses');
    expect(out).toContain('NO lo digas en presente');
    expect(out).toContain('causa de hoy');
  });

  it('un rasgo de más de 180 días se marca desactualizado e invita a repetir', () => {
    const out = conVigencia('Deficiencia GABA moderada', hace(200), {
      reevaluar: 'repetir el test Braverman',
    });
    expect(out).toContain('posiblemente desactualizado');
    expect(out).toContain('repetir el test Braverman');
  });

  it('sin fecha el valor pasa intacto — fail-soft, no rompe el contexto', () => {
    expect(conVigencia('Cronotipo: lobo', null)).toBe('Cronotipo: lobo');
    expect(conVigencia('Cronotipo: lobo', undefined)).toBe('Cronotipo: lobo');
  });

  it('el verbo se adapta al tipo de dato', () => {
    expect(conVigencia('Cronotipo: lobo', hace(5), { verbo: 'determinado', hoy: HOY }))
      .toContain('determinado hace 5 días');
  });
});

describe('buildContextPrompt — los rasgos ya no viajan sin fecha', () => {
  it('el Braverman viejo llega sellado y con la regla global', () => {
    const ctx: UserContext = {
      name: 'Cliente',
      bravermanProfile: {
        dominant: 'dopamina',
        primaryDeficiency: 'GABA',
        deficiencyLevel: 'moderada',
        completedAt: hace(91),
      },
    };
    const prompt = buildContextPrompt(ctx);
    expect(prompt).toContain('hace 3 meses');
    expect(prompt).toContain('NO lo digas en presente');
    expect(prompt).toContain(REGLA_VIGENCIA_GLOBAL);
  });

  it('sin ningún dato fechado, la regla global no gasta tokens', () => {
    const prompt = buildContextPrompt({ name: 'Cliente', rank: 'Reactor' });
    expect(prompt).toContain('Reactor');
    expect(prompt).not.toContain(REGLA_VIGENCIA_GLOBAL);
  });

  it('cronotipo, quizzes y labs también salen fechados', () => {
    const ctx: UserContext = {
      name: 'Cliente',
      chronotype: 'lobo',
      chronotypeUpdatedAt: hace(400),
      functionalQuizzes: [{ quiz: 'sleep_functional', scores: {}, issues: ['sueño fragmentado'], completedAt: hace(120) }],
      recentLabs: { keyMarkers: [{ name: 'Vitamina D', value: 28, unit: 'ng/mL' }], lastUpdated: hace(30) },
    };
    const prompt = buildContextPrompt(ctx);
    expect(prompt).toContain('determinado hace 1 año');
    expect(prompt).toContain('posiblemente desactualizado');
    expect(prompt).toContain('contestado hace 4 meses');
    expect(prompt).toContain('muestra tomada hace 4 semanas');
  });
});
