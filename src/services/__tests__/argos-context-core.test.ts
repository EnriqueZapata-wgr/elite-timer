/**
 * MB-21 P7 — buildContextPrompt (25 bloques de datos del usuario) y LA
 * decisión del gate de consentimiento (canLoadRichContext), que no tenían
 * un solo test. El gate es lo que impide mandar datos de salud al modelo
 * sin permiso: fail-closed ante fallo del servicio.
 */
import { describe, it, expect } from 'vitest';
import {
  buildContextPrompt,
  canLoadRichContext,
  type UserContext,
} from '@/src/services/argos-context-core';

describe('canLoadRichContext — la política del gate', () => {
  it('consentimiento ENCENDIDO → contexto rico', async () => {
    expect(await canLoadRichContext(async () => true)).toBe(true);
  });

  it('consentimiento APAGADO → contexto mínimo', async () => {
    expect(await canLoadRichContext(async () => false)).toBe(false);
  });

  it('el servicio de consentimiento FALLA → FAIL-CLOSED (no viajan datos de salud)', async () => {
    // LA mutación que este test entierra: volver al fail-open ("consent
    // default es ON") — con eso, un usuario que REVOCÓ su consentimiento
    // veía su salud viajar al modelo cada vez que la query fallara.
    expect(await canLoadRichContext(async () => { throw new Error('red caída'); })).toBe(false);
  });
});

/** Contexto con TODOS los bloques poblados (los ~25 del prompt). */
function fullContext(): UserContext {
  const ctx: UserContext = {
    name: 'Enrique',
    age: 40,
    gender: 'male',
    chronotype: 'León',
    activeProtocol: 'Reset metabólico',
    rank: 'Reactor',
    todayElectrons: { earned: 12.5, total: 20 },
    recentNutrition: { todayCalories: 1800, todayProtein: 140, mealsToday: 3, avgCalories3d: 2100 },
    recentExercise: { sessionsThisWeek: 4 },
    personalRecords: [{ exercise: 'Dominadas', estimated1rm: 120, weight: 40, reps: 5 }],
    recentGlucose: { lastValue: 95, lastContext: 'ayunas', readings: 5 },
    currentFastingStatus: { isFasting: true, hoursElapsed: 14.5, targetHours: 16 },
    bravermanProfile: { dominant: 'dopamina', primaryDeficiency: 'GABA', deficiencyLevel: 'moderada' },
    functionalQuizzes: [{ quiz: 'digestión', scores: { total: 7 }, issues: ['reflujo'] }],
    recentMindSessions: { meditationDaysLast7: 3, breathworkDaysLast7: 2, avgMinutes: 12 },
    recentJournal: { entriesLast7: 4, lastEntryDate: '2026-08-04', dominantTag: 'gratitud' },
    recentMood: { avgPleasantness: 7, trend: 'up', lastCheckInAt: '2026-08-05', checkInsLast7: 5 },
    todayEmotion: { quadrant: 'alta-agradable', labels: ['motivado'] },
    cycleInfo: { cycleDay: 12, currentPhase: 'folicular', nextPeriodEstimate: '2026-08-20' },
    recentBodyMeasurements: { lastWeightKg: 82, lastBodyFatPct: 14, weightTrend30d: 'stable', lastMeasuredAt: '2026-08-01' },
    recentLabs: { keyMarkers: [{ name: 'Ferritina', value: 90, unit: 'ng/mL' }], lastUpdated: '2026-07-20' },
    todaySupplements: { taken: ['Magnesio'], pending: ['Omega 3'] },
    hydrationStats: { last7dAvgMl: 2400, todayProgressPct: 60 },
    currentHealthScore: { score: 78, calculatedAt: '2026-08-05T08:00:00Z' },
  };
  (ctx as any).uvData = {
    current: 6, max: 9, maxTime: '13:00',
    vitaminDWindow: { start: '10:00', end: '11:30' },
    dangerousFrom: '12:00', dangerousUntil: '16:00',
  };
  return ctx;
}

describe('buildContextPrompt — los 25 bloques', () => {
  it('contexto MÍNIMO (gate cerrado) → prompt VACÍO: cero datos de salud viajan', () => {
    // Este es el contrato del gate: loadUserContext devuelve { name: '' } y
    // con eso el prompt de contexto es exactamente ''.
    expect(buildContextPrompt({ name: '' })).toBe('');
  });

  it('contexto completo → todos los bloques presentes', () => {
    const prompt = buildContextPrompt(fullContext());
    const expected = [
      'Usuario: Enrique', 'Edad: 40', 'Género: male', 'Cronotipo: León',
      'Protocolo activo: Reset metabólico', 'Rango: Reactor',
      'Electrones hoy: 12.5/20', 'Nutrición hoy: 1800 kcal', 'Promedio 3 días: 2100',
      'Ejercicio: 4 sesiones', 'Récords (top 5): Dominadas: 120kg 1RM',
      'Última glucosa: 95 mg/dL', 'Ayuno activo: 14.5h de 16h',
      'Perfil Braverman: Naturaleza dominante dopamina',
      'Evaluaciones funcionales: digestión: reflujo',
      'UV actual: 6', 'Ventana vitamina D: 10:00-11:30', 'Protección necesaria: 12:00-16:00',
      'Mente 7d: 3d meditación', 'Journal 7d: 4 entradas', 'Mood 7d: 5 check-ins',
      'Estado emocional de HOY (check-in): motivado',
      'REGLAS DEL DATO EMOCIONAL',
      'Ciclo: día 12 (fase folicular',
      // Pieza 1: la fecha dejó de ser un paréntesis mudo y ahora es un sello
      // de vigencia con antigüedad en lenguaje natural.
      'Última medición corporal: 82kg',
      '2026-08-01',
      'Labs: Ferritina 90ng/mL',
      '2026-07-20',
      'REGLA LABS + CICLO',
      'Suplementos hoy: tomados [Magnesio], pendientes [Omega 3]',
      'Hidratación: 60% meta hoy',
      'Health Score: 78',
      'calculado hace',
    ];
    for (const fragment of expected) {
      expect(prompt, `falta el bloque: ${fragment}`).toContain(fragment);
    }
    expect(prompt).toContain('## DATOS ACTUALES DEL USUARIO');
  });

  it('la regla LABS+CICLO solo viaja cuando hay labs Y ciclo', () => {
    const ctx = fullContext();
    delete ctx.cycleInfo;
    expect(buildContextPrompt(ctx)).not.toContain('REGLA LABS + CICLO');
  });

  it('las reglas duras del dato emocional viajan pegadas al dato', () => {
    const soloEmocion: UserContext = { name: '', todayEmotion: { quadrant: 'baja', labels: ['cansado'] } };
    const prompt = buildContextPrompt(soloEmocion);
    expect(prompt).toContain('REGLAS DEL DATO EMOCIONAL');
    expect(prompt).toContain('NO diagnosticas');
  });
});
