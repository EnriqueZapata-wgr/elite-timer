/**
 * Validación del motor de salud funcional contra datos reales del Excel.
 * Ejecutar: npx tsx src/__tests__/health-engine-validation.ts
 */
import { DOMAINS } from '../data/functional-health-engine';

// rateValue es privada en el módulo, reimplementamos la misma lógica para test
type RatingLevel = 'out_of_range' | 'critical' | 'risk' | 'acceptable' | 'optimal';

function rateValue(value: number, t: (number | null)[]): { rating: RatingLevel; score: number } {
  if (t[3] === null || t[4] === null) return { rating: 'acceptable', score: 80 };

  const hasLeftSide = t[0] !== null || t[1] !== null || t[2] !== null;

  if (t[3] <= t[4]) {
    if (value >= t[3] && value <= t[4]) return { rating: 'optimal', score: 100 };
    if (value < t[3]) {
      if (t[2] !== null && value >= t[2]) return { rating: 'acceptable', score: 80 };
      if (t[1] !== null && value >= t[1]) return { rating: 'risk', score: 50 };
      if (t[0] !== null && value >= t[0]) return { rating: 'critical', score: 25 };
      return { rating: 'out_of_range', score: 0 };
    }
    if (value > t[4]) {
      if (t[5] !== null && value <= t[5]) return { rating: 'acceptable', score: 80 };
      if (t[6] !== null && value <= t[6]) return { rating: 'risk', score: 50 };
      if (t[7] !== null && value <= t[7]) return { rating: 'critical', score: 25 };
      return { rating: 'out_of_range', score: 0 };
    }
  } else {
    if (hasLeftSide) {
      if (value >= t[4] && value <= t[3]) return { rating: 'optimal', score: 100 };
      if (value > t[3]) {
        if (t[2] !== null && value <= t[2]) return { rating: 'acceptable', score: 80 };
        if (t[1] !== null && value <= t[1]) return { rating: 'risk', score: 50 };
        if (t[0] !== null && value <= t[0]) return { rating: 'critical', score: 25 };
        return { rating: 'out_of_range', score: 0 };
      }
      if (value < t[4]) {
        if (t[5] !== null && value >= t[5]) return { rating: 'acceptable', score: 80 };
        if (t[6] !== null && value >= t[6]) return { rating: 'risk', score: 50 };
        if (t[7] !== null && value >= t[7]) return { rating: 'critical', score: 25 };
        return { rating: 'out_of_range', score: 0 };
      }
    } else {
      if (value >= t[3]) return { rating: 'optimal', score: 100 };
      if (value >= t[4]) return { rating: 'acceptable', score: 80 };
      if (t[5] !== null && value >= t[5]) return { rating: 'risk', score: 50 };
      if (t[6] !== null && value >= t[6]) return { rating: 'critical', score: 25 };
      if (t[7] !== null && value >= t[7]) return { rating: 'critical', score: 25 };
      return { rating: 'out_of_range', score: 0 };
    }
  }
  return { rating: 'acceptable', score: 80 };
}

// Cache de parámetros
const paramMap = new Map<string, typeof DOMAINS[0]['parameters'][0]>();
for (const d of DOMAINS) for (const p of d.parameters) paramMap.set(p.key, p);

function findParam(key: string) { return paramMap.get(key) ?? null; }

// === TEST DATA: Paciente hombre (Enrique) ===
const MALE_TESTS: { key: string; value: number; expected: { score: number; rating: string } }[] = [
  { key: 'glucose_fasting', value: 90, expected: { score: 80, rating: 'acceptable' } },
  { key: 'hba1c', value: 5.9, expected: { score: 25, rating: 'critical' } },
  { key: 'homa_ir', value: 1.73, expected: { score: 50, rating: 'risk' } },
  { key: 'insulin', value: 7.8, expected: { score: 80, rating: 'acceptable' } },
  { key: 'apo_b', value: 104.7, expected: { score: 80, rating: 'acceptable' } },
  { key: 'hdl', value: 38.2, expected: { score: 25, rating: 'critical' } },
  { key: 'cholesterol_total', value: 189, expected: { score: 100, rating: 'optimal' } },
  { key: 'cortisol_am', value: 8, expected: { score: 80, rating: 'acceptable' } },
  { key: 'tsh', value: 1.57, expected: { score: 100, rating: 'optimal' } },
  { key: 'crp', value: 0.18, expected: { score: 100, rating: 'optimal' } },
  { key: 'creatinine', value: 0.81, expected: { score: 100, rating: 'optimal' } },
  { key: 'uric_acid', value: 6.2, expected: { score: 80, rating: 'acceptable' } },
  { key: 'vitamin_d', value: 33.4, expected: { score: 50, rating: 'risk' } },
  { key: 'vitamin_b12', value: 502, expected: { score: 80, rating: 'acceptable' } },
  { key: 'magnesium', value: 2.18, expected: { score: 80, rating: 'acceptable' } },
];

// Paciente mujer (Mariana) — parcial
const FEMALE_TESTS: { key: string; value: number; expected: { score: number; rating: string } }[] = [
  { key: 'cortisol_am', value: 10.4, expected: { score: 100, rating: 'optimal' } },
  { key: 'tsh', value: 2.06, expected: { score: 80, rating: 'acceptable' } },
];

// === RUN TESTS ===

let passed = 0;
let failed = 0;
const failures: string[] = [];

function runTest(key: string, value: number, expected: { score: number; rating: string }, sex: 'male' | 'female') {
  const param = findParam(key);
  if (!param) {
    console.log(`  ⚠️  ${key}: parámetro no encontrado en DOMAINS`);
    failed++;
    failures.push(`${key}: no encontrado`);
    return;
  }

  const ranges = sex === 'male' ? param.ranges.male : param.ranges.female;
  const result = rateValue(value, ranges);

  if (result.score === expected.score && result.rating === expected.rating) {
    console.log(`  ✅ ${key} = ${value} → ${result.rating} (${result.score}) ✓`);
    passed++;
  } else {
    console.log(`  ❌ ${key} = ${value} → ${result.rating} (${result.score})  ESPERADO: ${expected.rating} (${expected.score})`);
    console.log(`     Rangos: [${ranges.join(', ')}]`);
    failed++;
    failures.push(`${key}: got ${result.rating}(${result.score}) expected ${expected.rating}(${expected.score})`);
  }
}

console.log('\n═══ VALIDACIÓN MOTOR DE SALUD ═══\n');

console.log('── Paciente hombre (Enrique) ──');
for (const t of MALE_TESTS) runTest(t.key, t.value, t.expected, 'male');

console.log('\n── Paciente mujer (Mariana) ──');
for (const t of FEMALE_TESTS) runTest(t.key, t.value, t.expected, 'female');

console.log(`\n═══ RESULTADO: ${passed}/${passed + failed} tests pasaron ═══`);
if (failures.length > 0) {
  console.log('\nFallos:');
  failures.forEach(f => console.log(`  • ${f}`));
}
console.log('');
