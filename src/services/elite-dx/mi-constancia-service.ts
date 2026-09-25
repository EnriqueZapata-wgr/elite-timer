/**
 * mi-constancia-service: lo único de PROGRESO que toca la red
 * (25-sep-2026, APP_ELITE_DX).
 *
 * POR QUÉ EXISTE: la sala PROGRESO le enseña al cliente su constancia de los
 * últimos 14 días, y la regla de la casa es que ese número sea EL MISMO que
 * Enrique ve en su consola. Por eso aquí no se calcula nada: se hacen las
 * mismas lecturas que `cargarClientes` (consola-service), pero solo de las
 * filas propias (RLS "Users manage own ..." en cada tabla), y la cuenta la
 * hace `adherenciaIntervenciones` de consola-core, la misma función.
 *
 * LA SEÑAL (`huboSenal`), decisión del 25-sep-2026: se usan las MISMAS diez
 * fuentes que la consola (prácticas, electrones, ARGOS, comida, agua,
 * suplementos tomados, mente, síntomas, laboratorios, cuestionario), no solo
 * prácticas y suplementos. La señal solo decide un caso: cero prácticas
 * palomeadas en la ventana. Ahí la consola dice "0%" si hubo cualquier otro
 * rastro y "sin dato" si no hubo ninguno. Con menos fuentes, un cliente que
 * registró comida pero no palomeó vería "todavía no registras" mientras
 * Enrique ve 0%: dos números distintos para la misma persona.
 * Para no gastar diez lecturas en cada visita, las fuentes extra se leen SOLO
 * cuando hacen falta (cero palomeadas y días que medir). Cuando hay al menos
 * una palomeada, la señal ya está probada por esa misma marca, igual que en
 * la consola (su fuente 'intervenciones' es la última marca de la ventana).
 *
 * REGLA 7: supabase-js no lanza en 4xx, devuelve `{data:null, error}`. Cualquier
 * error corta con `estado:'error'`, que la pantalla pinta "No se pudo leer" con
 * Reintentar. Nunca como cero ni como "no tienes".
 *
 * Las medidas del cuerpo también se leen aquí (`leerMisMedidas`) y no con
 * `getMeasurementHistory`: ese servicio traga el error y devuelve `[]`, y un
 * fallo de red se pintaría como "Aún no registras medidas". Misma tabla, con
 * el error a la vista. Cómo se lee: ver el docblock de `leerMisMedidas`.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import {
  VENTANA_ADHERENCIA_DIAS,
  adherenciaIntervenciones,
  restarDias,
  type CompletadoDia,
  type FuenteSenal,
  type IntervencionActiva,
} from '@/src/services/consola/consola-core';
import {
  huboSenalEnVentana,
  type FilaMedida,
  type LecturaConstancia,
} from '@/src/services/elite-dx/progreso-core';

/** Solo la fecha de un timestamp o date de Postgres. Igual que en consola-service. */
function soloFecha(v: unknown): string | null {
  return typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null;
}

/**
 * Las fuentes de señal de la consola, SIN la de prácticas (esa se resuelve con
 * las marcas ya leídas). Mismo nombre, tabla, columna de fecha y filtro que
 * `cargarClientes`. Si la consola agrega o quita una fuente, esta lista se
 * actualiza con ella (el test de paridad lo detecta si el número diverge).
 */
const FUENTES_EXTRA: readonly { fuente: string; tabla: string; campo: string; soloTomadas?: boolean }[] = [
  { fuente: 'electrones', tabla: 'electron_logs', campo: 'date' },
  { fuente: 'ARGOS', tabla: 'argos_daily_usage', campo: 'usage_date' },
  { fuente: 'comida', tabla: 'food_logs', campo: 'date' },
  { fuente: 'agua', tabla: 'hydration_logs', campo: 'created_at' },
  { fuente: 'suplementos', tabla: 'supplement_logs', campo: 'date', soloTomadas: true },
  { fuente: 'mente', tabla: 'mind_sessions', campo: 'date' },
  { fuente: 'sintomas', tabla: 'user_symptoms', campo: 'created_at' },
  { fuente: 'laboratorios', tabla: 'lab_uploads', campo: 'uploaded_at' },
  { fuente: 'cuestionario', tabla: 'user_master_quiz', campo: 'answered_at' },
];

/** La fecha máxima de una lista de filas en `campo`, o null. */
function maxFecha(filas: readonly Record<string, unknown>[], campo: string): string | null {
  let max: string | null = null;
  for (const f of filas) {
    const d = soloFecha(f[campo]);
    if (d && (!max || d > max)) max = d;
  }
  return max;
}

/**
 * La constancia del cliente que tiene la sesión, en los últimos
 * VENTANA_ADHERENCIA_DIAS días. Mismo número que la consola de Enrique.
 */
