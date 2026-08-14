/**
 * OLA 4 · Tests puros del registry de evaluaciones.
 *
 * Lo que se protege aquí es la regla de oro: ninguna evaluación del catálogo
 * se pierde al colapsar 37 rutas en 8, y ninguna ruta queda ambigua.
 */
import { describe, it, expect } from 'vitest';
import {
  ASSESSMENTS,
  ASSESSMENT_BY_ID,
  SECTION_META,
  assessmentsBySection,
  heroAssessment,
  masterAssessment,
  getAssessment,
  completionTables,
  legacyRouteMap,
  currentRoute,
} from '../index';
import { ALL_FUNCTIONAL_QUIZZES } from '@/src/constants/functional-quizzes';
import { HC_QUESTIONNAIRES } from '@/src/constants/historia-clinica-questionnaires';

describe('registry de evaluaciones · integridad', () => {
  it('todos los id son únicos', () => {
    const ids = ASSESSMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ASSESSMENT_BY_ID cubre el arreglo completo', () => {
    expect(Object.keys(ASSESSMENT_BY_ID)).toHaveLength(ASSESSMENTS.length);
    for (const a of ASSESSMENTS) expect(ASSESSMENT_BY_ID[a.id]).toBe(a);
  });

  it('todas las rutas destino son únicas', () => {
    const routes = ASSESSMENTS.map((a) => a.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('ninguna evaluación se queda sin título ni sin sección', () => {
    for (const a of ASSESSMENTS) {
      expect(a.title.trim().length, a.id).toBeGreaterThan(0);
      expect(SECTION_META.map((s) => s.id)).toContain(a.section);
    }
  });
});

describe('registry · el catálogo no se toca', () => {
  it('los 5 cuestionarios funcionales están registrados, uno por uno', () => {
    for (const q of ALL_FUNCTIONAL_QUIZZES) {
      const entry = getAssessment(q.id);
      expect(entry, `falta el quiz funcional ${q.id}`).toBeDefined();
      expect(entry!.section).toBe('funcional');
      expect(entry!.bank).toEqual({ kind: 'const', module: 'functional-quizzes', key: q.id });
      // El título y el acento salen del catálogo, no de una copia a mano.
      expect(entry!.title).toBe(q.name);
      expect(entry!.color).toBe(q.color);
    }
    expect(ALL_FUNCTIONAL_QUIZZES.length).toBe(5);
  });

  it('cada cuestionario de historia clínica tiene entrada propia', () => {
    for (const q of HC_QUESTIONNAIRES) {
      const entry = getAssessment(`hc-${q.id}`);
      expect(entry, `falta la categoría clínica ${q.id}`).toBeDefined();
      expect(entry!.section).toBe('clinico');
      expect(entry!.persist.table).toBe('historia_clinica');
      expect(entry!.persist.completion).toEqual({ rule: 'json-key', column: 'data', key: q.id });
    }
    // Fitzpatrick se anexa al catálogo, así que también debe estar.
    expect(getAssessment('hc-fitzpatrick')).toBeDefined();
  });

  it('los 9 cuestionarios de Edad ATP y los 9 tests físicos siguen ahí', () => {
    expect(assessmentsBySection('edad')).toHaveLength(9);
    expect(ASSESSMENTS.filter((a) => a.kind === 'physical')).toHaveLength(9);
  });

  it('los 4 motores viejos quedan representados', () => {
    // functional-quiz, quiz-take (DB), cuestionario-maestro y cronotipo.
    expect(getAssessment('sleep_functional')!.bank.kind).toBe('const');
    expect(getAssessment('db-lifestyle_assessment')!.bank).toEqual({
      kind: 'db', table: 'quizzes', column: 'quiz_id', value: 'lifestyle_assessment',
    });
    expect(getAssessment('maestro')!.branching).toEqual({ kind: 'visibility', core: 'master-quiz-core' });
    expect(getAssessment('cronotipo')!.bank.kind).toBe('db');
  });
});

describe('registry · coherencia por tipo', () => {
  it('los físicos traen modo y no traen banco de preguntas', () => {
    for (const a of ASSESSMENTS.filter((x) => x.kind === 'physical')) {
      expect(a.mode, a.id).toBeDefined();
      expect(a.bank.kind, a.id).toBe('none');
      expect(a.score.kind, a.id).toBe('measure');
      expect(a.route.startsWith('/tests/run/'), a.id).toBe(true);
    }
  });

  it('los 3 modos del runner están representados', () => {
    const modes = new Set(ASSESSMENTS.filter((a) => a.kind === 'physical').map((a) => a.mode));
    expect([...modes].sort()).toEqual(['capture', 'reactive', 'stopwatch']);
  });

  it('los quiz tienen banco real y van al motor', () => {
    for (const a of ASSESSMENTS.filter((x) => x.kind === 'quiz')) {
      expect(a.bank.kind, a.id).not.toBe('none');
      expect(a.branching, a.id).toBeDefined();
      expect(a.route.startsWith('/tests/q/'), a.id).toBe(true);
    }
  });

  it('Braverman conserva pantalla propia y es el hero', () => {
    const b = heroAssessment();
    expect(b?.id).toBe('braverman');
    expect(b?.kind).toBe('special');
    expect(b?.route).toBe('/braverman');
  });

  it('el Cuestionario Maestro es la card destacada y su completado se calcula puro', () => {
    const m = masterAssessment();
    expect(m?.id).toBe('maestro');
    expect(m?.persist.completion).toEqual({ rule: 'pure' });
  });

  it('solo el Maestro calcula completado en memoria; el resto se lee de una tabla', () => {
    const puros = ASSESSMENTS.filter((a) => a.persist.completion.rule === 'pure');
    expect(puros.map((a) => a.id)).toEqual(['maestro']);
  });
});

describe('registry · efectos al completar', () => {
  it('los funcionales otorgan electrón y avisan el cambio', () => {
    for (const q of ALL_FUNCTIONAL_QUIZZES) {
      const effects = getAssessment(q.id)!.onComplete ?? [];
      expect(effects).toContainEqual({ effect: 'electron', source: 'functional_quiz' });
      expect(effects).toContainEqual({ effect: 'emit', event: 'electrons_changed' });
    }
  });

  it('el quiz de base de datos asigna protocolos y el cronotipo emite su evento', () => {
    expect(getAssessment('db-lifestyle_assessment')!.onComplete).toContainEqual({ effect: 'protocols' });
    expect(getAssessment('cronotipo')!.onComplete).toContainEqual({ effect: 'emit', event: 'chronotype_changed' });
  });
});

describe('registry · secciones y helpers del hub', () => {
  it('las 4 secciones tienen al menos una fila', () => {
    for (const s of SECTION_META) {
      expect(assessmentsBySection(s.id).length, s.id).toBeGreaterThan(0);
    }
  });

  it('hero y card destacada no se pintan como fila normal', () => {
    const filas = SECTION_META.flatMap((s) => assessmentsBySection(s.id));
    expect(filas.map((a) => a.id)).not.toContain('braverman');
    expect(filas.map((a) => a.id)).not.toContain('maestro');
    // Y entre filas y destacadas no se pierde nada.
    expect(filas.length + 2).toBe(ASSESSMENTS.length);
  });

  it('completionTables agrupa sin repetir y deja fuera al puro', () => {
    const tables = completionTables();
    expect(new Set(tables).size).toBe(tables.length);
    expect(tables).toContain('functional_quiz_results');
    expect(tables).toContain('edad_atp_functional_tests');
    expect(tables).not.toContain('user_master_quiz');
  });
});

describe('registry · redirects', () => {
  it('ninguna ruta vieja apunta a dos destinos distintos', () => {
    const seen = new Map<string, string>();
    for (const a of ASSESSMENTS) {
      for (const legacy of a.legacyRoutes ?? []) {
        const prev = seen.get(legacy);
        expect(prev === undefined || prev === a.route, `${legacy} duplicado`).toBe(true);
        seen.set(legacy, a.route);
      }
    }
  });

  it('las rutas viejas de la tabla del anexo están cubiertas', () => {
    const map = legacyRouteMap();
    expect(map['/functional-quiz?quiz_id=sleep_functional']).toBe('/tests/q/sleep_functional');
    expect(map['/quiz/chronotype']).toBe('/tests/q/cronotipo');
    // /my-chronotype es la vista del RESULTADO, no una puerta al test: se mudó
    // a result.route y por eso no está en el mapa de rutas viejas del quiz.
    expect(map['/my-chronotype']).toBeUndefined();
    expect(map['/salud/cuestionario-maestro']).toBe('/tests/q/maestro');
    expect(map['/historia-clinica/fitzpatrick']).toBe('/tests/q/hc-fitzpatrick');
    expect(map['/edad-atp/test-plank']).toBe('/tests/run/plank');
    expect(map['/edad-atp/cognitive']).toBe('/tests/run/reaction-time');
  });

  it('ninguna ruta vieja se redirige a sí misma', () => {
    for (const [from, to] of Object.entries(legacyRouteMap())) {
      expect(from, `${from} redirige a sí misma`).not.toBe(to);
    }
  });
});

describe('registry · el hub no manda a ninguna ruta muerta', () => {
  it('toda entrada no migrada declara a dónde va mientras tanto', () => {
    for (const a of ASSESSMENTS) {
      if (a.live) continue;
      expect(a.legacyRoutes?.length, `${a.id} no dice dónde vive hoy`).toBeGreaterThan(0);
    }
  });

  it('currentRoute usa la ruta nueva solo cuando ya existe', () => {
    // Braverman ya está en su destino final.
    expect(currentRoute(getAssessment('braverman')!)).toBe('/braverman');
    // Piezas 3b y 4: el motor y el runner ya reciben gente.
    expect(currentRoute(getAssessment('sleep_functional')!)).toBe('/tests/q/sleep_functional');
    expect(currentRoute(getAssessment('maestro')!)).toBe('/tests/q/maestro');
    expect(currentRoute(getAssessment('plank')!)).toBe('/tests/run/plank');
    // Lo que el motor todavía no cubre sigue abriendo su pantalla original.
    expect(currentRoute(getAssessment('hc-fitzpatrick')!)).toBe('/historia-clinica/fitzpatrick');
    expect(currentRoute(getAssessment('edad-sueno')!)).toBe('/edad-atp/questionnaires/sueno');
  });

  it('ninguna fila del hub apunta a /tests/q ni /tests/run antes de tiempo', () => {
    for (const a of ASSESSMENTS) {
      if (a.live) continue;
      const destino = currentRoute(a);
      expect(destino.startsWith('/tests/'), `${a.id} apunta a una ruta que aún no existe`).toBe(false);
    }
  });
});

describe('registry · copy', () => {
  it('el copy visible no usa em dash', () => {
    for (const a of ASSESSMENTS) {
      expect(a.title, a.id).not.toContain('—');
      if (a.subtitle) expect(a.subtitle, a.id).not.toContain('—');
    }
    for (const s of SECTION_META) {
      expect(s.title).not.toContain('—');
      expect(s.blurb).not.toContain('—');
    }
  });
});
