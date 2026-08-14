/**
 * OLA 4 · Resultado de los cuestionarios funcionales (Anexo C, pieza 3b).
 *
 * Es el resultado que hoy vive dentro de app/functional-quiz.tsx, movido tal
 * cual en estructura y copy: qué observamos, detalle por dominio colapsable y
 * descargo legible. Lo único que cambia son los colores de chasis, que pasan de
 * hex fijo a tokens del tema para que la pantalla exista también en claro; los
 * acentos con significado (dominio, alerta, calma) se respetan.
 */
import { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import type { FunctionalQuiz, ResultInsight } from '@/src/constants/functional-quizzes';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface Props {
  quiz: FunctionalQuiz;
  domainScores: Record<string, number>;
  activeInsights: ResultInsight[];
  onFinish: () => void;
  onRetake: () => void;
}

export function FunctionalResult({ quiz, domainScores, activeInsights, onFinish, onRetake }: Props) {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const [showDetail, setShowDetail] = useState(false);

  const hasAlerts = activeInsights.length > 0;
  const domainColor = (id: string) => quiz.domains.find((d) => d.id === id)?.color ?? quiz.color;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <Animated.View entering={FadeInUp.springify()}>
        <EliteText style={[s.kicker, { color: quiz.color }]}>RESULTADOS</EliteText>
        <EliteText style={s.title}>{quiz.name}</EliteText>

        <View style={[
          s.verdict,
          {
            backgroundColor: withOpacity(hasAlerts ? t.error : ATP_BRAND.lime, 0.08),
            borderColor: withOpacity(hasAlerts ? t.error : ATP_BRAND.lime, 0.25),
          },
        ]}>
          <Ionicons
            name={hasAlerts ? 'warning-outline' : 'checkmark-circle-outline'}
            size={48}
            color={hasAlerts ? t.error : ATP_BRAND.lime}
          />
          <EliteText style={[s.verdictTitle, { color: hasAlerts ? t.error : ATP_BRAND.lime }]}>
            {hasAlerts
              ? `${activeInsights.length} área${activeInsights.length > 1 ? 's' : ''} de atención`
              : 'Todo en orden'}
          </EliteText>
          <EliteText variant="caption" style={s.verdictSub}>
            {hasAlerts
              ? 'ARGOS observó patrones que vale la pena atender'
              : 'No se observaron alertas significativas en esta evaluación'}
          </EliteText>
        </View>

        {/* B-3 (MB-12): observar es de cuestionario; detectar, de aparato. */}
        {hasAlerts && (
          <View style={{ marginTop: Spacing.lg }}>
            <EliteText style={s.sectionLabel}>QUÉ OBSERVAMOS</EliteText>
            {activeInsights.map((insight, i) => (
              <View key={`${insight.domain}-${i}`} style={[s.insight, { borderLeftColor: domainColor(insight.domain) }]}>
                <EliteText style={s.insightTitle}>{insight.title}</EliteText>
                <EliteText variant="caption" style={s.insightBody}>{insight.description}</EliteText>
                <View style={s.reco}>
                  <EliteText style={s.recoLabel}>QUÉ SUELE ACOMPAÑAR ESTE PATRÓN</EliteText>
                  <EliteText variant="caption" style={s.recoBody}>{insight.recommendation}</EliteText>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable onPress={() => setShowDetail((v) => !v)} style={s.detailToggle}>
          <EliteText style={s.sectionLabel}>DETALLE POR DOMINIO</EliteText>
          <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={16} color={t.textoTenue} />
        </Pressable>

        {showDetail && quiz.domains.map((domain) => {
          const score = domainScores[domain.id] ?? 0;
          const max = quiz.questions.filter((q) => q.domain === domain.id).reduce((acc, q) => acc + q.weight, 0);
          const pct = max > 0 ? (score / max) * 100 : 0;
          const alert = pct > 40;
          return (
            <View key={domain.id} style={{ marginBottom: Spacing.sm }}>
              <View style={s.domainRow}>
                <View style={s.domainName}>
                  <View style={[s.dot, { backgroundColor: domain.color }]} />
                  <EliteText variant="caption" style={s.domainLabel}>{domain.name}</EliteText>
                </View>
                <View style={s.domainRight}>
                  <EliteText variant="caption" style={s.domainScore}>{score}/{max}</EliteText>
                  <EliteText variant="caption" style={{ color: alert ? t.error : ATP_BRAND.lime }}>
                    {alert ? 'Atención' : 'OK'}
                  </EliteText>
                </View>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${Math.min(pct, 100)}%`, backgroundColor: alert ? t.error : ATP_BRAND.lime }]} />
              </View>
            </View>
          );
        })}

        {/* B-5 (MB-12): el descargo se lee, no es letra chica. */}
        <EliteText variant="caption" style={s.disclaimer}>
          Esta evaluación es educativa y no sustituye el diagnóstico médico profesional.
          Consulta a un profesional de salud antes de iniciar suplementación.
        </EliteText>

        <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
          <AnimatedPressable onPress={onFinish} style={s.primary}>
            <EliteText style={s.primaryText}>VOLVER A TESTS</EliteText>
          </AnimatedPressable>
          <AnimatedPressable onPress={onRetake} style={s.quiet}>
            <EliteText variant="caption" style={s.quietText}>Repetir evaluación</EliteText>
          </AnimatedPressable>
        </View>
        <View style={{ height: Spacing.xxl }} />
      </Animated.View>
    </ScrollView>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  kicker: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2, textAlign: 'center' },
  title: { fontFamily: Fonts.extraBold, fontSize: 26, color: t.texto, textAlign: 'center', marginTop: 6 },
  verdict: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.lg, gap: 6 },
  verdictTitle: { fontFamily: Fonts.extraBold, fontSize: 22, marginTop: 6 },
  verdictSub: { color: t.textoSecundario, fontSize: FontSizes.sm, textAlign: 'center' },
  sectionLabel: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 2, color: t.textoTenue },
  insight: {
    backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.md,
    marginTop: Spacing.sm, borderLeftWidth: 3, borderWidth: 1, borderColor: t.borde,
  },
  insightTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: t.texto, marginBottom: 4 },
  insightBody: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 20 },
  reco: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.06), borderRadius: Radius.md, padding: Spacing.sm, marginTop: Spacing.sm },
  recoLabel: {
    fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 1, marginBottom: 4,
    color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto,
  },
  recoBody: { color: t.textoSecundario, fontSize: FontSizes.xs, lineHeight: 18 },
  detailToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  domainRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  domainName: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  domainRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  domainLabel: { color: t.texto, fontSize: FontSizes.sm },
  domainScore: { color: t.textoTenue, fontSize: FontSizes.xs },
  track: { height: 6, borderRadius: 3, backgroundColor: t.flotante, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  disclaimer: { color: t.textoSecundario, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },
  primary: { backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  primaryText: { fontFamily: Fonts.extraBold, fontSize: FontSizes.md, color: t.textoSobreLima, letterSpacing: 0.5 },
  quiet: { backgroundColor: t.card, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: t.borde },
  quietText: { color: t.textoSecundario, fontSize: FontSizes.sm },
});
