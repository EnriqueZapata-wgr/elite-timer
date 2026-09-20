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
  decidirContextoRico,
  lineaFuentesNoLeidas,
  nombreDeBloque,
  puedeCargarContextoRico,
  olvidarVerificacionConsentimiento,
  REGLA_FUENTES_NO_LEIDAS,
  type UserContext,
} from '@/src/services/argos-context-core';
import { ENCABEZADO_PLAN_EQUIPO, REGLA_PLAN_SUPLEMENTOS } from '@/src/services/argos-suplementos-plan-core';

describe('canLoadRichContext: la política del gate', () => {
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

describe('20-sep-2026 · el gate con memoria de sesión', () => {
  it('decidirContextoRico: la respuesta manda; ante fallo, solo abre a quien ya se verificó', () => {
    expect(decidirContextoRico({ ok: true, permitido: true }, false)).toBe(true);
    expect(decidirContextoRico({ ok: true, permitido: false }, true)).toBe(false);
    expect(decidirContextoRico({ ok: false }, true)).toBe(true);
    expect(decidirContextoRico({ ok: false }, false)).toBe(false);
  });

  it('puedeCargarContextoRico: nunca verificado + fallo → cerrado; verificado + fallo → abierto; NO explícito borra', async () => {
    olvidarVerificacionConsentimiento();
    const falla = async () => { throw new Error('red caída'); };
    expect(await puedeCargarContextoRico('u1', falla)).toBe(false);
    expect(await puedeCargarContextoRico('u1', async () => true)).toBe(true);
    expect(await puedeCargarContextoRico('u1', falla)).toBe(true);
    // Otro usuario no hereda la verificación.
    expect(await puedeCargarContextoRico('u2', falla)).toBe(false);
    // Un NO explícito cierra y borra la memoria: el siguiente fallo cierra.
    expect(await puedeCargarContextoRico('u1', async () => false)).toBe(false);
    expect(await puedeCargarContextoRico('u1', falla)).toBe(false);
    olvidarVerificacionConsentimiento();
  });
});

describe('20-sep-2026 · honestidad ante fallos de lectura', () => {
  it('lo que falló viaja como renglón + regla, y no usa la frase de "no hay datos"', () => {
    const prompt = buildContextPrompt({ name: 'Omar', fuentesNoLeidas: ['la evaluación Elite', 'los laboratorios'] });
    // 20-sep-2026 (revisión en frío): una sola voz, dirigida al modelo. Antes
    // decía "Si te preguntan de eso", que mezclaba la voz al usuario con la
    // voz al modelo en el mismo renglón.
    expect(prompt).toContain('En este turno no pude leer: la evaluación Elite, los laboratorios. Si el usuario pregunta por eso, dilo tal cual y no inventes.');
    expect(prompt).toContain('REGLA DE FUENTES NO LEÍDAS');
    expect(prompt.indexOf('REGLA DE FUENTES NO LEÍDAS')).toBeGreaterThan(prompt.indexOf('## CÓMO USAR ESTOS DATOS'));
    // El "obligatorio" sigue dicho una sola vez.
    expect(prompt.split('obligatori').length - 1).toBe(1);
  });

  it('sin fallos no aparece nada de esto', () => {
    const prompt = buildContextPrompt(fullContext());
    expect(prompt).not.toContain('no pude leer');
    expect(prompt).not.toContain('REGLA DE FUENTES NO LEÍDAS');
  });

  it('la línea y los nombres legibles', () => {
    expect(lineaFuentesNoLeidas(['el sueño'])).toBe('En este turno no pude leer: el sueño. Si el usuario pregunta por eso, dilo tal cual y no inventes.');
    expect(lineaFuentesNoLeidas(['el sueño'])).not.toContain('Si te preguntan');
    expect(nombreDeBloque('evaluacion-elite')).toBe('la evaluación Elite');
    expect(nombreDeBloque('plan-suplementos')).toBe('el plan de suplementos');
    expect(nombreDeBloque('bloque-nuevo-sin-nombre')).toBe('bloque-nuevo-sin-nombre');
    expect(REGLA_FUENTES_NO_LEIDAS).toContain('no es falta de datos');
    expect(REGLA_FUENTES_NO_LEIDAS.includes('\u2014')).toBe(false);
  });
});

describe('20-sep-2026 · el plan de suplementos y el detalle Elite en el prompt', () => {
  it('el plan completo viaja con dosis, momento, porqué y nota, y trae su regla una vez', () => {
    const ctx = fullContext();
    ctx.planSuplementos = {
      asignadoPor: 'Enrique Zapata',
      filas: [
        { id: '1', name: 'Magnesio (glicinato)', dosage: '400 mg', timing: 'evening', reason: 'Corrige el nivel bajo (1.83).', notes: 'Con la cena.', source: 'coach', is_plan: true, is_active: true, amount_per_unit: null, amount_unit: null, units_per_dose: null, dose_times: null },
        { id: '2', name: 'Zinc', dosage: '15 mg', timing: 'morning', reason: 'x', notes: null, source: 'coach', is_plan: true, is_active: false, amount_per_unit: null, amount_unit: null, units_per_dose: null, dose_times: null },
      ],
    };
    const prompt = buildContextPrompt(ctx);
    expect(prompt).toContain(`${ENCABEZADO_PLAN_EQUIPO} (asignado por Enrique Zapata):`);
    expect(prompt).toContain('- Magnesio (glicinato): 400 mg, noche. Por qué: Corrige el nivel bajo (1.83). Nota: Con la cena.');
    expect(prompt).toContain('Suplementos pausados');
    expect(prompt).toContain('Zinc (del plan)');
    expect(prompt.split(REGLA_PLAN_SUPLEMENTOS).length - 1).toBe(1);
    // "Suplementos hoy" (tomados/pendientes) sigue igual que siempre.
    expect(prompt).toContain('Suplementos hoy: tomados [Magnesio], pendientes [Omega 3]');
    expect(prompt.split('obligatori').length - 1).toBe(1);
  });

  it('el detalle Elite va después del resumen y solo si viene', () => {
    const ctx = fullContext();
    ctx.evaluacionElite = { bloque: 'RESUMEN ELITE', detalle: 'DETALLE ELITE' };
    const prompt = buildContextPrompt(ctx);
    expect(prompt.indexOf('DETALLE ELITE')).toBeGreaterThan(prompt.indexOf('RESUMEN ELITE'));
    ctx.evaluacionElite = { bloque: '', detalle: 'DETALLE ELITE' };
    expect(buildContextPrompt(ctx)).toContain('DETALLE ELITE');
    ctx.evaluacionElite = { bloque: 'RESUMEN ELITE' };
    expect(buildContextPrompt(ctx)).not.toContain('DETALLE ELITE');
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

describe('buildContextPrompt: los 25 bloques', () => {
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

  it('VOZ-2 · las reglas viven juntas al final, no salpicadas entre los datos', () => {
    const prompt = buildContextPrompt(fullContext());
    const iDatos = prompt.indexOf('## DATOS ACTUALES DEL USUARIO');
    const iReglas = prompt.indexOf('## CÓMO USAR ESTOS DATOS');
    expect(iReglas).toBeGreaterThan(iDatos);
    // Ninguna regla puede quedar por encima del bloque: si aparece antes, es que
    // volvió a colarse entre los datos y el texto se vuelve a leer cosido.
    for (const nombre of ['REGLA DE VIGENCIA', 'REGLAS DEL DATO EMOCIONAL', 'REGLA LABS + CICLO']) {
      expect(prompt.indexOf(nombre)).toBeGreaterThan(iReglas);
    }
  });

  it('VOZ-2 · el "obligatorio" se dice UNA vez, no una por bloque', () => {
    const prompt = buildContextPrompt(fullContext());
    expect(prompt.split('obligatori').length - 1).toBe(1);
  });

  it('VOZ-2 · ninguna regla se repite aunque dos bloques la pidan', () => {
    // Con expediente de labs Y resumen viejo, labs+ciclo salía dos veces.
    const ctx = fullContext();
    ctx.labsExpediente = { lineas: ['Expediente de labs', 'Ferritina 90'], ultimaMedicion: '2026-07-20' };
    const prompt = buildContextPrompt(ctx);
    expect(prompt.split('REGLA LABS + CICLO').length - 1).toBe(1);
  });

  it('VOZ-2 · consolidar no borró ninguna regla de fondo', () => {
    const prompt = buildContextPrompt({
      ...fullContext(),
      edadAtpContext: {
        edadIntegral: 34, edadCronologica: 40,
        subEdades: [{ area: 'metabólica', valor: 33 }], calculatedAt: '2026-08-10',
      },
      sleepContext: {
        nightsLast7: 6, avgHours: 6.8, avgScore: 74, lastNightDate: '2026-08-17',
        lastNightHours: 7.2, trend: 'up', source: 'sleep_cycle',
      },
    });
    for (const r of [
      'REGLA DE VIGENCIA', 'REGLA DE ARITMÉTICA', 'REGLAS DEL DATO EMOCIONAL',
      'REGLA LABS + CICLO', 'REGLA EDAD ATP', 'REGLA DE FUENTE EXTERNA',
    ]) {
      expect(prompt, `desapareció ${r}`).toContain(r);
    }
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