export async function leerMiConstancia(userId: string): Promise<LecturaConstancia> {
  if (!userId) return { estado: 'error' };
  try {
    // El mismo "hoy" que la consola: el día LOCAL del teléfono que mira.
    const hoy = getLocalToday();
    const desde = restarDias(hoy, VENTANA_ADHERENCIA_DIAS - 1);

    const [intervenciones, completados] = await Promise.all([
      supabase.from('user_interventions').select('id, activated_at')
        .eq('user_id', userId).eq('status', 'active'),
      supabase.from('intervention_completions').select('user_intervention_id, date')
        .eq('user_id', userId).eq('completed', true).gte('date', desde),
    ]);
    if (intervenciones.error || completados.error) {
      logWarn('[progreso] constancia no se pudo leer', intervenciones.error ?? completados.error);
      return { estado: 'error' };
    }

    const ivs: IntervencionActiva[] = ((intervenciones.data ?? []) as { id: string; activated_at: string | null }[])
      .map((i) => ({ id: i.id, activadaEl: soloFecha(i.activated_at) }));
    const comps: CompletadoDia[] = ((completados.data ?? []) as { user_intervention_id: string; date: string }[])
      .map((c) => ({ intervencionId: c.user_intervention_id, fecha: c.date }));

    // La fuente 'intervenciones' de la consola: la última marca en la ventana
    // (de CUALQUIER práctica, activa o no: la consola tampoco filtra ahí).
    const fuentes: FuenteSenal[] = [
      { fuente: 'intervenciones', fecha: maxFecha(comps.map((c) => ({ date: c.fecha })), 'date') },
    ];

    const primero = adherenciaIntervenciones(ivs, comps, hoy, huboSenalEnVentana(fuentes, hoy, desde));
    // Solo "sin-senal" depende de las otras fuentes. Todo lo demás ya es final.
    if (primero.estado === 'ok' || primero.motivo !== 'sin-senal') {
      return { estado: 'ok', adherencia: primero };
    }

    const extras = await Promise.all(FUENTES_EXTRA.map((f) => {
      let q = supabase.from(f.tabla).select(f.campo).eq('user_id', userId);
      if (f.soloTomadas) q = q.eq('taken', true);
      // Basta con una fila en la ventana: la consola compara la ÚLTIMA fecha
      // contra `desde`, y "existe una >= desde" es lo mismo.
      return q.gte(f.campo, desde).limit(1);
    }));
    const fallo = extras.find((r) => r.error);
    if (fallo?.error) {
      logWarn('[progreso] señal no se pudo leer', fallo.error);
      return { estado: 'error' };
    }
    FUENTES_EXTRA.forEach((f, i) => {
      const filas = (extras[i].data ?? []) as unknown as Record<string, unknown>[];
      fuentes.push({ fuente: f.fuente, fecha: maxFecha(filas, f.campo) });
    });

    return {
      estado: 'ok',
      adherencia: adherenciaIntervenciones(ivs, comps, hoy, huboSenalEnVentana(fuentes, hoy, desde)),
    };
  } catch (e) {
    logWarn('[progreso] constancia sin red', e);
    return { estado: 'error' };
  }
}

export type LecturaMedidas = { estado: 'ok'; filas: FilaMedida[] } | { estado: 'error' };

/** Las columnas de health_measurements que pinta PROGRESO (nombres reales). */
const COLUMNAS_CUERPO = ['weight_kg', 'waist_cm', 'body_fat_pct'] as const;
type ColumnaCuerpo = (typeof COLUMNAS_CUERPO)[number];

/**
 * Las medidas de cuerpo del cliente (health_measurements, la tabla de
 * `getMeasurementHistory`).
 *
 * 25-sep-2026 (revisión en frío): antes se leían las 30 filas más nuevas y las
 * 30 más viejas. Con pesadas diarias, una métrica escasa (la cintura del día
 * 40 de 100) caía en el hueco de en medio: el cambio salía contra otra fecha o
 * aparecía "Tu primer registro" cuando no lo era. Ahora cada métrica se lee
 * sola: su registro más viejo y su registro más nuevo CON valor (> 0, la misma
 * regla que `resumenCuerpo`: un 0 no es una medida). Seis consultas de una fila
 * cada una, en paralelo. Cualquier error corta con 'error'.
 *
 * Devuelve hasta seis filas, cada una con UNA métrica y las otras en null.
 * Dos filas pueden compartir fecha: `resumenCuerpo` trabaja por métrica, así
 * que no se deduplican (deduplicar por fecha pisaría una métrica con otra).
 */
export async function leerMisMedidas(userId: string): Promise<LecturaMedidas> {
  if (!userId) return { estado: 'error' };
  try {
    const consultas = COLUMNAS_CUERPO.flatMap((col) => [true, false].map((ascending) =>
      supabase.from('health_measurements').select(`date, ${col}`)
        .eq('user_id', userId).gt(col, 0)
        .order('date', { ascending }).limit(1)
        .then((r) => ({ col, r }))));
    const respuestas = await Promise.all(consultas);
    const fallo = respuestas.find(({ r }) => r.error);
    if (fallo?.r.error) {
      logWarn('[progreso] medidas no se pudieron leer', fallo.r.error);
      return { estado: 'error' };
    }
    const filas: FilaMedida[] = [];
    for (const { col, r } of respuestas) {
      const f = ((r.data ?? []) as unknown as Record<string, unknown>[])[0];
      if (!f || typeof f.date !== 'string') continue;
      const v = f[col];
      // PostgREST entrega numeric como número; si algún día llega como texto
      // ("82.4"), se convierte en vez de perder la medida.
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : Number.NaN;
      filas.push(filaDeUna(f.date, col, Number.isFinite(n) ? n : null));
    }
    return { estado: 'ok', filas };
  } catch (e) {
    logWarn('[progreso] medidas sin red', e);
    return { estado: 'error' };
  }
}

function filaDeUna(date: string, col: ColumnaCuerpo, v: number | null): FilaMedida {
  return {
    date,
    weight_kg: col === 'weight_kg' ? v : null,
    waist_cm: col === 'waist_cm' ? v : null,
    body_fat_pct: col === 'body_fat_pct' ? v : null,
  };
}
