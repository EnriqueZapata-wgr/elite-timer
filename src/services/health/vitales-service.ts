/**
 * Vitales service (wearables, bloque A, 13-oct-2026): la lectura de los DÍAS
 * de health_os_daily (HRV, FC en reposo, respiración, temperatura, SpO2,
 * score de recuperación) con su procedencia. La lógica vive en
 * vitales-core.ts (puro y con test); aquí solo va la consulta.
 *
 * TRES RESPUESTAS, NUNCA CONFUNDIDAS
 *  · { ok: true, disponible: false }: la base todavía no tiene la 344 (las
 *    columnas no existen). No es "no hay datos" ni un fallo: es que esta
 *    lectura aún no aplica.
 *  · { ok: false, motivo }: no se pudo leer (o no hay sesión). Nunca se
 *    presenta como "no hay datos".
 *  · { ok: true, disponible: true, metricas }: lo que hay; `metricas` vacío
 *    sí es "no hay datos".
 *
 * "La base aún no tiene la 344" se detecta con el detector único
 * (esColumna344Faltante) y se comparte con los demás lectores
 * (base-344-estado): si ya se sabe, no se pide nada. La ventana tiene piso de
 * fecha (los últimos `dias` días) además del límite de filas, para que un
 * día de hace meses no se cuele como "el último valor".
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, parseLocalDate, toLocalDateString } from '@/src/utils/date-helpers';
import { fechaDesde } from '@/src/services/sleep/sueno-unificado-core';
import { esColumna344Faltante } from './procedencia-core';
import { base344ConocidaAusente, marcarBase344Ausente } from './base-344-estado';
import {
  resumirVitales,
  SELECT_VITALES,
  type FilaVitales,
  type MetricaVital,
} from './vitales-core';

export type { MetricaVital } from './vitales-core';

export type ResultadoVitales =
  | { ok: true; disponible: false }
  | { ok: true; disponible: true; metricas: MetricaVital[]; filasLeidas: number }
  | { ok: false; motivo: 'sin_usuario' | 'lectura' };

/** Días que se leen por defecto: alcanza para una tendencia de 4 o más puntos. */
const DIAS_POR_DEFECTO = 14;

/** El aviso de "base sin 344" se registra una sola vez por sesión de la app. */
let avisadoSin344 = false;

/**
 * Las últimas `dias` filas de health_os_daily del usuario, resumidas por
 * métrica (último valor, procedencia y tendencia en el tramo de la misma
 * fuente).
 */
export async function leerVitales(userId: string, dias = DIAS_POR_DEFECTO): Promise<ResultadoVitales> {
  if (!userId) return { ok: false, motivo: 'sin_usuario' };
  // Ya se sabe que la base no tiene la 344: no se gasta una petición fallida.
  if (base344ConocidaAusente()) return { ok: true, disponible: false };
  try {
    const n = Math.max(1, Math.floor(dias));
    const desde = fechaDesde(parseLocalDate(getLocalToday()), n, toLocalDateString);
    const res = await supabase
      .from('health_os_daily')
      .select(SELECT_VITALES)
      .eq('user_id', userId)
      .gte('date', desde)
      .order('date', { ascending: false })
      .limit(n);
    if (res.error) {
      if (esColumna344Faltante(res.error)) {
        marcarBase344Ausente();
        if (!avisadoSin344) {
          avisadoSin344 = true;
          logWarn('[vitales] la base aún no tiene la 344; los vitales quedan como no disponibles');
        }
        return { ok: true, disponible: false };
      }
      logWarn('[vitales] lectura fallida (health_os_daily)', (res.error as { message?: string }).message);
      return { ok: false, motivo: 'lectura' };
    }
    const filas = (res.data ?? []) as unknown as FilaVitales[];
    return { ok: true, disponible: true, metricas: resumirVitales(filas), filasLeidas: filas.length };
  } catch (e) {
    logWarn('[vitales] lectura fallida', e);
    return { ok: false, motivo: 'lectura' };
  }
}
