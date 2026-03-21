/**
 * Tests del motor de ejecución — ejecutar con: npx tsx src/engine/__tests__/engine.test.ts
 *
 * Valida:
 * 1. Tabata: trailing rest eliminado por regla anti-acumulación
 * 2. Guinness: 239 steps, 4076s total (no afectado — último child es work)
 * 3. buildTree: lista plana → árbol correcto
 * 4. helpers: formateo de tiempo y cálculo de stats
 * 5. Anti-acumulación: trailing rest + rest_between no se duplican
 */
import { flattenRoutine, buildTree } from '../flatten';
import { calcRoutineStats, formatTime, formatTimeHuman } from '../helpers';
import { TABATA_ROUTINE, GUINNESS_ROUTINE } from '../testData';
import type { Block, Routine } from '../types';

// === UTILIDADES DE TEST ===

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual === expected) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message} — esperado: ${expected}, recibido: ${actual}`);
    failed++;
  }
}

// === TEST 1: TABATA ===
// Tabata children=[Work 20s, Rest 10s], 8 rounds, rest_between=0.
// rest_between=0 → rest explícitos se CONSERVAN (son intencionales).
// Solo el trailing rest del último round se elimina.
// Resultado: 15 steps (8 work + 7 rest), 230s total.

console.log('\n🔥 TEST TABATA');
console.log('─'.repeat(50));

const tabataSteps = flattenRoutine(TABATA_ROUTINE);
const tabataStats = calcRoutineStats(tabataSteps);

assertEqual(tabataSteps.length, 15, 'Tabata: 15 steps (8 work + 7 rest, trailing rest último round eliminado)');
assertEqual(tabataStats.totalSeconds, 230, 'Tabata: 230s total (160s work + 70s rest)');
assertEqual(tabataStats.workSeconds, 160, 'Tabata: 160s de trabajo (8×20)');
assertEqual(tabataStats.restSeconds, 70, 'Tabata: 70s de descanso (7×10)');
assertEqual(tabataSteps[0].type, 'work', 'Primer step debe ser work');
assertEqual(tabataSteps[0].label, 'Work', 'Primer step label: "Work"');

// Patrón: Work, Rest, Work, Rest, ..., Work (sin trailing rest)
assertEqual(tabataSteps[1].type, 'rest', 'Step 1 es rest');
assertEqual(tabataSteps[1].durationSeconds, 10, 'Step 1: 10s de descanso');

// Último step sigue siendo work (trailing rest eliminado en último round)
const tabataLast = tabataSteps[tabataSteps.length - 1];
assertEqual(tabataLast.type, 'work', 'Último step debe ser work');
assertEqual(tabataLast.label, 'Work', 'Último step label: "Work"');

// Verificar contexto de rondas
assertEqual(
  tabataSteps[0].context.rounds[0]?.current, 1,
  'Primer step: round 1',
);
assertEqual(
  tabataSteps[0].context.rounds[0]?.total, 8,
  'Primer step: total 8 rounds',
);
assertEqual(
  tabataLast.context.rounds[0]?.current, 8,
  'Último step: round 8 de 8',
);

// No debe haber rest_between (rest_between_seconds = 0)
const tabataRestBetween = tabataSteps.filter(s => s.isRestBetween);
assertEqual(tabataRestBetween.length, 0, 'Tabata no tiene rest_between');

// stepIndex re-indexado correctamente
assertEqual(tabataSteps[0].stepIndex, 0, 'stepIndex[0] = 0');
assertEqual(tabataSteps[tabataSteps.length - 1].stepIndex, 14, 'Último stepIndex = 14');

// === TEST 2: PROTOCOLO GUINNESS ===
// Último child de "Bloque" es "10 reps" (work) → no afectado por regla anti-acumulación.

console.log('\n🏆 TEST PROTOCOLO GUINNESS');
console.log('─'.repeat(50));

const guinnessSteps = flattenRoutine(GUINNESS_ROUTINE);
const guinnessStats = calcRoutineStats(guinnessSteps);

assertEqual(guinnessSteps.length, 239, 'Guinness: 239 steps (no afectado)');
assertEqual(guinnessStats.totalSeconds, 4076, 'Guinness: 4076s total');

// Verificar descansos de 3 minutos (rest_between del main group)
const rest180 = guinnessSteps.filter(
  s => s.isRestBetween && s.durationSeconds === 180,
);
assertEqual(rest180.length, 3, 'Debe haber exactamente 3 descansos de 3min (NO 4)');

// Verificar descansos de 16s (rest_between del mid group)
const rest16 = guinnessSteps.filter(
  s => s.isRestBetween && s.durationSeconds === 16,
);
assertEqual(rest16.length, 56, 'Debe haber 56 descansos de 16s (14 × 4 series)');

// Último step debe ser tipo work
const lastStep = guinnessSteps[guinnessSteps.length - 1];
assertEqual(lastStep.type, 'work', 'Último step debe ser type "work"');
assertEqual(lastStep.label, '10 reps', 'Último step label: "10 reps"');

// Verificar que el último step está en la ronda correcta
assertEqual(
  lastStep.context.rounds[0]?.current, 4,
  'Último step: serie 4 de 4',
);
assertEqual(
  lastStep.context.rounds[1]?.current, 15,
  'Último step: bloque 15 de 15',
);

// Verificar breadcrumb
assertEqual(
  lastStep.context.breadcrumb.join(' > '),
  'Serie Principal > Bloque > 10 reps',
  'Último step breadcrumb correcto',
);

// Contar steps de trabajo vs descanso
const guinnessWorkSteps = guinnessSteps.filter(s => s.type === 'work');
const guinnessRestSteps = guinnessSteps.filter(s => s.type === 'rest');
assertEqual(guinnessWorkSteps.length, 120, 'Guinness: 120 steps de trabajo (2×15×4)');
assertEqual(guinnessRestSteps.length, 119, 'Guinness: 119 steps de descanso');

// === TEST 3: BUILD TREE ===

console.log('\n🌳 TEST BUILD TREE');
console.log('─'.repeat(50));

// Simular datos planos de la DB (Tabata)
const flatTabata: Block[] = [
  {
    id: 'tabata-group', parent_block_id: null, sort_order: 0,
    type: 'group', label: 'Tabata', duration_seconds: null,
    rounds: 8, rest_between_seconds: 0, color: null,
    sound_start: 'default', sound_end: 'default', notes: '',
  },
  {
    id: 'tabata-work', parent_block_id: 'tabata-group', sort_order: 0,
    type: 'work', label: 'Work', duration_seconds: 20,
    rounds: 1, rest_between_seconds: 0, color: '#a8e02a',
    sound_start: 'default', sound_end: 'default', notes: '',
  },
  {
    id: 'tabata-rest', parent_block_id: 'tabata-group', sort_order: 1,
    type: 'rest', label: 'Rest', duration_seconds: 10,
    rounds: 1, rest_between_seconds: 0, color: '#4a90d9',
    sound_start: 'default', sound_end: 'default', notes: '',
  },
];

const tree = buildTree(flatTabata);

assertEqual(tree.length, 1, 'buildTree: 1 bloque raíz');
assertEqual(tree[0].id, 'tabata-group', 'buildTree: raíz es tabata-group');
assertEqual(tree[0].children?.length, 2, 'buildTree: 2 hijos');
assertEqual(tree[0].children?.[0].id, 'tabata-work', 'buildTree: primer hijo es work');
assertEqual(tree[0].children?.[1].id, 'tabata-rest', 'buildTree: segundo hijo es rest');

// Verificar que buildTree + flattenRoutine da el mismo resultado
const treeRoutine = { ...TABATA_ROUTINE, blocks: tree };
const treeSteps = flattenRoutine(treeRoutine);
assertEqual(treeSteps.length, 15, 'buildTree → flatten: 15 steps (rest explícitos conservados)');
assertEqual(
  calcRoutineStats(treeSteps).totalSeconds,
  230,
  'buildTree → flatten: 230s total',
);

// === TEST 4: HELPERS ===

console.log('\n🔧 TEST HELPERS');
console.log('─'.repeat(50));

assertEqual(formatTime(0), '00:00', 'formatTime(0) = "00:00"');
assertEqual(formatTime(30), '00:30', 'formatTime(30) = "00:30"');
assertEqual(formatTime(90), '01:30', 'formatTime(90) = "01:30"');
assertEqual(formatTime(3600), '1:00:00', 'formatTime(3600) = "1:00:00"');
assertEqual(formatTime(4076), '1:07:56', 'formatTime(4076) = "1:07:56"');

assertEqual(formatTimeHuman(30), '30s', 'formatTimeHuman(30) = "30s"');
assertEqual(formatTimeHuman(90), '1:30', 'formatTimeHuman(90) = "1:30"');
assertEqual(formatTimeHuman(240), '4:00', 'formatTimeHuman(240) = "4:00"');
assertEqual(formatTimeHuman(3600), '1h', 'formatTimeHuman(3600) = "1h"');
assertEqual(formatTimeHuman(4140), '1h 09m', 'formatTimeHuman(4140) = "1h 09m"');

// === TEST 5: ANTI-ACUMULACIÓN ===

console.log('\n🛡️ TEST ANTI-ACUMULACIÓN');
console.log('─'.repeat(50));

// Caso: Grupo con rest_between > 0 y último child es rest.
// El trailing rest se elimina, rest_between lo reemplaza.
const antiAccumRoutine: Routine = {
  id: 'test-anti-accum',
  name: 'Anti Acumulación',
  description: '',
  category: 'test',
  blocks: [
    {
      id: 'grp-main',
      parent_block_id: null,
      sort_order: 0,
      type: 'group',
      label: 'Ciclo',
      duration_seconds: null,
      rounds: 3,
      rest_between_seconds: 60,
      color: null,
      sound_start: 'default',
      sound_end: 'default',
      notes: '',
      children: [
        {
          id: 'w1',
          parent_block_id: 'grp-main',
          sort_order: 0,
          type: 'work',
          label: 'Ejercicio',
          duration_seconds: 30,
          rounds: 1,
          rest_between_seconds: 0,
          color: null,
          sound_start: 'default',
          sound_end: 'default',
          notes: '',
        },
        {
          id: 'r1',
          parent_block_id: 'grp-main',
          sort_order: 1,
          type: 'rest',
          label: 'Descanso',
          duration_seconds: 10,
          rounds: 1,
          rest_between_seconds: 0,
          color: null,
          sound_start: 'default',
          sound_end: 'default',
          notes: '',
        },
      ],
    },
  ],
};

const antiSteps = flattenRoutine(antiAccumRoutine);
const antiStats = calcRoutineStats(antiSteps);

// Sin anti-acumulación sería: Work, Rest, rest_between, Work, Rest, rest_between, Work, Rest
//   = 8 steps, 3×30 + 3×10 + 2×60 = 90+30+120 = 240s
// CON anti-acumulación: Work, rest_between(60), Work, rest_between(60), Work
//   = 5 steps, 3×30 + 2×60 = 90+120 = 210s
assertEqual(antiSteps.length, 5, 'Anti-accum: 5 steps (trailing rests eliminados)');
assertEqual(antiStats.totalSeconds, 210, 'Anti-accum: 210s (no 240s)');
assertEqual(antiSteps[0].type, 'work', 'Step 0: work');
assertEqual(antiSteps[1].isRestBetween, true, 'Step 1: rest_between (no trailing rest antes)');
assertEqual(antiSteps[1].durationSeconds, 60, 'Step 1: 60s rest_between');
assertEqual(antiSteps[2].type, 'work', 'Step 2: work');
assertEqual(antiSteps[4].type, 'work', 'Último step: work (no trailing rest)');

// Caso nested: Bloque con sub-grupo que termina en rest + rest_between del padre
const nestedRoutine: Routine = {
  id: 'test-nested',
  name: 'Nested',
  description: '',
  category: 'test',
  blocks: [
    {
      id: 'outer',
      parent_block_id: null,
      sort_order: 0,
      type: 'group',
      label: 'Bloque',
      duration_seconds: null,
      rounds: 2,
      rest_between_seconds: 90,
      color: null,
      sound_start: 'default',
      sound_end: 'default',
      notes: '',
      children: [
        {
          id: 'inner',
          parent_block_id: 'outer',
          sort_order: 0,
          type: 'group',
          label: 'Circuito',
          duration_seconds: null,
          rounds: 2,
          rest_between_seconds: 15,
          color: null,
          sound_start: 'default',
          sound_end: 'default',
          notes: '',
          children: [
            {
              id: 'nw',
              parent_block_id: 'inner',
              sort_order: 0,
              type: 'work',
              label: 'Trabajo',
              duration_seconds: 20,
              rounds: 1,
              rest_between_seconds: 0,
              color: null,
              sound_start: 'default',
              sound_end: 'default',
              notes: '',
            },
            {
              id: 'nr',
              parent_block_id: 'inner',
              sort_order: 1,
              type: 'rest',
              label: 'Descanso',
              duration_seconds: 10,
              rounds: 1,
              rest_between_seconds: 0,
              color: null,
              sound_start: 'default',
              sound_end: 'default',
              notes: '',
            },
          ],
        },
      ],
    },
  ],
};

const nestedSteps = flattenRoutine(nestedRoutine);
const nestedStats = calcRoutineStats(nestedSteps);

// Circuito round 1: Work(20) + Rest(10) → pop Rest → Work(20)
// rest_between Circuito(15)
// Circuito round 2: Work(20) + Rest(10) → pop Rest → Work(20)
// (end of Circuito, last step = Work → no pop by Bloque)
// rest_between Bloque(90)
// Bloque round 2: same as above, no rest_between after last
// = [Work, rb(15), Work, rb(90), Work, rb(15), Work] = 7 steps
// Time: 4×20 + 1×15 + 1×90 + 1×15 = 80 + 120 = 200s
assertEqual(nestedSteps.length, 7, 'Nested: 7 steps (no descansos acumulados)');
assertEqual(nestedStats.totalSeconds, 200, 'Nested: 200s total');

// Verificar que NO hay dos rests consecutivos
let hasConsecutiveRest = false;
for (let i = 1; i < nestedSteps.length; i++) {
  if (nestedSteps[i].type === 'rest' && nestedSteps[i - 1].type === 'rest') {
    hasConsecutiveRest = true;
    break;
  }
}
assert(!hasConsecutiveRest, 'Nested: no hay dos rests consecutivos');

// === RESUMEN ===

console.log('\n' + '═'.repeat(50));
console.log(`  RESULTADOS: ${passed} pasaron, ${failed} fallaron`);
console.log('═'.repeat(50));

if (failed > 0) {
  process.exit(1);
}
