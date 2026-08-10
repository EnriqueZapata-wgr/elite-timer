/**
 * MB-32 · PIEZA 5 — snapshot, tema y los contratos de mutación sobre el
 * FUENTE (el patrón de tarea-actions-contrato / night-filter-core: Vitest
 * node no compila Kotlin ni monta widgets, así que el candado se lee del
 * código — una mutación que abra una ruta paralela truena aquí).
 *
 * Familias del brief que viven aquí:
 *   1. UNA escritura, UN camino (la mitad estática): ni el drenador ni el
 *      Kotlin conocen la base.
 *   4. Graduados y en reposo NO aparecen en el widget.
 *   5. El widget respeta el tema (payload + espejo Kotlin + fondos sólidos).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildAyunoSnapshot,
  buildHabitosSnapshot,
  patchHabitCompleted,
  patchWaterDelta,
  patchWaterTotal,
  snapshotSignedOut,
  type WidgetThemePayload,
} from '@/src/services/widgets/widget-snapshot-core';
import {
  idsInQueue,
  parseWidgetActions,
  planDrain,
} from '@/src/services/widgets/widget-actions-core';

/** Fuente sin comentarios (// y bloques), para afirmar ausencias de verdad. */
const leer = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');

const KT = 'modules/atp-widgets/android/src/main/java/expo/modules/atpwidgets';
const TEMA: WidgetThemePayload = { mode: 'oscuro', despertarMin: 420, corteMin: 1290 };

// ─────────────────────────────────────────────────────────────────────────────

describe('4 · graduados y en reposo NO aparecen en el widget', () => {
  const booleans = [
    { source: 'sunlight', name: 'Luz solar', completed: false },
    { source: 'cold_shower', name: 'Baño frío', completed: true },
    { source: 'no_alcohol', name: 'Sin alcohol', completed: false },
  ];

  it('la defensa doble filtra aunque el compile hubiera dejado pasar el estado', () => {
    const snap = buildHabitosSnapshot({
      date: '2026-08-10',
      booleans,
      habitStates: { cold_shower: 'graduado', no_alcohol: 'reposo' },
      habitTimes: {},
      theme: TEMA,
    });
    expect(snap.habits.map((h) => h.key)).toEqual(['sunlight']);
    expect(snap.total).toBe(1);
  });

  it('sin fila = activo: el comportamiento de siempre', () => {
    const snap = buildHabitosSnapshot({
      date: '2026-08-10', booleans, habitStates: {}, habitTimes: {}, theme: TEMA,
    });
    expect(snap.habits).toHaveLength(3);
    expect(snap.done).toBe(1);
  });
});

describe('el snapshot decide el gesto: los VERIFICADOS no se palomean', () => {
  it('declarado palomeable, verificado NO (su fila abre la app)', () => {
    const snap = buildHabitosSnapshot({
      date: '2026-08-10',
      booleans: [
        { source: 'cold_shower', name: 'Baño frío', completed: false },
        { source: 'meditation', name: 'Meditación', completed: false },
        { source: 'checkin', name: 'Check-in', completed: false },
      ],
      habitStates: {},
      habitTimes: {},
      theme: TEMA,
    });
    const porKey = Object.fromEntries(snap.habits.map((h) => [h.key, h.palomeable]));
    expect(porKey).toEqual({ cold_shower: true, meditation: false, checkin: false });
  });

  it('momento derivado de la hora RESUELTA del usuario, con el default canónico de respaldo', () => {
    const snap = buildHabitosSnapshot({
      date: '2026-08-10',
      booleans: [
        { source: 'sunlight', name: 'Luz solar', completed: false },
        { source: 'no_alcohol', name: 'Sin alcohol', completed: false },
      ],
      // sunlight personalizado a la tarde; no_alcohol cae al TAREA_TIME (21:00).
      habitTimes: { sunlight: '14:30' },
      habitStates: {},
      theme: TEMA,
    });
    const porKey = Object.fromEntries(snap.habits.map((h) => [h.key, h.momento]));
    expect(porKey).toEqual({ sunlight: 'tarde', no_alcohol: 'noche' });
  });
});

