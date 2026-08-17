/**
 * Dominio economía (OLA1 R-0). La serie de electrones que ya pintaba el hub,
 * más los movimientos que hoy viven en /economy/history, recortados al rango
 * visible.
 *
 * PREMIUM (16-ago-2026): cada renglón traía su unidad (E- o H+) porque la lista
 * mezclaba dos monedas. Sin protones sobra la marca: aquí todo es electrón.
 */
import { View, StyleSheet } from 'react-native';
import { useMemo } from 'react';

import { EliteText } from '@/components/elite-text';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SimpleBarChart } from '@/src/components/charts/SimpleCharts';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { formatFull } from '@/src/services/economy/format';
import {
  getEconomiaReport, type EconomiaReport,
} from '@/src/services/reports/economia-report-service';
import { REPORT_DOMAINS, type ExportRow } from '@/src/services/reports/report-domain-core';
import { SectionHeader, Stat, StatsRow } from '../ReportStats';
import type { ReportDomainDefinition } from '../ReportDomainShell';

const META = REPORT_DOMAINS.economia;
const GRADIENT = { start: 'rgba(168,224,42,0.10)', end: 'rgba(168,224,42,0.02)' };

/** Cuántos movimientos se listan en pantalla. El export los lleva todos. */
const VISIBLE_MOVEMENTS = 20;

export function EconomiaContent({ data, variant }: { data: EconomiaReport; variant: 'resumen' | 'completo' }) {
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  const { electrons, movements } = data;

  return (
    <>
      {variant === 'resumen' && (
        <SectionHeader icon={META.icon} color={META.accent} title="ELECTRONES" />
      )}
      <StatsRow>
        <Stat value={`${electrons.avgPerDay} ⚡`} label="promedio/día" />
        <Stat value={`${electrons.total} ⚡`} label="total" />
        <Stat value={`${electrons.bestDay} ⚡`} label="mejor día" />
      </StatsRow>

      {variant === 'completo' && electrons.daily.length > 0 && (
        <SimpleBarChart data={electrons.daily} color={META.accent} />
      )}

      {variant === 'completo' && movements.length > 0 && (
        <View style={s.movesBox}>
          <EliteText style={s.movesTitle}>MOVIMIENTOS</EliteText>
          {movements.slice(0, VISIBLE_MOVEMENTS).map((m) => (
            <View key={m.id} style={s.moveRow}>
              <View style={s.moveMain}>
                <EliteText style={s.moveConcept} numberOfLines={1}>{m.concepto}</EliteText>
                <EliteText style={s.moveMeta}>{m.fecha} · E-</EliteText>
              </View>
              <EliteText
                style={[s.moveAmount, { color: m.monto >= 0 ? ATP_BRAND.lime : t.error }]}
              >
                {formatFull(m.monto)}
              </EliteText>
            </View>
          ))}
          {movements.length > VISIBLE_MOVEMENTS && (
            <EliteText style={s.moveHint}>
              Se muestran {VISIBLE_MOVEMENTS} de {movements.length}. El export se los lleva todos.
            </EliteText>
          )}
        </View>
      )}
    </>
  );
}

export const economiaDomain: ReportDomainDefinition<EconomiaReport> = {
  key: 'economia',
  load: (period, range) => getEconomiaReport(period, range),
  isEmpty: (d) => d.electrons.total === 0 && d.movements.length === 0,
  toRows: (d): ExportRow[] => d.movements.map((m) => ({
    fecha: m.fecha, concepto: m.concepto, electrones: m.monto,
  })),
  render: (d) => (
    <GradientCard gradient={GRADIENT}>
      <EconomiaContent data={d} variant="completo" />
    </GradientCard>
  ),
};

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  movesBox: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: t.borde, paddingTop: Spacing.sm },
  movesTitle: { fontSize: FontSizes.sm, fontFamily: Fonts.bold, color: t.texto, letterSpacing: 1, marginBottom: Spacing.xs },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 7 },
  moveMain: { flex: 1 },
  moveConcept: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold, color: t.texto },
  moveMeta: { fontSize: 10, fontFamily: Fonts.regular, color: t.textoSecundario, marginTop: 1 },
  moveAmount: { fontSize: FontSizes.sm, fontFamily: Fonts.bold },
  moveHint: { fontSize: 10, fontFamily: Fonts.regular, color: t.textoSecundario, marginTop: Spacing.xs },
});
