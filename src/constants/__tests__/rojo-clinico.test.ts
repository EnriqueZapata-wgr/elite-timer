/**
 * MARCA · El candado de los dos rojos.
 *
 * `brand.ts` separa a propósito dos rojos y escribe el porqué (líneas 100-102
 * y 314-315):
 *
 *   SEMANTIC.error       #E8877F  coral apagado  → error de INTERFAZ
 *   SCORE_COLORS.critical #FF3B30 rojo pleno     → dato de SALUD en crítico
 *
 * La razón es de seguridad, no de gusto: un biomarcador fuera de rango NO
 * puede verse más suave que un campo mal llenado.
 *
 * Esa regla estaba escrita y rota. Las cuatro tablas que traducen un estado
 * clínico a color pintaban `critical` con el coral del formulario, y varias
 * usaban además un TERCER rojo (#E24B4A) en el fondo. No había un solo test
 * que lo detectara: el ratchet de MB-31B solo escanea `.tsx`, y estas tablas
 * viven en `.ts`.
 *
 * Este archivo es ese test. Cubre las cuatro tablas por donde pasa cualquier
 * veredicto clínico antes de llegar a un pixel.
 */
import { describe, it, expect } from 'vitest';
import { SEMANTIC, SCORE_COLORS } from '@/src/constants/brand';
import { RATING_CONFIG } from '@/src/utils/lab-rating';
import { RATING_COLORS } from '@/src/data/functional-health-engine';
import { FLAG_STATUSES } from '@/src/data/condition-catalog';
import { EDAD_STATUS } from '@/src/components/edad-atp/tokens';

/** El tercer rojo sin doctrina que se coló en los fondos. */
const ROJO_HUERFANO = '#e24b4a';

const norm = (hex: string) => hex.trim().toLowerCase();

describe('1 · la doctrina: los dos rojos existen y son distintos', () => {
  it('SEMANTIC.error sigue siendo el coral de interfaz', () => {
    expect(norm(SEMANTIC.error)).toBe('#e8877f');
  });

  it('SCORE_COLORS.critical sigue siendo el rojo pleno de salud', () => {
    expect(norm(SCORE_COLORS.critical)).toBe('#ff3b30');
  });

  it('no son el mismo color: colapsarlos borra la distinción', () => {
    expect(norm(SCORE_COLORS.critical)).not.toBe(norm(SEMANTIC.error));
  });

  it('el rojo de salud grita más: más saturado en el canal rojo', () => {
    const canalR = (hex: string) => parseInt(hex.slice(1, 3), 16);
    expect(canalR(SCORE_COLORS.critical)).toBeGreaterThan(canalR(SEMANTIC.error));
  });
});

// ─── 2 · las cuatro tablas de estado clínico ───────────────────────────────

/** [nombre, color del peor estado] — todas deben ser el rojo de SALUD. */
const PEOR_ESTADO: [string, string][] = [
  ['lab-rating · critical', RATING_CONFIG.critical.color],
  ['lab-rating · out_of_range', RATING_CONFIG.out_of_range.color],
  ['functional-health-engine · critical', RATING_COLORS.critical],
  ['functional-health-engine · out_of_range', RATING_COLORS.out_of_range],
  ['condition-catalog · present', FLAG_STATUSES.present.color],
  ['edad-atp · EDAD_STATUS.bad', EDAD_STATUS.bad],
];

describe('2 · el peor estado clínico usa el rojo de SALUD', () => {
  it.each(PEOR_ESTADO)('%s', (_nombre, color) => {
    expect(norm(color)).toBe(norm(SCORE_COLORS.critical));
  });

  it.each(PEOR_ESTADO)('%s NO usa el coral de formulario', (_nombre, color) => {
    expect(norm(color)).not.toBe(norm(SEMANTIC.error));
  });
});

// ─── 3 · el tercer rojo no vuelve por la puerta del fondo ───────────────────

/** [nombre, valor] — colores y fondos de estado clínico. */
const SUPERFICIES_CLINICAS: [string, string][] = [
  ['lab-rating · critical bg', RATING_CONFIG.critical.bgColor],
  ['lab-rating · out_of_range bg', RATING_CONFIG.out_of_range.bgColor],
  ['condition-catalog · present bg', FLAG_STATUSES.present.bgColor],
];

describe('3 · ningún fondo de estado crítico viene de un tercer rojo', () => {
  // El fondo tiene que derivar del MISMO color que el texto. Se compara por
  // canales rgb para que dé igual el formato (rgba(255,59,48,x) o #FF3B30).
  const rgbDeCritical = [
    parseInt(SCORE_COLORS.critical.slice(1, 3), 16),
    parseInt(SCORE_COLORS.critical.slice(3, 5), 16),
    parseInt(SCORE_COLORS.critical.slice(5, 7), 16),
  ];

  it.each(SUPERFICIES_CLINICAS)('%s deriva de SCORE_COLORS.critical', (_nombre, valor) => {
    const m = valor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    expect(m, `formato inesperado: ${valor}`).not.toBeNull();
    const canales = [Number(m![1]), Number(m![2]), Number(m![3])];
    expect(canales).toEqual(rgbDeCritical);
  });

  it.each(SUPERFICIES_CLINICAS)('%s no es el rojo huérfano', (_nombre, valor) => {
    expect(norm(valor)).not.toContain(ROJO_HUERFANO.slice(1));
    expect(valor).not.toContain('226, 75, 74');
    expect(valor).not.toContain('226,75,74');
  });
});

// ─── 4 · los estados buenos no se movieron ─────────────────────────────────

describe('4 · el resto del semáforo clínico sigue anclado a SEMANTIC', () => {
  it.each([
    ['lab-rating · optimal', RATING_CONFIG.optimal.color, SEMANTIC.success],
    ['lab-rating · acceptable', RATING_CONFIG.acceptable.color, SEMANTIC.acceptable],
    ['lab-rating · risk', RATING_CONFIG.risk.color, SEMANTIC.warning],
    ['edad-atp · good', EDAD_STATUS.good, SEMANTIC.success],
    ['edad-atp · neutral', EDAD_STATUS.neutral, SEMANTIC.warning],
    ['condition-catalog · normal', FLAG_STATUSES.normal.color, SEMANTIC.success],
    ['condition-catalog · observation', FLAG_STATUSES.observation.color, SEMANTIC.warning],
  ])('%s', (_nombre, real, esperado) => {
    expect(norm(real)).toBe(norm(esperado));
  });
});
