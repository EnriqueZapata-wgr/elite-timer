/**
 * /reports/[dominio] (OLA1 R-0) — LA pantalla de cada reporte.
 *
 * Es una sola pantalla, no dos: se llega desde el hub /reports o desde el
 * contexto del pilar, y siempre con router.push. El back nativo devuelve al
 * origen sin que nadie tenga que pasarle de dónde vino.
 */
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { useAppTheme } from '@/src/contexts/theme-context';
import { getReportDomain } from '@/src/services/reports/report-domain-core';
import { ReportDomainShell } from '@/src/components/reports/ReportDomainShell';
import { getDomainDefinition } from '@/src/components/reports/domains';

export default function ReportDomainScreen() {
  const { dominio, period } = useLocalSearchParams<{ dominio?: string; period?: string }>();

  const meta = getReportDomain(dominio);
  const definition = getDomainDefinition(dominio);

  if (!meta || !definition) return <UnknownDomain />;

  return <ReportDomainShell definition={definition} seedPeriod={period} />;
}

/**
 * Una llave que no existe, o un dominio anunciado y todavía sin construir. No
 * se finge una pantalla vacía: se dice qué pasó y se ofrece la salida.
 */
function UnknownDomain() {
  const t = useAppTheme().tokens;
  return (
    <Screen themed>
      <PillarHeader pillar="metrics" title="Reportes" />
      <View style={s.box}>
        <Ionicons name="help-circle-outline" size={30} color={t.textoTenue} />
        <EliteText style={[s.title, { color: t.texto }]}>Ese reporte todavía no existe</EliteText>
        <EliteText style={[s.body, { color: t.textoSecundario }]}>
          El enlace apunta a un reporte que aún no está en tu versión de la app. Desde el hub de
          reportes ves todos los que sí.
        </EliteText>
        <AnimatedPressable
          onPress={() => { haptic.light(); router.push('/reports'); }}
          style={[s.cta, { borderColor: t.bordeMarcado }]}
        >
          <EliteText style={[s.ctaText, { color: t.texto }]}>Ir a mis reportes</EliteText>
        </AnimatedPressable>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  box: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  title: { fontSize: FontSizes.md, fontFamily: Fonts.bold, marginTop: Spacing.xs },
  body: { fontSize: FontSizes.sm, fontFamily: Fonts.regular, lineHeight: 19, textAlign: 'center' },
  cta: {
    marginTop: Spacing.md, paddingVertical: 10, paddingHorizontal: 22,
    borderRadius: 999, borderWidth: 1,
  },
  ctaText: { fontSize: FontSizes.sm, fontFamily: Fonts.semiBold },
});
