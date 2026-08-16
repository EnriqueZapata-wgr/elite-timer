/**
 * Lectura del dominio adherencia (OLA1 R-5): compliance del protocolo, la
 * racha del protocolo y las cuatro rachas del pilar Mente con sus medallas.
 *
 * SOBRE LAS RACHAS, que es lo que hay que leer antes de tocar esto:
 *
 * En el código NO hay tres cálculos de racha, hay DOS reglas y un servicio que
 * ya reusa una de ellas:
 *
 *  1. `computeJournalStreak` (journal-core): días seguidos con un registro,
 *     anclados a hoy o ayer, SIN gracia. mente-streaks-service la usa tal cual
 *     para las cuatro categorías de Mente, y el dominio journal para su racha
 *     de escritura. Un hueco corta.
 *  2. `computeStreak` / `computeLongestStreak` (adherence-service): días de
 *     CALENDARIO sobre daily_plans con compliance >= 75, con UN día de gracia
 *     (un fallo aislado no corta) y con "hoy en progreso" neutro.
 *
 * No miden lo mismo: una cuenta eventos, la otra cuenta un umbral cumplido. Un
 * streak-core con la gracia por parámetro las junta bien, pero esa fusión solo
 * vale si se demuestra que las dos reglas sobreviven idénticas, y eso se
 * demuestra corriendo las pruebas. En el entorno de este run vitest no arranca
 * (node_modules con binarios nativos de otra plataforma), así que la fusión NO
 * se hizo: aquí se consumen las dos fuentes como están. La decisión queda
 * anotada para el run que sí pueda correr la suite.
 */
import { supabase } from '@/src/lib/supabase';
import { getStreakRecord } from '@/src/services/adherence-service';
import { getComplianceReport, type ComplianceReport } from '@/src/services/reports-service';
import {
  fetchMenteStreaks, fetchMenteMedals, syncMenteMedals,
  type MenteStreaks, type MenteMedal,
} from '@/src/services/mente-streaks-service';
import type { ServicePeriod } from './report-domain-core';

export interface AdherenciaReportData {
  userId: string;
  compliance: ComplianceReport;
  /** null si daily_plans no se pudo leer: "sin datos" no es "racha 0". */
  record: { current: number; longest: number } | null;
  /** null si alguna fuente de Mente falló. Mismo criterio. */
  streaks: MenteStreaks | null;
  medals: MenteMedal[];
  /** Medallas recién otorgadas en esta entrada, para celebrarlas una vez. */
  justAwarded: string[];
}

export async function loadAdherenciaReport(period: ServicePeriod): Promise<AdherenciaReportData> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('sin sesión');

  const [compliance, record, streaks] = await Promise.all([
    getComplianceReport(period),
    getStreakRecord(userId),
    fetchMenteStreaks(userId),
  ]);

  let medals: MenteMedal[] = [];
  let justAwarded: string[] = [];
  // Sin rachas confiables NO se sincronizan medallas: otorgar una por un cero
  // de error de red sería regalar algo que no se ganó.
  if (streaks) {
    const existing = await fetchMenteMedals(userId);
    const fresh = await syncMenteMedals(userId, streaks, existing);
    medals = [
      ...existing,
      ...fresh.map((f) => ({ ...f, awarded_at: new Date().toISOString() })),
    ];
    justAwarded = fresh.map((f) => `${f.category}-${f.tier}`);
  }

  return { userId, compliance, record, streaks, medals, justAwarded };
}
