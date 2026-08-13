/**
 * Dominio ayuno (OLA1 R-0). Solo cuentan los ayunos cerrados: el servicio
 * filtra status = completed, y aquí no se disimula.
 */
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SimpleBarChart } from '@/src/components/charts/SimpleCharts';
import { getFastingReport, type FastingReport } from '@/src/services/reports-service';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.ayuno;
const GRADIENT = { start: 'rgba(251,191,36,0.10)', end: 'rgba(251,191,36,0.02)' };

/** Umbral del chart, el mismo que el hub ya pintaba. */
const HOURS_TARGET = 16;

export function AyunoContent({ data, variant }: { data: FastingReport; variant: 'resumen' | 'completo' }) {
  return (
    <>
      {variant === 'resumen' && (
        <SectionHeader icon={META.icon} color={META.accent} title="AYUNO" />
      )}
      <StatsRow>
        <Stat value={`${data.totalFasts}`} label="sesiones" />
        <Stat value={data.avgHours > 0 ? `${data.avgHours}h` : '—'} label="promedio" />
        <Stat value={data.longestFast > 0 ? `${data.longestFast}h` : '—'} label="más largo" />
        {variant === 'completo' && (
          <Stat value={`${data.fastsPerWeek}`} label="por semana" />
        )}
      </StatsRow>
      {variant === 'completo' && data.daily.some((p) => p.value > 0) && (
        <SimpleBarChart data={data.daily} color={META.accent} target={HOURS_TARGET} colorByTarget />
      )}
    </>
  );
}

export const ayunoDomain: ReportDomainDefinition<FastingReport> = {
  key: 'ayuno',
  load: (period) => getFastingReport(period),
  isEmpty: (d) => d.totalFasts === 0,
  // Los días en cero se quedan: son los días que no ayunaste, y eso también
  // es el dato. Es exactamente lo que muestra la gráfica de arriba.
  toRows: (d): ExportRow[] => d.daily.map((p) => ({ fecha: p.date, horas: p.value })),
  render: (d) => (
    <GradientCard gradient={GRADIENT}>
      <AyunoContent data={d} variant="completo" />
    </GradientCard>
  ),
};
