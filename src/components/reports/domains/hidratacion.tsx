/**
 * Dominio hidratación (OLA1 R-0). Barra a color = meta cumplida, gris = no
 * llegó, igual que en el hub.
 */
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SimpleBarChart } from '@/src/components/charts/SimpleCharts';
import { getHydrationReport, type HydrationReport } from '@/src/services/reports-service';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.hidratacion;
const GRADIENT = { start: 'rgba(96,165,250,0.10)', end: 'rgba(96,165,250,0.02)' };

/** Meta diaria del chart, la misma que el hub ya pintaba. */
const ML_TARGET = 2500;

export function HidratacionContent({ data, variant }: { data: HydrationReport; variant: 'resumen' | 'completo' }) {
  const promedio = data.avgMl > 0 ? `${(data.avgMl / 1000).toFixed(1)}L/día` : '—';
  const diasMeta = data.daily.filter((p) => p.value >= ML_TARGET).length;
  return (
    <>
      {variant === 'resumen' && (
        <SectionHeader icon={META.icon} color={META.accent} title="HIDRATACIÓN" />
      )}
      <StatsRow>
        <Stat value={promedio} label="promedio" />
        {variant === 'completo' && <Stat value={`${diasMeta}`} label="días en meta" />}
      </StatsRow>
      {variant === 'completo' && data.daily.length > 0 && (
        <SimpleBarChart data={data.daily} color={META.accent} target={ML_TARGET} colorByTarget />
      )}
    </>
  );
}

export const hidratacionDomain: ReportDomainDefinition<HydrationReport> = {
  key: 'hidratacion',
  load: (period) => getHydrationReport(period),
  isEmpty: (d) => d.avgMl === 0 && d.daily.every((p) => p.value === 0),
  toRows: (d): ExportRow[] => d.daily.map((p) => ({ fecha: p.date, ml: p.value })),
  render: (d) => (
    <GradientCard gradient={GRADIENT}>
      <HidratacionContent data={d} variant="completo" />
    </GradientCard>
  ),
};
