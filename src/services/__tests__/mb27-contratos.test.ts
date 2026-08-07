/**
 * MB-27 Pieza 5 — los contratos de fuente que amarran lo que el arnés
 * node-only no puede ejecutar (pantallas RN, upserts contra la base).
 *
 * Cada bloque es la mitad estática de una mutación del brief; la mitad
 * ejecutable vive en los tests unitarios de cada pieza:
 *   1  pack-core.test (esHoraValida / normalizarHora)
 *   2  techo-core.test (quants sin fuente)
 *   4  install-core.test (habitosQueEnciende)
 *   5  nutrition-score-core.test (elegirPesoKg)
 *   6  medidas-core.test (dedup por día) + contrato de upsert AQUÍ
 *   7-8 plan-semanal-core.test (día local + contrato de imports)
 *   9-10 cycle-phase-core.test (umbral único + gate)
 *   11 health-import-core.test (caminatas + distancia mínima)
 *   3, 12 y las puertas: AQUÍ.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('mutación 3: Mis hábitos ve los tres estados', () => {
  it('hoy-habitos lee getHabitStates y decide encendido con el estado', () => {
    const src = read('app/hoy-habitos.tsx');
    expect(src).toMatch(/getHabitStates/);
    expect(src).toMatch(/estadosPorKey/);
    // El encendido real = en prefs Y activo. La mutación que vuelva a leer
    // solo prefs (quitar el cruce con el estado) truena aquí.
    expect(src).toMatch(/enPrefs && estado === 'activo'/);
    // Fail-open: sin fila = activo lo da estadoDe (core, ya testeado); esta
    // pantalla no debe inventar su propio default.
    expect(src).not.toMatch(/estados\[o\.key\] \?\?/);
  });
});

describe('audit B2 (contrato): el techo evalúa la lista que se enciende', () => {
  it('la ficha del Centro evalúa con habitosQueEnciende, no con togglesForApp', () => {
    const src = read('app/centro/[appKey].tsx');
    expect(src).toMatch(/evaluarTechoEncendido\(userId, habitosQueEnciende\(app\.key\)\)/);
    // togglesForApp evaluaba una lista que EXCLUYE los MANDATORY mientras
    // installApp los enciende: se evaluaba una lista y se encendía otra.
    expect(src).not.toMatch(/togglesForApp/);
  });
});

describe('mutación 6 (contrato): capturar dos veces el mismo día NO duplica fila', () => {
  it('las dos puertas de escritura upsertean con onConflict user_id,date', () => {
    // La unicidad vive en la base (UNIQUE de la mig 030); el cliente la
    // respeta con upsert. La mutación insert-a-secas truena aquí.
    for (const rel of [
      'src/services/edad-atp/capture-service.ts',
      'src/services/health-measurement-service.ts',
    ]) {
      const src = read(rel);
      expect(src, `${rel} debe upsertear por user_id,date`).toMatch(
        /\.upsert\([\s\S]*?onConflict: 'user_id,date'/,
      );
      expect(src, `${rel} no debe insertar filas de medición a secas`).not.toMatch(
        /from\('health_measurements'\)\s*\.insert\(/,
      );
    }
  });
});

describe('mutación 8 + audit B3 (contrato): la asignación avisa, pasa por el techo y no revive en silencio', () => {
  it('plan-entrenamiento reactiva strength SOLO tras decisión explícita', () => {
    const src = read('app/plan-entrenamiento.tsx');
    // El aviso existe con sus dos salidas.
    expect(src).toMatch(/estadoDe\('strength'/);
    expect(src).toMatch(/Volverlo a activo/);
    expect(src).toMatch(/Dejarlo así/);
    // reactivarHabitos aparece exactamente una vez: dentro del closure
    // `reactivar`, que SOLO se invoca desde los onPress de los Alerts.
    // Llamarlo suelto en el flujo de guardar sería revivir en silencio.
    const ejecuciones = src.match(/reactivarHabitos\(userId/g) ?? [];
    expect(ejecuciones).toHaveLength(1);
    const invocaciones = src.match(/onPress: \(\) => \{ reactivar\(\); \}/g) ?? [];
    expect(invocaciones.length).toBeGreaterThanOrEqual(2);
    // Y `reactivar()` no se llama fuera de un onPress:
    const sueltas = (src.match(/reactivar\(\);/g) ?? []).length;
    expect(sueltas).toBe(invocaciones.length);
  });

  it('B3: es puerta de encendido — evalúa el techo ANTES de ofrecer', () => {
    const src = read('app/plan-entrenamiento.tsx');
    expect(src).toMatch(/evaluarTechoEncendido\(userId, \['strength'\]\)/);
    // Con el día lleno, el aviso del techo ofrece la salida honesta:
    expect(src).toMatch(/Encenderlo igual/);
    // El techo se evalúa antes de que exista cualquier Alert de reactivar:
    const idxTecho = src.indexOf('evaluarTechoEncendido(userId');
    const idxOferta = src.indexOf("text: 'Volverlo a activo'");
    expect(idxTecho).toBeGreaterThan(-1);
    expect(idxTecho).toBeLessThan(idxOferta);
  });
});

describe('audit B4 (contrato): guardar el plan jamás destruye antes de confirmar', () => {
  it('savePlanSemanal inserta ANTES de podar, y la poda es por ids leídos', () => {
    const src = read('src/services/fitness/plan-semanal-service.ts');
    const body = src.slice(src.indexOf('export async function savePlanSemanal'));
    const idxInsert = body.indexOf('.insert(');
    const idxDelete = body.indexOf('.delete()');
    expect(idxInsert, 'el insert debe existir').toBeGreaterThan(-1);
    expect(idxDelete, 'la poda debe existir').toBeGreaterThan(-1);
    // La mutación delete-primero (la que borraba el plan y luego decía
    // "intenta de nuevo") truena aquí:
    expect(idxInsert).toBeLessThan(idxDelete);
    // Y la poda es quirúrgica: por los ids que ESTE guardado leyó, nunca
    // un delete amplio que pueda llevarse lo que no conoció.
    expect(body).toMatch(/\.in\('id', idsViejas\)/);
  });
});

describe('mutación 12 (ratchet): nadie nuevo lee goals.habit_times crudo', () => {
  /**
   * MB-26 P5: una entrada es string | {ancla, offsetMin}. Un lector nuevo
   * que asuma string se rompe con las reglas. Los únicos módulos que pueden
   * nombrar habit_times son estos (los cuatro legítimos del brief + el
   * shape del motor de packs + dos menciones en comentarios). Aparecer en
   * esta lista exige pasar por resolverHabitTimes / parseHabitTimeEntry.
   */
  const LECTORES_PERMITIDOS = new Set([
    'src/services/hoy/habit-times-core.ts',
    'src/services/hoy/habit-times-service.ts',
    'src/services/day-compiler.ts',
    'src/services/pack-service.ts',
    'src/services/pack-core.ts',      // define el shape (HabitTimeEntryLike) para el motor
    'src/services/hoy/tareas-core.ts', // comentario (dónde viven las horas)
    'app/centro/[appKey].tsx',         // comentario (lente AGENDA)
  ]);

  it('el árbol no tiene lectores fuera de la lista', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name === '.expo' || e.name === '__tests__') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        const rel = path.relative(ROOT, full).replace(/\\/g, '/');
        if (fs.readFileSync(full, 'utf8').includes('habit_times')) hits.push(rel);
      }
    };
    walk(path.join(ROOT, 'src'));
    walk(path.join(ROOT, 'app'));
    const nuevos = hits.filter((h) => !LECTORES_PERMITIDOS.has(h));
    expect(
      nuevos,
      `lector nuevo de habit_times — pasa por resolverHabitTimes y decláralo aquí a conciencia: ${nuevos.join(', ')}`,
    ).toEqual([]);
  });
});
