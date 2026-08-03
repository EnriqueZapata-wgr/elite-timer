/**
 * El seguro del reconcile (MB-20.3 P3).
 *
 * La regla que se amarra aquí: la ausencia de evidencia no es evidencia de
 * ausencia. El reconcile solo revoca con evidencia POSITIVA de que no hubo
 * actividad; una consulta rota, vacía por error o con fila ilegible es
 * 'no_se_sabe' y el dato del usuario gana.
 *
 * La prueba de mutación (la que pidió el run): romper a propósito cada
 * consulta — error, count nulo, fila con fecha nula — con el ledger LLENO,
 * y verificar que el plan no revoca NADA. Los dos bugs reales (P1 fuerza,
 * P2 suplementos) están reproducidos con su forma exacta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evidenciaDeConteo,
  evidenciaDeUltimaFecha,
  planReconcile,
  type Evidencia,
} from '../reconcile-core';

const TODAY = '2026-08-03';
const AYER = '2026-08-02';

// ── Formas REALES de respuesta de supabase-js (no lanza en 4xx) ──
const conteoOk = (n: number) => ({ count: n, error: null });
const conteoRoto = { count: null, error: { message: 'FetchError: network request failed' } };
const filaHoy = { data: { date: TODAY }, error: null };
const filaVieja = { data: { date: AYER }, error: null };
const vacioReal = { data: null, error: null };
const filaIlegible = { data: { date: null }, error: null }; // el bug P1: fila sin fecha
const consultaRota = { data: null, error: { message: 'column does not exist', code: '42703' } };

describe('evidenciaDeConteo', () => {
  it('con número hay evidencia: ≥1 hecho, 0 no_hecho', () => {
    expect(evidenciaDeConteo(conteoOk(3))).toBe('hecho');
    expect(evidenciaDeConteo(conteoOk(1))).toBe('hecho');
    expect(evidenciaDeConteo(conteoOk(0))).toBe('no_hecho');
  });

  it('error o count nulo = no_se_sabe (el ?? 0 viejo leía "cero actividad")', () => {
    expect(evidenciaDeConteo(conteoRoto)).toBe('no_se_sabe');
    expect(evidenciaDeConteo({ count: null, error: null })).toBe('no_se_sabe');
    expect(evidenciaDeConteo({ count: undefined, error: null })).toBe('no_se_sabe');
  });
});

describe('evidenciaDeUltimaFecha', () => {
  it('fecha de hoy = hecho; fecha vieja = no_hecho', () => {
    expect(evidenciaDeUltimaFecha(filaHoy, TODAY, TODAY)).toBe('hecho');
    expect(evidenciaDeUltimaFecha(filaVieja, AYER, TODAY)).toBe('no_hecho');
  });

  it('vacío REAL (sin fila, sin error) = no_hecho — la fuente respondió', () => {
    expect(evidenciaDeUltimaFecha(vacioReal, null, TODAY)).toBe('no_hecho');
  });

  it('error = no_se_sabe, aunque venga data', () => {
    expect(evidenciaDeUltimaFecha(consultaRota, null, TODAY)).toBe('no_se_sabe');
    expect(evidenciaDeUltimaFecha({ data: { date: TODAY }, error: { message: 'x' } }, TODAY, TODAY)).toBe('no_se_sabe');
  });

  it('fila con fecha ilegible = no_se_sabe (hay actividad, no sabemos de cuándo)', () => {
    expect(evidenciaDeUltimaFecha(filaIlegible, null, TODAY)).toBe('no_se_sabe');
    expect(evidenciaDeUltimaFecha({ data: { date: undefined }, error: null }, undefined, TODAY)).toBe('no_se_sabe');
  });
});

describe('planReconcile', () => {
  it('hecho sin log → award; no_hecho con log → revoke; alineados → nada', () => {
    const plan = planReconcile(
      { a: 'hecho', b: 'no_hecho', c: 'hecho', d: 'no_hecho' },
      new Set(['b', 'c']),
    );
    expect(plan.award).toEqual(['a']);
    expect(plan.revoke).toEqual(['b']);
  });

  it('no_se_sabe JAMÁS toca el ledger: ni revoca el log presente ni otorga', () => {
    const plan = planReconcile(
      { a: 'no_se_sabe', b: 'no_se_sabe' },
      new Set(['a']), // a tiene log, b no
    );
    expect(plan.award).toEqual([]);
    expect(plan.revoke).toEqual([]);
  });
});

// ═══ LA PRUEBA DE MUTACIÓN ═══
//
// El espejo fiel del mapeo del compilador (los 7 reconciliables; meditación
// y breathwork quedan fuera igual que en compileDay). El contrato de abajo
// verifica contra el source real que day-compiler usa EXACTAMENTE estos
// derivadores con estas respuestas — si el mapeo diverge, truena el contrato.
type Res = { queries: {
  exercise: { data: any; error: unknown };
  suppTakenCount: { count: number | null; error: unknown };
  cycleLogCount: { count: number | null; error: unknown };
  mood: { data: any; error: unknown };
  cardio: { data: any; error: unknown };
  journal: { data: any; error: unknown };
  nback: { data: any; error: unknown };
} };

function evidenciasComoElCompilador({ queries: q }: Res): Record<string, Evidencia> {
  const lastCheckinDate = q.mood.data?.created_at ? TODAY : null; // toLocalDateString espejo
  return {
    strength: evidenciaDeUltimaFecha(q.exercise, q.exercise.data?.date, TODAY),
    supplements: evidenciaDeConteo(q.suppTakenCount),
    period_log: evidenciaDeConteo(q.cycleLogCount),
    checkin: evidenciaDeUltimaFecha(q.mood, lastCheckinDate, TODAY),
    cardio: evidenciaDeUltimaFecha(q.cardio, q.cardio.data?.date, TODAY),
    journal: evidenciaDeUltimaFecha(q.journal, q.journal.data?.date, TODAY),
    nback: evidenciaDeUltimaFecha(q.nback, q.nback.data?.date, TODAY),
  };
}

/** El día perfecto: todas las fuentes responden y todas dicen "hoy sí". */
const todoSano = (): Res => ({ queries: {
  exercise: { ...filaHoy },
  suppTakenCount: conteoOk(2),
  cycleLogCount: conteoOk(1),
  mood: { data: { created_at: `${TODAY}T09:00:00Z` }, error: null },
  cardio: { ...filaHoy },
  journal: { ...filaHoy },
  nback: { ...filaHoy },
} });

