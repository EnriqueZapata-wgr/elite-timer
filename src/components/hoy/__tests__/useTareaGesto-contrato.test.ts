/**
 * MB-20.5 P5 — el contrato del gesto que SÍ prueba el mapeo.
 *
 * El test viejo leía el orden de los strings en el source: cambiar
 * 'palomear' por 'navegar' en el hook dejaba los 9 tests en verde. Ahora la
 * tabla vive en tarea-gesto-core (pura), se INSTANCIA aquí y se afirma
 * completa por tipo: esa mutación truena. Del source solo se vigila lo que
 * no puede instanciarse en node — que el hook despache la tabla (sin
 * re-derivar de gesto), las vibraciones y que las TRES superficies pasen
 * por useTareaGesto.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  accionTap, accionTapLargo, TAREA_GESTOS, NUDGE_COPY, type GestoAccion,
} from '@/src/components/hoy/tarea-gesto-core';
import type { TareaGesto } from '@/src/services/hoy/tareas-core';

// Sin comentarios y CRLF-safe: el contrato lee código, no prosa.
const leer = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');

const hook = leer('src/components/hoy/useTareaGesto.ts');

describe('la tabla del gesto, instanciada y completa (P5.1)', () => {
  // tipo × con/sin ruta → [tap, tap largo]. Escrita A MANO, no derivada del
  // código: si alguien invierte la tabla en el core, esto truena.
  const TABLA: Array<[TareaGesto, ruta: boolean, tap: GestoAccion, largo: GestoAccion]> = [
    ['palomear', true,  'palomear', 'navegar'],
    ['palomear', false, 'palomear', 'nada'],
    ['navegar',  true,  'navegar',  'nada'],
    ['navegar',  false, 'nada',     'nada'],
    ['inline',   true,  'navegar',  'nada'],
    ['inline',   false, 'nada',     'nada'],
  ];

  it('cada celda de la tabla es la que Enrique decidió', () => {
    for (const [gesto, conRuta, tap, largo] of TABLA) {
      const t = { gesto, route: conRuta ? '/x' : undefined };
      expect(accionTap(t), `tap de ${gesto}${conRuta ? '' : ' sin ruta'}`).toBe(tap);
      expect(accionTapLargo(t), `largo de ${gesto}${conRuta ? '' : ' sin ruta'}`).toBe(largo);
    }
  });

  it('la tabla cubre TODOS los tipos (con y sin ruta): cero celdas sin ley', () => {
    expect(new Set(TABLA.map(([g]) => g))).toEqual(new Set(TAREA_GESTOS));
    for (const gesto of TAREA_GESTOS) {
      const conRuta = TABLA.filter(([g, r]) => g === gesto && r);
      const sinRuta = TABLA.filter(([g, r]) => g === gesto && !r);
      expect(conRuta.length, `${gesto} con ruta`).toBe(1);
      expect(sinRuta.length, `${gesto} sin ruta`).toBe(1);
    }
  });

  it('ninguna fila con ruta queda muda al tap, y sin ruta nada navega', () => {
    for (const gesto of TAREA_GESTOS) {
      expect(accionTap({ gesto, route: '/x' })).not.toBe('nada');
      expect(accionTap({ gesto, route: undefined })).not.toBe('navegar');
      expect(accionTapLargo({ gesto, route: undefined })).not.toBe('navegar');
    }
  });

  it('el tap largo nunca palomea: solo es atajo de navegación', () => {
    for (const gesto of TAREA_GESTOS) {
      for (const route of ['/x', undefined]) {
        expect(accionTapLargo({ gesto, route })).not.toBe('palomear');
      }
    }
  });
});

describe('el hook despacha la tabla — no decide (P5.1)', () => {
  it('handlePress y handleLongPress consultan el core', () => {
    expect(hook).toContain('accionTap(tarea)');
    expect(hook).toContain('accionTapLargo(tarea)');
  });

  it('el hook no re-deriva NADA de tarea.gesto: la tabla vive en UN lugar', () => {
    expect(hook).not.toContain('tarea.gesto');
    expect(hook).not.toContain('tarea.route');
  });

  it('la paloma inteligente está muerta: el hook ya no pregunta (MB-20.5)', () => {
    expect(hook).not.toContain('onExperiencia');
    expect(hook).not.toContain("'experiencia'");
  });

  it('palomear vibra al instante, y deshacer no celebra', () => {
    expect(hook).toMatch(/if \(tarea\.completed\) haptic\.light\(\);\s*\n\s*else haptic\.success\(\);\s*\n\s*onPalomear\(tarea\)/);
  });

  it('la vibración del umbral suena ANTES de navegar (tap largo)', () => {
    const largo = hook.match(/function handleLongPress\(\) \{([\s\S]*?)\n  \}/)![1];
    expect(largo.indexOf('haptic.medium()')).toBeGreaterThanOrEqual(0);
    expect(largo.indexOf('haptic.medium()')).toBeLessThan(largo.indexOf('onNavigate(tarea)'));
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

describe('el copy de la burbuja, amarrado como el del tour (P5.2)', () => {
  it('enseña la regla de DOS tipos (P6): palomea los hábitos, abre las funciones', () => {
    expect(NUDGE_COPY).toMatch(/^Un toque palomea los hábitos y abre las funciones/);
    expect(NUDGE_COPY).toContain('Mantener presionado abre el módulo');
  });

  it('cero em dash y de largo razonable (es copy de usuario)', () => {
    expect(NUDGE_COPY.includes('—')).toBe(false);
    expect(NUDGE_COPY.length).toBeLessThanOrEqual(150);
  });

  it('TareasView pinta ESTE copy, no uno suelto en el JSX', () => {
    const vista = leer('src/components/hoy/TareasView.tsx');
    expect(vista).toContain('{NUDGE_COPY}');
  });
});