describe('5 · el widget respeta el tema', () => {
  it('el payload del tema viaja completo en cada snapshot', () => {
    const tema: WidgetThemePayload = { mode: 'adaptativo', despertarMin: 390, corteMin: 1350 };
    const habitos = buildHabitosSnapshot({
      date: '2026-08-10', booleans: [], habitStates: {}, habitTimes: {}, theme: tema,
    });
    expect(habitos.theme).toEqual(tema);
    const ayuno = buildAyunoSnapshot({ date: '2026-08-10', theme: tema, fast: null });
    expect(ayuno.theme).toEqual(tema);
  });

  it('la llave del modo es LA MISMA que guarda theme-context (un rename silencioso truena)', () => {
    expect(leer('src/services/widgets/widget-sync-service.ts')).toContain("'@atp/theme_mode'");
    expect(leer('src/contexts/theme-context.tsx')).toContain("'@atp/theme_mode'");
  });

  it('WidgetTheme.kt espeja resolveThemeKind: los cuatro modos con la misma semántica', () => {
    const kt = leer(`${KT}/WidgetTheme.kt`);
    // claro → siempre; oscuro/raro → false; sistema → uiMode del teléfono.
    expect(kt).toMatch(/"claro"\s*->\s*true/);
    expect(kt).toMatch(/else\s*->\s*false/);
    expect(kt).toContain('UI_MODE_NIGHT_NO');
    // adaptativo: ventana degenerada → oscuro; la ventana puede cruzar medianoche.
    expect(kt).toContain('if (despertarMin == corteMin) return false');
    expect(kt).toContain('now >= despertarMin || now < corteMin');
    expect(kt).toContain('now >= despertarMin && now < corteMin');
  });

  it('los fondos son SÓLIDOS por tema (nunca transparente sobre el fondo del usuario)', () => {
    const dark = leer('modules/atp-widgets/android/src/main/res/drawable/widget_bg_dark.xml');
    const light = leer('modules/atp-widgets/android/src/main/res/drawable/widget_bg_light.xml');
    expect(dark).toContain('<solid android:color="#000000"');
    expect(light).toContain('<solid android:color="#E9EEF1"');
    expect(dark.toLowerCase()).not.toContain('transparent');
    expect(light.toLowerCase()).not.toContain('transparent');
    // Y los tres providers eligen fondo por tema.
    for (const f of ['HabitosWidgetProvider', 'AguaWidgetProvider', 'AyunoWidgetProvider']) {
      expect(leer(`${KT}/${f}.kt`)).toContain('WidgetPalette.bgRes(isLight)');
    }
  });
});

describe('1 · UNA escritura, UN camino (contrato estático — la mutación truena)', () => {
  it('el drenador solo conoce a los writers canónicos: cero supabase.from', () => {
    const src = leer('src/services/widgets/widget-actions.ts');
    expect(src).toContain('persistBooleanToggle(');
    expect(src).toContain('addWater(');
    expect(src).not.toMatch(/\.from\(/);
    expect(src).not.toContain('awardBooleanElectron');
    expect(src).not.toContain("insert(");
    expect(src).not.toContain('upsert(');
  });

  it('el Kotlin del widget NO conoce la base: sin supabase, sin HTTP, sin URLs de red', () => {
    const archivos = [
      'AtpWidgetsModule.kt', 'WidgetStore.kt', 'WidgetTheme.kt', 'WidgetTapReceiver.kt',
      'AtpWidgetActionService.kt', 'HabitosWidgetProvider.kt', 'AguaWidgetProvider.kt',
      'AyunoWidgetProvider.kt',
    ];
    for (const f of archivos) {
      const kt = leer(`${KT}/${f}`).toLowerCase();
      expect(kt, `${f} no debe hablar con la red`).not.toContain('supabase');
      expect(kt, `${f} no debe hablar con la red`).not.toContain('okhttp');
      expect(kt, `${f} no debe hablar con la red`).not.toContain('httpurlconnection');
      expect(kt, `${f} no debe hablar con la red`).not.toContain('https://');
    }
  });

  it('el tap del widget ENCOLA y DESPIERTA — con el plan B de abrir la app', () => {
    const kt = leer(`${KT}/WidgetTapReceiver.kt`);
    expect(kt).toContain('WidgetStore.enqueueAction(context, action)');
    expect(kt).toContain('AtpWidgetActionService::class.java');
    expect(kt).toContain('getLaunchIntentForPackage');
  });

  it('la tarea headless del entry y el servicio Kotlin comparten el MISMO nombre', () => {
    const entry = leer('index.js');
    const kt = leer(`${KT}/AtpWidgetActionService.kt`);
    expect(entry).toContain("'AtpWidgetActions'");
    expect(kt).toContain('const val TASK_NAME = "AtpWidgetActions"');
    expect(entry).toContain('registerHeadlessTask');
    // Y el package.json apunta al entry que registra la tarea.
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg.main).toBe('index.js');
  });

  it('el manifest declara los 3 widgets, el receiver de taps, el servicio y WAKE_LOCK', () => {
    const mf = leer('modules/atp-widgets/android/src/main/AndroidManifest.xml');
    expect(mf).toContain('android.permission.WAKE_LOCK');
    expect(mf).toContain('HabitosWidgetProvider');
    expect(mf).toContain('AguaWidgetProvider');
    expect(mf).toContain('AyunoWidgetProvider');
    expect(mf).toContain('WidgetTapReceiver');
    expect(mf).toContain('AtpWidgetActionService');
  });

  it('el momento del Kotlin espeja momentoForHour (<12 mañana, <18 tarde)', () => {
    const kt = leer(`${KT}/HabitosWidgetProvider.kt`);
    expect(kt).toContain('hour < 12 -> "manana"');
    expect(kt).toContain('hour < 18 -> "tarde"');
  });

  it('el ayuno es SOLO lectura: su provider no encola ni conoce al receiver de taps', () => {
    const kt = leer(`${KT}/AyunoWidgetProvider.kt`);
    expect(kt).not.toContain('enqueueAction');
    expect(kt).not.toContain('WidgetTapReceiver');
    expect(kt).toContain('atp://fasting');
  });
});

