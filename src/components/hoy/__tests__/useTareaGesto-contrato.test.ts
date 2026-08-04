/**
 * MB-20.4 (ajuste de Enrique) + MB-20.5 (muere el modal) — el contrato del
 * gesto: el TAP hace LA ACCIÓN PRINCIPAL de cada fila, y el tap largo solo
 * es atajo donde el tap hace otra cosa.
 *
 *   · palomear → tap palomea; tap largo navega si hay ruta.
 *   · navegar  → tap navega (su única acción); tap largo nada.
 *   · inline   → botones capturan; el tap del resto navega; largo nada.
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

describe('useTareaGesto — el tap hace la acción principal (ajuste MB-20.4)', () => {
  it('TAP en palomeable: palomea ANTES de cualquier navegación', () => {
    const press = cuerpo('handlePress');
    const palomea = press.indexOf('onPalomear(tarea)');
    const navega = press.indexOf('onNavigate(tarea)');
    expect(palomea).toBeGreaterThanOrEqual(0);
    // El fallback de navegación existe (navegar/inline) pero va DESPUÉS de
    // la rama palomear: ninguna fila palomeable navega con tap.
    expect(navega).toBeGreaterThan(palomea);
  });

  it('TAP en navegar/inline: navega — ninguna fila con ruta queda muda al toque', () => {
    const press = cuerpo('handlePress');
    expect(press).toContain('onNavigate(tarea)');
    // Y sin ruta, el tap no hace nada (ni vibra): el guard va antes.
    const guard = press.indexOf('if (!tarea.route) return');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(press.indexOf('onNavigate(tarea)')).toBeGreaterThan(guard);
  });

  it('la paloma inteligente está muerta: el hook ya no pregunta (MB-20.5)', () => {
    expect(hook).not.toContain('onExperiencia');
    expect(hook).not.toContain("'experiencia'");
  });

  it('el TAP LARGO es solo el atajo de palomear — nunca palomea', () => {
    const largo = cuerpo('handleLongPress');
    expect(largo).toContain('onNavigate(tarea)');
    expect(largo).not.toContain('onPalomear');
    // En navegar e inline el tap ya navega: el hold no tiene papel. El
    // guard de gesto va ANTES de navegar.
    const gestoGuard = largo.indexOf("if (tarea.gesto !== 'palomear') return");
    expect(gestoGuard).toBeGreaterThanOrEqual(0);
    expect(largo.indexOf('onNavigate(tarea)')).toBeGreaterThan(gestoGuard);
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
      expect(src, rel).toContain('useTareaGesto(tarea, { onNavigate, onPalomear })');
      expect(src, `${rel} debe cablear onLongPress al hook`).toContain('onLongPress={handleLongPress}');
      expect(src, `${rel} debe cablear onPress al hook`).toContain('onPress={handlePress}');
    }
  });
});
