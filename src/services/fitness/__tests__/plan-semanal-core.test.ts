/**
 * Tests que amarran la asignación del día (MB-27 Pieza 2, mutaciones 7 y 8).
 *
 * La resolución de "hoy" es LOCAL: el día de la semana sale de la fecha
 * local del dispositivo, jamás del CURRENT_DATE del servidor (que a las 7pm
 * de CDMX ya va en mañana). Y la asignación NO acredita el electrón
 * strength ni toca estados: este módulo es de solo-agenda.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  asignacionDeHoy, proximaAsignacion, planDeFilas, diaSemanaLocal,
  tituloDeAsignacion, esEnfoquePlan, ENFOQUE_LABELS,
  type AsignacionRow,
} from '@/src/services/fitness/plan-semanal-core';

// 2026-08-06 es JUEVES (dow 4). 2026-08-09 es domingo (dow 0).
const HOY = '2026-08-06';

const fila = (over: Partial<AsignacionRow>): AsignacionRow => ({
  schedule_type: 'weekly_cycle',
  day_of_week: null,
  specific_date: null,
  focus: null,
  routine_id: null,
  is_active: true,
  ...over,
});

describe('diaSemanaLocal (mutación 7: la zona horaria no mueve el día)', () => {
  it('resuelve el día desde la fecha LOCAL, no desde UTC', () => {
    // parseLocalDate ancla a mediodía local: el dow es el del string SIEMPRE,
    // aunque el equipo corra en UTC-6 donde new Date('2026-08-06') (UTC
    // medianoche) retrocedería al miércoles 5.
    expect(diaSemanaLocal('2026-08-06')).toBe(4); // jueves
    expect(diaSemanaLocal('2026-08-09')).toBe(0); // domingo
    expect(diaSemanaLocal('2026-08-03')).toBe(1); // lunes
  });
});

describe('asignacionDeHoy', () => {
  const semana: AsignacionRow[] = [
    fila({ day_of_week: 1, focus: 'empuje' }),
    fila({ day_of_week: 4, focus: 'pierna_traccion' }),
    fila({ day_of_week: 6, focus: 'full_body' }),
  ];

  it('el día correcto devuelve la rutina correcta (jueves → pierna_traccion)', () => {
    expect(asignacionDeHoy(semana, HOY)?.focus).toBe('pierna_traccion');
    expect(asignacionDeHoy(semana, '2026-08-03')?.focus).toBe('empuje');
  });

  it('día sin asignación = null (descanso, no default inventado)', () => {
    expect(asignacionDeHoy(semana, '2026-08-09')).toBe(null); // domingo
  });

  it('fecha específica gana sobre el ciclo semanal', () => {
    const rows = [
      ...semana,
      fila({ schedule_type: 'specific_date', specific_date: HOY, focus: 'tren_superior' }),
    ];
    expect(asignacionDeHoy(rows, HOY)?.focus).toBe('tren_superior');
  });

  it('filas inactivas o sin objetivo no cuentan; null degrada a null', () => {
    expect(asignacionDeHoy([fila({ day_of_week: 4, focus: 'empuje', is_active: false })], HOY)).toBe(null);
    expect(asignacionDeHoy([fila({ day_of_week: 4 })], HOY)).toBe(null);
    expect(asignacionDeHoy(null, HOY)).toBe(null);
    expect(asignacionDeHoy([], HOY)).toBe(null);
  });

  it('una rutina guardada asignada también resuelve (coach o propia)', () => {
    const rows = [fila({ day_of_week: 4, routine_id: 'r-1', routine_name: 'Piernas de acero' })];
    const hoy = asignacionDeHoy(rows, HOY);
    expect(hoy?.routine_id).toBe('r-1');
    expect(tituloDeAsignacion(hoy!)).toBe('Piernas de acero');
  });
});

describe('proximaAsignacion (el descanso dice cuándo sigue)', () => {
  it('desde el jueves, la próxima es el sábado full_body', () => {
    const semana = [
      fila({ day_of_week: 1, focus: 'empuje' }),
      fila({ day_of_week: 6, focus: 'full_body' }),
    ];
    const prox = proximaAsignacion(semana, HOY);
    expect(prox?.date).toBe('2026-08-08');
    expect(prox?.enDias).toBe(2);
    expect(prox?.row.focus).toBe('full_body');
  });

  it('sin plan → null', () => {
    expect(proximaAsignacion([], HOY)).toBe(null);
    expect(proximaAsignacion(null, HOY)).toBe(null);
  });
});

describe('planDeFilas (el plan editable ignora lo del coach)', () => {
  it('solo filas weekly de enfoque entran al plan; las de rutina no se editan aquí', () => {
    const rows = [
      fila({ day_of_week: 1, focus: 'empuje' }),
      fila({ day_of_week: 3, routine_id: 'r-coach' }),
      fila({ day_of_week: 5, focus: 'full_body', is_active: false }),
    ];
    expect(planDeFilas(rows)).toEqual({ 1: 'empuje' });
  });
});

describe('labels y contrato', () => {
  it('todo enfoque del plan tiene label (la UI nunca pinta la llave cruda)', () => {
    for (const e of Object.keys(ENFOQUE_LABELS)) {
      expect(esEnfoquePlan(e)).toBe(true);
      expect(ENFOQUE_LABELS[e as keyof typeof ENFOQUE_LABELS].length).toBeGreaterThan(0);
    }
  });

  it('mutaciones 7/8: la asignación NO toca electrones ni estados de hábito', () => {
    // Contrato de fuente: ni el core ni el servicio importan el ledger, los
    // estados ni las prefs de electrones. La asignación agenda, no acredita
    // ni revive: strength se gana entrenando (exercise_logs) y el aviso de
    // reposo vive en la UI con decisión explícita del usuario.
    const dir = path.resolve(__dirname, '..');
    for (const file of ['plan-semanal-core.ts', 'plan-semanal-service.ts']) {
      const src = fs.readFileSync(path.join(dir, file), 'utf8');
      const imports = src.match(/^import[\s\S]*?from\s+'[^']+';?$/gm)?.join('\n') ?? '';
      expect(imports, `${file} no debe importar el ledger ni los estados`).not.toMatch(
        /electron-log|habit-states|electron-prefs|day-booleans/,
      );
      expect(src, `${file} no debe escribir el ledger`).not.toMatch(/from\('electron_logs'\)/);
    }
  });
});