/** El ledger LLENO: el usuario ya ganó los 7 electrones del reconcile. */
const LEDGER_LLENO = new Set(['strength', 'supplements', 'period_log', 'checkin', 'cardio', 'journal', 'nback']);

describe('mutación: una consulta rota no borra NINGÚN electrón', () => {
  it('sanidad: con todo sano y ledger lleno, el plan no toca nada', () => {
    const plan = planReconcile(evidenciasComoElCompilador(todoSano()), LEDGER_LLENO);
    expect(plan.award).toEqual([]);
    expect(plan.revoke).toEqual([]);
  });

  it('exercise_logs devuelve ERROR → cero revocaciones (antes borraba fuerza)', () => {
    const res = todoSano();
    res.queries.exercise = { ...consultaRota };
    const plan = planReconcile(evidenciasComoElCompilador(res), LEDGER_LLENO);
    expect(plan.revoke).toEqual([]);
  });

  it('exercise_logs devuelve la fila ilegible del bug P1 (date: null) → cero revocaciones', () => {
    const res = todoSano();
    res.queries.exercise = { ...filaIlegible };
    const plan = planReconcile(evidenciasComoElCompilador(res), LEDGER_LLENO);
    expect(plan.revoke).toEqual([]);
  });

  it('el count de suplementos falla (familia del bug P2) → cero revocaciones', () => {
    const res = todoSano();
    res.queries.suppTakenCount = { ...conteoRoto };
    const plan = planReconcile(evidenciasComoElCompilador(res), LEDGER_LLENO);
    expect(plan.revoke).toEqual([]);
  });

  it('CADA consulta, rota una por una (error Y forma nula) → cero revocaciones', () => {
    for (const key of ['exercise', 'mood', 'cardio', 'journal', 'nback'] as const) {
      for (const rota of [{ ...consultaRota }, { ...filaIlegible }]) {
        const res = todoSano();
        res.queries[key] = rota;
        const plan = planReconcile(evidenciasComoElCompilador(res), LEDGER_LLENO);
        expect(plan.revoke, `${key} roto con ${JSON.stringify(rota)}`).toEqual([]);
      }
    }
    for (const key of ['suppTakenCount', 'cycleLogCount'] as const) {
      for (const rota of [{ ...conteoRoto }, { count: null, error: null }]) {
        const res = todoSano();
        res.queries[key] = rota;
        const plan = planReconcile(evidenciasComoElCompilador(res), LEDGER_LLENO);
        expect(plan.revoke, `${key} roto`).toEqual([]);
      }
    }
  });

  it('apagón total (todas las consultas fallan) → el ledger queda intacto', () => {
    const res: Res = { queries: {
      exercise: { ...consultaRota },
      suppTakenCount: { ...conteoRoto },
      cycleLogCount: { ...conteoRoto },
      mood: { ...consultaRota },
      cardio: { ...consultaRota },
      journal: { ...consultaRota },
      nback: { ...consultaRota },
    } };
    const plan = planReconcile(evidenciasComoElCompilador(res), LEDGER_LLENO);
    expect(plan.award).toEqual([]);
    expect(plan.revoke).toEqual([]);
  });

  it('y el reconcile NO quedó castrado: vacío real con log presente SÍ revoca', () => {
    // La fuente responde bien y dice "aquí nunca ha habido nada": eso es
    // evidencia positiva de ausencia, la única llave que abre el revoke.
    const res: Res = { queries: {
      exercise: { ...vacioReal },
      suppTakenCount: conteoOk(0),
      cycleLogCount: conteoOk(1),
      mood: { data: { created_at: `${TODAY}T09:00:00Z` }, error: null },
      cardio: { ...filaVieja },
      journal: { ...filaHoy },
      nback: { ...filaHoy },
    } };
    const plan = planReconcile(evidenciasComoElCompilador(res), LEDGER_LLENO);
    expect(plan.revoke.sort()).toEqual(['cardio', 'strength', 'supplements']);
    expect(plan.award).toEqual([]);
  });
});

