/**
 * Reporte para tu consulta — capa con efectos (MB-29 Pieza 1 · H3).
 *
 * Junta lo registrado en el rango, arma el HTML con el núcleo puro y lo
 * comparte como PDF con el MISMO patrón de dx-pdf-service: buildHtml (puro)
 * → expo-print → rename amable → expo-sharing.
 *
 * ⚠️ expo-print es módulo NATIVO: en binarios viejos vía OTA no existe y
 * requireNativeModule revienta AL IMPORTAR → los requires van lazy, dentro
 * del try/catch, nunca a nivel de módulo (lección del crash 'ExpoPrint').
 *
 * ⚠️ Documento médico = FAIL-CLOSED: si CUALQUIER lectura falla, no se
 * genera. Un reporte al que le falta la mitad de la glucosa sin decirlo es
 * peor que ninguno (mentiría por omisión frente a un médico).
 *
 * ⚠️ Ciclo: pasa por getCycleInfo, que ya gatea por sexo Y modo propio
 * (acompañante = null). Sin modo propio, el input lleva cycle: null y el
 * documento no dice una palabra de ciclo.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday, toLocalDateString, parseLocalDate } from '@/src/utils/date-helpers';
import { getCycleInfo } from '@/src/services/cycle-service';
import { resolveRows, type UserInterventionRow } from '@/src/services/interventions/intervention-service-core';
import {
  buildConsultaHtml,
  type ConsultaCiclo,
  type ConsultaGlucoseRow,
  type ConsultaInput,
  type ConsultaIntervencion,
  type ConsultaKetoneRow,
  type ConsultaLabPoint,
  type ConsultaMeasurementRow,
  type ConsultaPadecimiento,
  type ConsultaSymptom,
} from './consulta-report-core';

export type ConsultaShareResult = 'shared' | 'unavailable' | 'error';

/** Rangos que ofrece la pantalla. */
export const CONSULTA_RANGES = [30, 90, 180] as const;
export type ConsultaRangeDays = (typeof CONSULTA_RANGES)[number];

function fromDateFor(rangeDays: number, today: string): string {
  const d = parseLocalDate(today);
  d.setDate(d.getDate() - (rangeDays - 1));
  return toLocalDateString(d);
}

/**
 * Reúne los datos del rango. null = alguna lectura FALLÓ (clase {error}):
 * el caller no genera nada.
 */
