/**
 * MB-30B P5 — los seis candados del run nativo (estilo censo: leen fuente).
 *
 *  1. El filtro nocturno se puede apagar SIEMPRE: desde la app (sin una sola
 *     condición) y desde el aviso persistente (y ese apagado es definitivo).
 *  2. Sin permiso de superposición la app no se rompe y lo dice con
 *     honestidad (razones tipadas + copy honesto + servicio que se detiene).
 *  3. El copy de iOS JAMÁS insinúa que ATP controla la pantalla del sistema.
 *  4. Una acción de notificación escribe por el MISMO camino que el registro
 *     normal (addWater / registrarExperiencia) — cero rutas paralelas.
 *  5. Con el maestro apagado, ninguna acción reprograma nada (canSnoozeAt
 *     gatea ANTES de agendar; prefs ilegibles = silencio).
 *  6. El escáner con cámara y el manual escriben idéntico: el visor solo
 *     alimenta handleLookup; no existe un tercer guardado.
 *
 * Cada candado tiene su mutación verificada (ver reporte del run).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  canSnoozeAt, resolveNotificationAction, NOTIFICATION_CATEGORIES, categoryForAviso,
} from '@/src/services/notification-actions-core';
import { NOTIFICATION_PREFS_DEFAULTS } from '@/src/services/notification-prefs-core';
import {
  IOS_GUIDE_INTRO, IOS_GUIDE_STEPS, IOS_GUIDE_FOOTER,
} from '@/src/components/night-filter/ios-guide-copy';

const read = (f: string) => readFileSync(f, 'utf8');

/** Pela comentarios (los headers DOCUMENTAN las reglas y mencionan lo vetado). */
function sinComentarios(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const FILTER_SERVICE = read('src/services/night-filter-service.ts');
const FILTER_SCREEN = read('app/night-filter.tsx');
const FILTER_KT = read(
  'modules/atp-night-filter/android/src/main/java/expo/modules/atpnightfilter/NightFilterService.kt',
);
const ACTIONS = read('src/services/notification-actions.ts');
const ACTIONS_CORE = read('src/services/notification-actions-core.ts');
const ACTIONS_BRIDGE = read('src/components/NotificationActionsBridge.tsx');
const AVISOS = read('src/services/app-avisos-service.ts');
const BARCODE_SCREEN = read('app/food-barcode.tsx');

/** Cuerpo de una función exportada del servicio (hasta el próximo export). */
function fnBody(src: string, header: string): string {
  const start = src.indexOf(header);
  expect(start, `no encontré "${header}"`).toBeGreaterThanOrEqual(0);
  const rest = src.slice(start + header.length);
  const end = rest.indexOf('\nexport ');
  return end === -1 ? rest : rest.slice(0, end);
}

// ─── 1 · El filtro SIEMPRE se apaga ─────────────────────────────────────────

describe('candado 1: apagar el filtro siempre funciona', () => {
  it('disableNightFilter no tiene UNA sola rama condicional', () => {
    const body = fnBody(FILTER_SERVICE, 'export async function disableNightFilter');
    expect(body).toContain('stopFilter');
    expect(body).toContain('persistEnabled(false)');
    // Sin permiso, sin red, sin estado: apagar es incondicional.
    expect(body, 'disableNightFilter tiene una condición — apagar debe ser incondicional')
      .not.toMatch(/\bif\s*\(/);
    expect(body).not.toContain('canDrawOverlays');
  });

  it('la pantalla apaga sin pedir nada (la rama !next no consulta permisos)', () => {
    const m = /if \(!next\) \{([\s\S]*?)\breturn;/.exec(FILTER_SCREEN);
    expect(m, 'la rama de apagado del toggle desapareció').toBeTruthy();
    expect(m![1]).toContain('disableNightFilter');
    expect(m![1]).not.toContain('canDrawOverlays');
  });

  it('el aviso persistente existe y trae el botón de apagado', () => {
    expect(FILTER_KT).toContain('setOngoing(true)');
    expect(FILTER_KT).toContain('"Apagar filtro"');
    expect(FILTER_KT).toMatch(/ACTION_STOP ->[\s\S]*?stopSelf\(\)/);
  });

  it('apagar desde el aviso es DEFINITIVO (apaga también la preferencia)', () => {
    // Kotlin marca el apagado…
    expect(FILTER_KT).toMatch(/ACTION_STOP ->[\s\S]*?PREF_STOPPED_BY_NOTIFICATION, true/);
    // …y el restore JS lo consume ANTES de considerar re-armar.
    const body = fnBody(FILTER_SERVICE, 'export async function restoreNightFilterOnLaunch');
    const consume = body.indexOf('consumeStoppedFromNotification');
    const start = body.indexOf('startFilter');
    expect(consume).toBeGreaterThanOrEqual(0);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(consume, 'el restore re-arma antes de honrar el apagado del aviso').toBeLessThan(start);
  });
});

// ─── 2 · Sin permiso, la app no se rompe y lo dice ──────────────────────────

describe('candado 2: sin permiso de superposición, honestidad y cero crash', () => {
  it('el wrapper degrada fail-soft con razones tipadas', () => {
    // La rama EXACTA del permiso debe decir 'permission' (una mutación real
    // demostró que buscar la cadena suelta no basta: hay dos ocurrencias).
    expect(FILTER_SERVICE).toMatch(
      /if \(!mod\.canDrawOverlays\(\)\) return \{ ok: false, reason: 'permission' \};/,
    );
    expect(FILTER_SERVICE).toContain("'unavailable'");
    // Sin módulo (iOS / binario viejo) canDrawOverlays responde false, no truena.
    expect(FILTER_SERVICE).toMatch(/canDrawOverlays\(\) \?\? false/);
  });

  it('la pantalla lo dice con honestidad (permiso y módulo ausente)', () => {
    expect(FILTER_SCREEN).toContain('permiso de superposición');
    // La app sigue completa sin el permiso: ese copy no puede desaparecer.
    expect(FILTER_SCREEN).toMatch(/ATP funciona (igual|completa)/);
    expect(FILTER_SCREEN).toContain('aún no trae el módulo');
  });

  it('el permiso se pide SOLO al activar, nunca al abrir la app', () => {
    // El bridge de arranque no abre Ajustes ni pide nada.
    const bridge = read('src/components/NightFilterBridge.tsx');
    expect(bridge).not.toContain('openOverlaySettings');
    // Y el restore tampoco: sin permiso, simplemente no re-arma.
    const body = fnBody(FILTER_SERVICE, 'export async function restoreNightFilterOnLaunch');
    expect(body).not.toContain('openOverlaySettings');
  });

  it('el servicio Android se detiene solo si el permiso falta o se revoca', () => {
    const checks = FILTER_KT.match(/if \(!Settings\.canDrawOverlays\(this\)\)/g) ?? [];
    expect(checks.length, 'el servicio debe chequear el permiso al arrancar Y en cada tick')
      .toBeGreaterThanOrEqual(2);
    expect(FILTER_KT).toContain('stopSelf()');
  });
});

// ─── 3 · El copy de iOS no promete control del sistema ──────────────────────

describe('candado 3: barrido de honestidad del copy iOS', () => {
  // "ATP <verbo de control>" en afirmativo = mentira en iOS. La lista cubre
  // presente y futuro; agregar copy nuevo que la dispare truena aquí.
  // ⚠️ Sin \b al final: el \b de JS es ASCII y 'á' no es \w — "activará"
  // se le escapaba (mutación M3 lo demostró). Lookahead con acentos.
  const CONTROL = /\bATP\s+(controla(rá)?|activa(rá)?|ajusta(rá)?|cambia(rá)?|enciende|encenderá|apaga(rá)?|programa(rá)?|aplica(rá)?|maneja(rá)?|modifica(rá)?|dibuja(rá)?|pone|pondrá)(?![a-záéíóúñ])/i;

  const copyCompleto = [
    IOS_GUIDE_INTRO.title,
    IOS_GUIDE_INTRO.body,
    ...IOS_GUIDE_STEPS.flatMap((s) => [s.title, s.body]),
    IOS_GUIDE_FOOTER,
  ].join('\n');

  it('ninguna frase del copy dice que ATP controla la pantalla', () => {
    expect(copyCompleto).not.toMatch(CONTROL);
  });

  it('la rama iOS de la pantalla tampoco', () => {
    const iosBranch = FILTER_SCREEN.slice(
      FILTER_SCREEN.indexOf("Platform.OS === 'ios'"),
      FILTER_SCREEN.indexOf('Rama Android'),
    );
    expect(iosBranch.length).toBeGreaterThan(100);
    expect(iosBranch).not.toMatch(CONTROL);
  });

  it('y dice la verdad en positivo: el sistema lo hace, no ATP', () => {
    expect(copyCompleto).toContain('Apple no permite');
    expect(copyCompleto).toMatch(/lo ejecuta tu iPhone/);
    expect(IOS_GUIDE_FOOTER).toContain('ATP no toca la pantalla');
  });
});

// ─── 4 · Las acciones escriben por el camino normal ─────────────────────────

describe('candado 4: cero rutas paralelas al ledger desde acciones', () => {
  it('el handler importa LOS writers canónicos', () => {
    expect(ACTIONS).toContain("import { addWater } from '@/src/services/hydration-service'");
    expect(ACTIONS).toContain("import { registrarExperiencia } from '@/src/services/hoy/tarea-actions'");
  });

  it('cada intención va a su writer (agua → addWater, mente → registrarExperiencia)', () => {
    expect(ACTIONS).toMatch(/case 'log_water':[\s\S]{0,400}?addWater\(/);
    expect(ACTIONS).toMatch(/case 'log_meditation':[\s\S]{0,400}?registrarExperiencia\(userId, 'meditation'/);
    expect(ACTIONS).toMatch(/case 'log_breathwork':[\s\S]{0,400}?registrarExperiencia\(userId, 'breathwork'/);
  });

  it('NINGÚN archivo de acciones toca supabase ni tablas directo', () => {
    for (const [name, src] of [
      ['notification-actions.ts', ACTIONS],
      ['notification-actions-core.ts', ACTIONS_CORE],
      ['NotificationActionsBridge.tsx', ACTIONS_BRIDGE],
    ] as const) {
      const codigo = sinComentarios(src);
      expect(codigo, `${name} importa supabase — las acciones van por los writers`)
        .not.toContain('supabase');
      expect(codigo, `${name} accede a una tabla directo`).not.toMatch(/\.from\(['"]/);
      expect(codigo, `${name} inserta directo`).not.toMatch(/\.(insert|upsert)\(/);
    }
  });

  it('los avisos agendados llevan su categoría (los botones llegan al aviso)', () => {
    expect(AVISOS).toContain('categoryForAviso');
    expect(AVISOS).toContain('categoryIdentifier');
    expect(categoryForAviso('meditar')).toBe('aviso_meditar');
    expect(categoryForAviso('agua')).toBeNull(); // agua condicional = B1, server
  });

  it('el catálogo trae lo prometido y nada anónimo', () => {
    const ids = NOTIFICATION_CATEGORIES.map((c) => c.identifier).sort();
    expect(ids).toEqual(['aviso_journal', 'aviso_meditar', 'aviso_respirar', 'aviso_sol', 'hidratacion']);
    // Toda acción del catálogo resuelve a una intención conocida.
    for (const cat of NOTIFICATION_CATEGORIES) {
      for (const a of cat.actions) {
        expect(resolveNotificationAction(a.identifier).kind, `acción sin intención: ${a.identifier}`)
          .not.toBe('none');
      }
    }
  });
});

// ─── 5 · El maestro apagado: nada reprograma ────────────────────────────────

describe('candado 5: con el maestro apagado ninguna acción reprograma', () => {
  const base = { ...NOTIFICATION_PREFS_DEFAULTS };

  it('prefs ilegibles = silencio (tri-estado duro)', () => {
    expect(canSnoozeAt(null, 12 * 60)).toBe(false);
  });

  it('modo silent = NO, diga lo que diga la hora', () => {
    expect(canSnoozeAt({ ...base, mode: 'silent' }, 12 * 60)).toBe(false);
  });

  it('el target dentro de horas de silencio = NO', () => {
    const prefs = { ...base, quiet_hours_start: '22:00', quiet_hours_end: '07:00' };
    expect(canSnoozeAt(prefs, 23 * 60)).toBe(false); // 23:00, adentro
    expect(canSnoozeAt(prefs, 12 * 60)).toBe(true); // mediodía, afuera
  });

  it('el snooze real gatea con canSnoozeAt ANTES de agendar', () => {
    const snooze = ACTIONS.slice(
      ACTIONS.indexOf('async function snoozeFromResponse'),
      ACTIONS.indexOf('// ── Despacho'),
    );
    expect(snooze).toContain('if (!canSnoozeAt(prefs, targetMinutes)) return;');
    const gate = snooze.indexOf('canSnoozeAt(');
    const schedule = snooze.indexOf('scheduleNotificationAsync(');
    expect(gate, 'el gate del maestro desapareció del snooze').toBeGreaterThanOrEqual(0);
    expect(schedule).toBeGreaterThanOrEqual(0);
    expect(gate, 'se agenda ANTES de consultar al maestro').toBeLessThan(schedule);
  });

  it('LANDMINE #28: nadie cancela lo de los demás', () => {
    expect(sinComentarios(ACTIONS)).not.toContain('cancelAllScheduledNotificationsAsync');
  });
});

// ─── 6 · Cámara y manual escriben idéntico ──────────────────────────────────

describe('candado 6: el visor solo alimenta el flujo que ya existía', () => {
  it('el código escaneado entra por handleLookup, como el tecleado', () => {
    expect(BARCODE_SCREEN).toMatch(/onBarcodeScanned=\{\(\{ data \}\) => onBarcodeRead\(data\)\}/);
    const fn = BARCODE_SCREEN.slice(
      BARCODE_SCREEN.indexOf('function onBarcodeRead'),
      BARCODE_SCREEN.indexOf('async function saveProduct'),
    );
    expect(fn).toContain('handleLookup(data)');
    expect(fn, 'el visor no puede guardar por su cuenta').not.toContain('saveFoodLog');
  });

  it('no nació un tercer guardado: saveFoodLog sigue llamándose 2 veces', () => {
    const llamadas = BARCODE_SCREEN.match(/saveFoodLog\(/g) ?? [];
    expect(llamadas.length).toBe(2); // saveProduct + saveManual, como en MB-28B
  });

  it('expo-camera va con lazy require (doctrina ExpoPrint), jamás top-level', () => {
    expect(BARCODE_SCREEN).not.toMatch(/^import[^\n]*from 'expo-camera'/m);
    expect(BARCODE_SCREEN).toContain("require('expo-camera')");
  });

  it('handleLookup guarda el guard de eventos (raw solo si es string)', () => {
    expect(BARCODE_SCREEN).toContain("typeof raw === 'string'");
  });

  it('el teclado sigue siendo el camino primario (input + submit intactos)', () => {
    expect(BARCODE_SCREEN).toContain('onSubmitEditing={handleLookup}');
    expect(BARCODE_SCREEN).toContain('keyboardType="number-pad"');
  });
});
