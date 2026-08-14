/**
 * Dominio nutrición (OLA1 R-0). Lee el mismo getNutritionReport que ya leía el
 * hub: en resumen es la tarjeta del hub, completo es la pantalla del dominio.
 */
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SimpleBarChart } from '@/src/components/charts/SimpleCharts';
import { PILLAR_GRADIENTS } from '@/src/constants/brand';
import { getNutritionReport, type NutritionReport } from '@/src/services/reports-service';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.nutricion;

/** Meta de calorías del chart, la misma que el hub ya pintaba. */
const KCAL_TARGET = 2000;

export function NutricionContent({ data, variant }: { data: NutritionReport; variant: 'resumen' | 'completo' }) {
  return (
    <>
      {variant === 'resumen' && (
        <SectionHeader icon={META.icon} color={META.accent} title="NUTRICIÓN" />
      )}
      <StatsRow>
        <Stat value={`${data.avgCalories}`} label="kcal/día" />
        <Stat value={`${data.avgProtein}g`} label="proteína" />
        {variant === 'completo' && data.avgScore > 0 && (
          <Stat value={`${data.avgScore}`} label="score" />
        )}
      </StatsRow>
      {variant === 'completo' && data.daily.length > 0 && (
        <SimpleBarChart data={data.daily} color={META.accent} target={KCAL_TARGET} />
      )}
    </>
  );
}

export const nutricionDomain: ReportDomainDefinition<NutritionReport> = {
  key: 'nutricion',
  load: (period) => getNutritionReport(period),
  isEmpty: (d) => d.avgCalories === 0 && d.daily.every((p) => p.value === 0),
  toRows: (d): ExportRow[] => d.daily.map((p) => ({ fecha: p.date, kcal: p.value })),
  render: (d) => (
    <GradientCard gradient={PILLAR_GRADIENTS.nutrition}>
      <NutricionContent data={d} variant="completo" />
    </GradientCard>
  ),
};