describe('la cola, en frío: parse + plan de drenado', () => {
  it('lo malformado se tira sin tumbar lo válido, y sus ids quedan rescatables', () => {
    const json = JSON.stringify([
      { id: 'ok1', kind: 'toggle_habit', source: 'cold_shower', next: true },
      { id: 'malo1', kind: 'toggle_habit', source: '', next: true },
      { id: 'malo2', kind: 'add_water', ml: 99999 },
      { id: 'malo3', kind: 'toggle_habit', source: 'meditation', next: true },
      { sin_id: true },
      'basura',
      { id: 'ok2', kind: 'add_water', ml: 250 },
    ]);
    expect(parseWidgetActions(json).map((a) => a.id)).toEqual(['ok1', 'ok2']);
    expect(idsInQueue(json)).toEqual(['ok1', 'malo1', 'malo2', 'malo3', 'ok2']);
    expect(parseWidgetActions('{{{roto')).toEqual([]);
    expect(idsInQueue(null)).toEqual([]);
  });

  it('los toggles del mismo hábito colapsan al ÚLTIMO; el agua NUNCA colapsa', () => {
    const plan = planDrain(
      [
        { id: 't1', kind: 'toggle_habit', source: 'cold_shower', next: true },
        { id: 'w1', kind: 'add_water', ml: 250 },
        { id: 't2', kind: 'toggle_habit', source: 'cold_shower', next: false },
        { id: 'w2', kind: 'add_water', ml: 250 },
        { id: 't3', kind: 'toggle_habit', source: 'cold_shower', next: true },
      ],
      new Set(),
    );
    expect(plan.map((a) => a.id)).toEqual(['w1', 'w2', 't3']);
  });

  it('lo ya atendido y lo duplicado no se re-ejecutan (dedup del replay)', () => {
    const plan = planDrain(
      [
        { id: 'a', kind: 'add_water', ml: 250 },
        { id: 'a', kind: 'add_water', ml: 250 },
        { id: 'b', kind: 'add_water', ml: 250 },
      ],
      new Set(['b']),
    );
    expect(plan.map((a) => a.id)).toEqual(['a']);
  });
});

describe('parches con el resultado REAL de la mutación', () => {
  const snapJson = JSON.stringify(
    buildHabitosSnapshot({
      date: '2026-08-10',
      booleans: [
        { source: 'sunlight', name: 'Luz solar', completed: true },
        { source: 'cold_shower', name: 'Baño frío', completed: false },
      ],
      habitStates: {}, habitTimes: {}, theme: TEMA,
    }),
  );

  it('patchHabitCompleted corrige el hábito y recuenta done', () => {
    const parchado = JSON.parse(patchHabitCompleted(snapJson, 'cold_shower', true)!);
    expect(parchado.habits.find((h: any) => h.key === 'cold_shower').completed).toBe(true);
    expect(parchado.done).toBe(2);
    expect(patchHabitCompleted(snapJson, 'inexistente', true)).toBeNull();
    expect(patchHabitCompleted('{{roto', 'sunlight', true)).toBeNull();
  });

  it('patchWaterTotal impone el total del writer; patchWaterDelta revierte un fallo sin ir negativo', () => {
    const agua = JSON.stringify({ v: 1, water: { current: 500, target: 2500 } });
    expect(JSON.parse(patchWaterTotal(agua, 750)!).water.current).toBe(750);
    expect(JSON.parse(patchWaterDelta(agua, -250)!).water.current).toBe(250);
    expect(JSON.parse(patchWaterDelta(agua, -9999)!).water.current).toBe(0);
  });

  it('ayuno: startIso ilegible = sin ayuno (mejor "abre ATP" que un contador inventado)', () => {
    const malo = buildAyunoSnapshot({
      date: '2026-08-10', theme: TEMA,
      fast: { startIso: 'no-es-fecha', targetHours: 16 },
    });
    expect(malo.fast).toEqual({ active: false });
    const bueno = buildAyunoSnapshot({
      date: '2026-08-10', theme: TEMA,
      fast: { startIso: '2026-08-10T02:30:00.000Z', targetHours: 16 },
    });
    expect(bueno.fast).toEqual({
      active: true, startIso: '2026-08-10T02:30:00.000Z', targetHours: 16,
    });
  });

  it('el estado sin sesión es explícito y versionado', () => {
    expect(snapshotSignedOut()).toEqual({ v: 1, signedIn: false });
  });
});
