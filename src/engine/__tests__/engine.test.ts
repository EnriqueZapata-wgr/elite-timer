/**
 * Tests del motor de ejecución — ejecutar con: npx tsx src/engine/__tests__/engine.test.ts
 *
 * Valida:
 * 1. Tabata: 16 steps, 240s total
 * 2. Guinness: 239 steps, 4076s total, reglas de rest_between
 * 3. buildTree: lista plana → árbol correcto
 * 4. helpers: formateo de tiempo y cálculo de stats
 */
import { flattenRoutine, buildTree } from '../flatten';
import { calcRoutineStats, formatTime, formatTimeHuman } from '../helpers';
import { TABATA_ROUTINE, GUINNESS_ROUTINE } from '../testData';
import type { Block } from '../types';

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

console.log('\n🔥 TEST TABATA');
console.log('─'.repeat(50));

const tabataSteps = flattenRoutine(TABATA_ROUTINE);
const tabataStats = calcRoutineStats(tabataSteps);

assertEqual(tabataSteps.length, 16, 'Tabata debe tener 16 steps');
assertEqual(tabataStats.totalSeconds, 240, 'Tabata debe durar 240s (4 min)');
assertEqual(tabataStats.workSeconds, 160, 'Tabata: 160s de trabajo (8×20)');
assertEqual(tabataStats.restSeconds, 80, 'Tabata: 80s de descanso (8×10)');
assertEqual(tabataSteps[0].type, 'work', 'Primer step debe ser work');
assertEqual(tabataSteps[0].label, 'Work', 'Primer step label: "Work"');
assertEqual(tabataSteps[1].type, 'rest', 'Segundo step debe ser rest');
assertEqual(tabataSteps[15].type, 'rest', 'Último step debe ser rest');

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
  tabataSteps[14].context.rounds[0]?.current, 8,
  'Penúltimo step: round 8',
);

// No debe haber rest_between (rest_between_seconds = 0)
const tabataRestBetween = tabataSteps.filter(s => s.isRestBetween);
assertEqual(tabataRestBetween.length, 0, 'Tabata no tiene rest_between');

// === TEST 2: PROTOCOLO GUINNESS ===

console.log('\n🏆 TEST PROTOCOLO GUINNESS');
console.log('─'.repeat(50));

const guinnessSteps = flattenRoutine(GUINNESS_ROUTINE);
const guinnessStats = calcRoutineStats(guinnessSteps);

assertEqual(guinnessSteps.length, 239, 'Guinness debe tener 239 steps');
assertEqual(guinnessStats.totalSeconds, 4076, 'Guinness debe durar 4076s');

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
assertEqual(treeSteps.length, 16, 'buildTree → flatten: 16 steps');
assertEqual(
  calcRoutineStats(treeSteps).totalSeconds,
  240,
  'buildTree → flatten: 240s total',
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

// === RESUMEN ===

console.log('\n' + '═'.repeat(50));
console.log(`  RESULTADOS: ${passed} pasaron, ${failed} fallaron`);
console.log('═'.repeat(50));

if (failed > 0) {
  process.exit(1);
}