// ═══ El contrato que ata el espejo al compilador real ═══

const compiler = readFileSync(
  resolve(process.cwd(), 'src/services/day-compiler.ts'),
  'utf8',
)
  .split(/\r?\n/)
  .map((l) => l.replace(/(^|\s)\/\/.*$/, ''))
  .join('\n');

describe('contrato: day-compiler usa exactamente este seguro', () => {
  const bloque = compiler.match(/const verifiedEvidencia[\s\S]*?\};/)?.[0] ?? '';

  it('cada llave verificada deriva su evidencia con el derivador del core', () => {
    // El mismo (derivador, respuesta) que usa el espejo de la mutación.
    const esperado: Record<string, RegExp> = {
      meditation: /meditation:\s*evidenciaDeConteo\(meditationCountRes\)/,
      breathwork: /breathwork:\s*evidenciaDeConteo\(breathingCountRes\)/,
      strength: /strength:\s*evidenciaDeUltimaFecha\(lastExerciseRes/,
      supplements: /supplements:\s*evidenciaDeConteo\(suppTakenCountRes\)/,
      period_log: /period_log:\s*evidenciaDeConteo\(cycleLogCountRes\)/,
      checkin: /checkin:\s*evidenciaDeUltimaFecha\(moodRes/,
      cardio: /cardio:\s*evidenciaDeUltimaFecha\(lastCardioRes/,
      journal: /journal:\s*evidenciaDeUltimaFecha\(lastJournalRes/,
      nback: /nback:\s*evidenciaDeUltimaFecha\(lastNbackRes/,
    };
    for (const [key, re] of Object.entries(esperado)) {
      expect(bloque, `evidencia de ${key}`).toMatch(re);
    }
  });

  it('la card solo palomea con evidencia positiva', () => {
    expect(compiler).toMatch(/verifiedEvidencia\[k\] === 'hecho'/);
  });

  it('el reconcile decide con planReconcile y solo revoca desde plan.revoke', () => {
    expect(compiler).toMatch(/planReconcile\(evidencias,\s*awarded\)/);
    // La ÚNICA llamada a revokeBooleanElectron del compilador vive dentro
    // del loop de plan.revoke — no hay otra puerta al borrado.
    const cuerpo = compiler.replace(/import[\s\S]*?from[^\n]*\n/g, '');
    const llamadas = cuerpo.match(/revokeBooleanElectron\(/g) ?? [];
    expect(llamadas).toHaveLength(1);
    expect(compiler).toMatch(/for \(const src of plan\.revoke\)[\s\S]{0,400}revokeBooleanElectron\(/);
  });

  it('toda revocación deja rastro con llave y motivo', () => {
    expect(compiler).toMatch(/for \(const src of plan\.revoke\)[\s\S]{0,400}logWarn\('\[reconcile\] revoca electrón'/);
    expect(compiler).toMatch(/motivo:\s*'evidencia positiva de ausencia/);
  });
});