export async function gatherConsultaInput(
  userId: string,
  firstName: string,
  rangeDays: number,
): Promise<ConsultaInput | null> {
  const toDate = getLocalToday();
  const fromDate = fromDateFor(rangeDays, toDate);

  const [glucoseRes, ketonesRes, measRes, labsRes, sympRes, padRes, epRes, intRes] = await Promise.all([
    supabase
      .from('glucose_logs')
      .select('date, value_mg_dl, context')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true }),
    supabase
      .from('ketones_logs')
      .select('date, source, value_mmol, value_ppm, urine_level')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true }),
    supabase
      .from('health_measurements')
      .select('date, weight_kg, waist_cm, body_fat_pct, systolic_bp, diastolic_bp, resting_hr')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true }),
    // Labs SIN filtro de rango a propósito: el médico necesita el último
    // valor aunque el estudio sea de hace cuatro meses. La fecha impresa
    // junto a cada valor deja el "cuándo" a la vista.
    supabase
      .from('lab_values')
      .select('parameter_key, value, measured_at')
      .eq('user_id', userId)
      .eq('is_voided', false)
      .order('measured_at', { ascending: true }),
    supabase
      .from('user_symptoms')
      .select('name, severity, started_at, resolved_at, is_active')
      .eq('user_id', userId),
    supabase.from('padecimientos').select('id, name, is_chronic').eq('user_id', userId),
    supabase
      .from('padecimiento_episodios')
      .select('padecimiento_id, started_on, resolved_on')
      .eq('user_id', userId)
      .order('started_on', { ascending: false }),
    supabase
      .from('user_interventions')
      .select('id, user_id, intervention_key, status, priority, source_dx_id, is_custom, is_universal, custom_definition, custom_time, computed_time, custom_notes, custom_dose, activated_at')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  const conError = [glucoseRes, ketonesRes, measRes, labsRes, sympRes, padRes, epRes, intRes].find((r) => r.error);
  if (conError) {
    logWarn('[consulta] lectura falló, no se genera el reporte', conError.error);
    return null;
  }

  // Compleciones del rango, solo si hay intervenciones activas.
  const intervRows = (intRes.data ?? []) as unknown as UserInterventionRow[];
  let completionsByIntervention = new Map<string, number>();
  if (intervRows.length > 0) {
    const { data: compData, error: compErr } = await supabase
      .from('intervention_completions')
      .select('user_intervention_id, date')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('date', fromDate)
      .lte('date', toDate);
    if (compErr) {
      logWarn('[consulta] lectura de compleciones falló', compErr);
      return null;
    }
    completionsByIntervention = new Map();
    for (const row of (compData ?? []) as { user_intervention_id: string; date: string }[]) {
      completionsByIntervention.set(
        row.user_intervention_id,
        (completionsByIntervention.get(row.user_intervention_id) ?? 0) + 1,
      );
    }
  }

  const intervenciones: ConsultaIntervencion[] = resolveRows(intervRows).map((r) => ({
    name: r.def.name,
    completedDays: completionsByIntervention.get(r.row.id) ?? 0,
    activatedAt: r.row.activated_at,
  }));

  // Padecimientos + su episodio más reciente.
  const episodios = (epRes.data ?? []) as { padecimiento_id: string; started_on: string; resolved_on: string | null }[];
  const padecimientos: ConsultaPadecimiento[] = ((padRes.data ?? []) as { id: string; name: string; is_chronic: boolean }[]).map(
    (p) => {
      const propios = episodios.filter((e) => e.padecimiento_id === p.id);
      return {
        name: p.name,
        is_chronic: p.is_chronic,
        isActive: propios.some((e) => e.resolved_on == null),
        lastStartedOn: propios[0]?.started_on ?? null,
      };
    },
  );

  // Ciclo: getCycleInfo devuelve null sin 'female' o sin modo propio —
  // ese null ES el gate. No se consulta nada de ciclo por fuera de él.
  let cycle: ConsultaCiclo | null = null;
  try {
    const info = await getCycleInfo(userId);
    if (info) {
      const periodsInRange = (info.periods as { start_date: string; end_date: string | null }[])
        .filter((p) => p.start_date <= toDate && (p.end_date == null || p.end_date >= fromDate))
        .map((p) => ({ start: p.start_date, end: p.end_date }));
      cycle = {
        phaseLabel: info.phaseInfo.label,
        currentDay: info.currentDay,
        cycleLen: info.cycleLen,
        periods: periodsInRange,
      };
    }
  } catch (e) {
    // Sin ciclo el reporte sigue siendo válido: la sección simplemente no va.
    logWarn('[consulta] ciclo no disponible', e);
  }

  return {
    firstName,
    fromDate,
    toDate,
    rangeDays,
    glucose: (glucoseRes.data ?? []) as ConsultaGlucoseRow[],
    ketones: (ketonesRes.data ?? []) as ConsultaKetoneRow[],
    measurements: (measRes.data ?? []) as ConsultaMeasurementRow[],
    labs: ((labsRes.data ?? []) as ConsultaLabPoint[]).filter((l) => l.measured_at != null),
    // El recorte al rango lo hace el core (sintomasEnRango): una sola lógica.
    symptoms: (sympRes.data ?? []) as ConsultaSymptom[],
    padecimientos,
    intervenciones,
    cycle,
  };
}

/**
 * Genera el PDF del rango y abre el share sheet. Fail-soft en lo nativo:
 * binario viejo sin expo-print → 'unavailable' y la pantalla lo dice con
 * honestidad (el binario nuevo llega en MB-30). Fail-closed en los datos:
 * cualquier lectura fallida → 'error', nunca un documento a medias.
 */
export async function generateAndShareConsultaReport(
  userId: string,
  firstName: string,
  rangeDays: number,
): Promise<ConsultaShareResult> {
  try {
    const input = await gatherConsultaInput(userId, firstName, rangeDays);
    if (!input) return 'error';

    const Print = require('expo-print') as typeof import('expo-print');
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');

    const html = buildConsultaHtml(input);
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    // Nombre amable que verá el doctor en WhatsApp.
    let shareUri = uri;
    try {
      const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
      const pretty = new File(Paths.cache, `Registros-ATP-${input.fromDate}-a-${input.toDate}.pdf`);
      if (pretty.exists) pretty.delete();
      new File(uri).move(pretty);
      shareUri = pretty.uri;
    } catch {
      /* el rename es cosmético — compartir el original si falla */
    }

    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir mis registros',
      UTI: 'com.adobe.pdf',
    });
    return 'shared';
  } catch (e) {
    logWarn('[consulta] generateAndShareConsultaReport failed', e);
    return 'error';
  }
}
