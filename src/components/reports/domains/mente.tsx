/**
 * Dominio mente (OLA1 R-0). getMindReport no trae serie diaria, solo totales
 * del rango: el export es una lista de métrica y valor, no una serie inventada.
 */
import { GradientCard } from '@/src/components/ui/GradientCard';
import { getMindReport, type MindReport } from '@/src/services/reports-service';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.mente;
const GRADIENT = { start: 'rgba(192,132,252,0.08)', end: 'rgba(192,132,252,0.02)' };

export function MenteContent({ data, variant }: { data: MindReport; variant: 'resumen' | 'completo' }) {
  return (
    <>
      {variant === 'resumen' && (
        <SectionHeader icon={META.icon} color={META.accent} title="MENTE" />
      )}
      <StatsRow>
        <Stat value={`${data.breathingSessions}`} label="respiraciones" />
        <Stat value={`${data.meditationSessions}`} label="meditaciones" />
        <Stat value={`${data.totalMinutes}`} label="min totales" />
        <Stat value={`${data.journalEntries}`} label="journal" />
        {variant === 'completo' && <Stat value={`${data.checkins}`} label="check-ins" />}
      </StatsRow>
    </>
  );
}

export const menteDomain: ReportDomainDefinition<MindReport> = {
  key: 'mente',
  load: (period) => getMindReport(period),
  isEmpty: (d) =>
    d.breathingSessions + d.meditationSessions + d.journalEntries + d.checkins + d.totalMinutes === 0,
  toRows: (d): ExportRow[] => [
    { metrica: 'respiraciones', valor: d.breathingSessions },
    { metrica: 'meditaciones', valor: d.meditationSessions },
    { metrica: 'minutos totales', valor: d.totalMinutes },
    { metrica: 'entradas de journal', valor: d.journalEntries },
    { metrica: 'check-ins', valor: d.checkins },
  ],
  render: (d) => (
    <GradientCard gradient={GRADIENT}>
      <MenteContent data={d} variant="completo" />
    </GradientCard>
  ),
};
