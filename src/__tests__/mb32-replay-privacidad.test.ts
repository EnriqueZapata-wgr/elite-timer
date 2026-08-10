/**
 * MB-32 · PIEZA 6 — la grabación de sesión NO puede ver datos de salud.
 *
 * ATP graba sesiones de PostHog para depurar UX, pero maneja labs,
 * biomarcadores, síntomas, journal, check-in emocional y el chat de ARGOS.
 * El contrato de privacidad tiene tres patas y cada una truena sola:
 *
 *   1. La config del provider es LA MÁS ESTRICTA: todo texto y toda imagen
 *      enmascarados, sin logs y sin telemetría de red en el replay.
 *      (El default del SDK ya enmascara; aquí queda EXPLÍCITO para que
 *      apagarlo sea un diff visible y este test lo cache.)
 *   2. Lo que el enmascaramiento global NO ve es lo dibujado por SVG: los
 *      charts con SvgText pintan valores clínicos como trazos, no como
 *      texto. TODO archivo de src/ que use SvgText debe ocultarse él mismo
 *      con PostHogMaskView — barrido automático, no lista de memoria.
 *   3. El plano emocional se oculta ENTERO: la posición es el dato.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const leer = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|\s)\/\/.*$/, ''))
    .join('\n');

describe('1 · el provider graba con el enmascaramiento más estricto', () => {
  const layout = leer('app/_layout.tsx');

  it('la grabación está encendida (y exige el paquete nativo: el flag solo no graba)', () => {
    expect(layout).toMatch(/enableSessionReplay:\s*true/);
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    // posthog-react-native 4.x: sin este paquete el SDK solo avisa
    // "Session replay enabled but not installed" y no graba nada.
    expect(pkg.dependencies['posthog-react-native-session-replay']).toBeDefined();
  });

  it('todo texto enmascarado (inputs Y <Text> estático) — apagarlo truena aquí', () => {
    expect(layout).toMatch(/maskAllTextInputs:\s*true/);
  });

  it('toda imagen a placeholder y pickers del sistema enmascarados', () => {
    expect(layout).toMatch(/maskAllImages:\s*true/);
    expect(layout).toMatch(/maskAllSandboxedViews:\s*true/);
  });

  it('sin logs ni telemetría de red en el replay (llevan contexto clínico y URLs con filtros)', () => {
    expect(layout).toMatch(/captureLog:\s*false/);
    expect(layout).toMatch(/captureNetworkTelemetry:\s*false/);
  });
});

describe('2 · barrido: todo SVG que dibuja texto se oculta de la grabación', () => {
  const raiz = resolve(process.cwd(), 'src');
  const conSvgText: string[] = [];
  const caminar = (dir: string) => {
    for (const nombre of readdirSync(dir)) {
      if (nombre === '__tests__' || nombre === 'node_modules') continue;
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) {
        caminar(ruta);
      } else if (nombre.endsWith('.tsx')) {
        const src = readFileSync(ruta, 'utf8');
        if (src.includes('Text as SvgText')) conSvgText.push(ruta);
      }
    }
  };
  caminar(raiz);

  it('encuentra a los sospechosos de siempre (si el barrido deja de ver, este test miente)', () => {
    const nombres = conSvgText.map((r) => r.replace(/\\/g, '/').split('/').pop());
    expect(nombres).toEqual(
      expect.arrayContaining(['SimpleCharts.tsx', 'ParameterChart.tsx']),
    );
  });

  it('CADA archivo con SvgText se envuelve en PostHogMaskView (charts nuevos incluidos)', () => {
    for (const ruta of conSvgText) {
      const src = readFileSync(ruta, 'utf8');
      expect(src, `${ruta} dibuja texto en SVG y no se oculta de la grabación`).toContain(
        'PostHogMaskView',
      );
    }
  });
});

describe('3 · el check-in emocional se oculta entero', () => {
  it('MoodPlane (la posición ES el dato) va dentro de PostHogMaskView', () => {
    const plano = readFileSync(
      resolve(process.cwd(), 'src/components/checkin/MoodPlane.tsx'),
      'utf8',
    );
    expect(plano).toContain('<PostHogMaskView');
    expect(plano).toContain('</PostHogMaskView>');
  });
});
