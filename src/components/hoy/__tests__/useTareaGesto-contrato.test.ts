/**
 * MB-20.4 · Pieza 1 — el gesto se invierte, y este contrato lo amarra:
 * TAP palomea (o pregunta, si es experiencia), TAP LARGO navega, y sin ruta
 * el tap largo no hace nada.
 *
 * Vitest node no monta React Native, así que el contrato se lee del SOURCE
 * del hook único (el mismo patrón que reconcile-core.test.ts usa con
 * day-compiler): si alguien re-invierte un handler, esto truena antes que
 * el device test. También amarra que las TRES superficies (fila, card,
 * renglón de hechas) sigan pasando por useTareaGesto — el cambio de gesto
 * debe vivir en un solo lugar.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Sin comentarios y CRLF-safe: el contrato lee código, no prosa.
const leer = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');

const hook = leer('src/components/hoy/useTareaGesto.ts');

/** El cuerpo de una función declarada al nivel del hook (indentación de 2). */
function cuerpo(nombre: string): string {
  const m = hook.match(new RegExp(`function ${nombre}\\(\\) \\{([\\s\\S]*?)\\n  \\}`));
  expect(m, `function ${nombre}() no está en useTareaGesto`).toBeTruthy();
  return m![1];
}

describe('useTareaGesto — el contrato invertido (MB-20.4)', () => {
  it('el TAP palomea o abre la paloma inteligente — nunca navega', () => {
    const press = cuerpo('handlePress');
    expect(press).toContain('onPalomear(tarea)');
    expect(press).toContain('onExperiencia(tarea)');
    expect(press).not.toContain('onNavigate');
  });

  it('la paloma inteligente solo abre en experiencia PENDIENTE', () => {
    const press = cuerpo('handlePress');
    expect(press).toMatch(/gesto === 'experiencia' && !tarea\.completed/);
  });

  it('el TAP LARGO navega — nunca palomea ni pregunta', () => {
    const largo = cuerpo('handleLongPress');
    expect(largo).toContain('onNavigate(tarea)');
    expect(largo).not.toContain('onPalomear');
    expect(largo).not.toContain('onExperiencia');
  });

  it('sin ruta, el tap largo no hace nada (y no vibra): el guard va ANTES', () => {
    const largo = cuerpo('handleLongPress');
    const guard = largo.indexOf('if (!tarea.route) return');
    const nav = largo.indexOf('onNavigate(tarea)');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(nav).toBeGreaterThan(guard);
    expect(largo.indexOf('haptic')).toBeGreaterThan(guard);
  });

  it('Pieza 3: la vibración del umbral suena ANTES de navegar', () => {
    const largo = cuerpo('handleLongPress');
    expect(largo.indexOf('haptic.')).toBeLessThan(largo.indexOf('onNavigate(tarea)'));
  });

  it('Pieza 3: palomear vibra al instante, y deshacer no celebra', () => {
    const press = cuerpo('handlePress');
    // La vibración va antes del toggle, y el despalomeo usa la suave.
    expect(press.indexOf('haptic.')).toBeLessThan(press.indexOf('onPalomear(tarea)'));
    expect(press).toMatch(/if \(tarea\.completed\) haptic\.light\(\);\s*\n\s*else haptic\.success\(\)/);
  });

  it('el llenado de 350 ms está muerto: era la señal del gesto viejo', () => {
    expect(hook).not.toContain('useSharedValue');
    expect(hook).not.toContain('withTiming');
    expect(hook).not.toContain('fillStyle');
  });

  it('las tres superficies pasan por el hook: el gesto vive en UN lugar', () => {
    for (const rel of [
      'src/components/hoy/TareaRow.tsx',
      'src/components/hoy/TareaCard.tsx',
      'src/components/hoy/TareaHechaRow.tsx',
    ]) {
      const src = leer(rel);
      expect(src, rel).toContain('useTareaGesto(tarea, { onNavigate, onPalomear, onExperiencia })');
      expect(src, `${rel} debe cablear onLongPress al hook`).toContain('onLongPress={handleLongPress}');
      expect(src, `${rel} debe cablear onPress al hook`).toContain('onPress={handlePress}');
    }
  });
});
