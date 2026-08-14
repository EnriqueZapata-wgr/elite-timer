/**
 * OLA 4 · Resumen del Cuestionario Maestro (Anexo C, pieza 3b).
 *
 * Movido de app/salud/cuestionario-maestro: sistemas prioritarios, causas raíz
 * y las que el motor prescribe para ESE perfil. El motor de personalización
 * queda intocado; aquí solo se lee su salida, y si truena se muestra el resto
 * del resumen en vez de tumbar la pantalla.
 */
import { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import {
  scoreToPhenotype, quizPhenotypeToMotorPhenotype,
  type QuizAnswers, type QuizContext,
} from '@/src/services/salud/master-quiz-core';
import { personalizeInterventions } from '@/src/services/interventions/personalize-interventions';
import { ROOT_LABELS } from '@/src/constants/intervention-vocab';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

const SYSTEM_LABELS: Record<string, string> = {
  energia: 'Energía', sueno: 'Sueño', circadiano: 'Circadiano', digestion: 'Digestión',
  inflamacion: 'Inflamación', estres: 'Estrés', metabolismo: 'Metabólico',
  hormonal: 'Hormonal', cognitivo: 'Cognitivo',
};

interface Props {
  answers: QuizAnswers;
  ctx: QuizContext;
  userId: string;
  onGoProtocol: () => void;
}

export function PhenotypeSummary({ answers, ctx, userId, onGoProtocol }: Props) {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);

  const quiz = useMemo(() => scoreToPhenotype(answers), [answers]);
  const top5 = useMemo(() => {
    try {
      return personalizeInterventions(quizPhenotypeToMotorPhenotype(quiz, userId, ctx.gender, ctx.age));
    } catch { return []; }
  }, [quiz, userId, ctx]);

  const worst = [...quiz.dxLevels].sort((a, b) => a.level - b.level).slice(0, 3);
  const levelColor = (lvl: number) => (lvl <= 2 ? t.error : lvl <= 3 ? '#fbbf24' : ATP_BRAND.lime);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <Animated.View entering={FadeInUp.springify()}>
        <EliteText style={s.kicker}>🧬 TU FENOTIPO EPIGENÉTICO · ATP</EliteText>

        {worst.length > 0 && (
          <>
            <EliteText style={s.section}>Sistemas prioritarios a trabajar</EliteText>
            {worst.map((sys) => (
              <View key={sys.system} style={s.sysRow}>
                <View style={[s.sysDot, { backgroundColor: levelColor(sys.level) }]} />
                <EliteText style={s.sysName}>{SYSTEM_LABELS[sys.system] ?? sys.system}</EliteText>
                {/* El punto ya trae el color del nivel; en claro la letra va en texto. */}
                <EliteText style={[s.sysLevel, { color: t.kind === 'dark' ? levelColor(sys.level) : t.texto }]}>
                  Nivel {sys.level}/5
                </EliteText>
              </View>
            ))}
          </>
        )}

        {quiz.activatedRoots.length > 0 && (
          <>
            <EliteText style={s.section}>Causas raíz identificadas</EliteText>
            {quiz.activatedRoots.slice(0, 6).map((r) => (
              <EliteText key={r} style={s.rootLine}>
                • {ROOT_LABELS[r as keyof typeof ROOT_LABELS] ?? r}
              </EliteText>
            ))}
          </>
        )}

        {top5.length > 0 && (
          <View style={s.rxBox}>
            <EliteText style={s.rxTitle}>ATP te sugiere estas {top5.length} para TU perfil</EliteText>
            {top5.map((r) => (
              <View key={r.intervention.key} style={s.rxRow}>
                <EliteText style={s.rxRank}>{r.rank}</EliteText>
                <EliteText style={s.rxName} numberOfLines={1}>{r.intervention.name}</EliteText>
              </View>
            ))}
          </View>
        )}

        <AnimatedPressable onPress={onGoProtocol} style={s.cta}>
          <EliteText style={s.ctaText}>Ver Mi Protocolo</EliteText>
          <Ionicons name="arrow-forward" size={18} color={t.textoSobreLima} />
        </AnimatedPressable>

        <View style={{ height: Spacing.xxl }} />
      </Animated.View>
    </ScrollView>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  kicker: {
    fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1, marginBottom: Spacing.md,
    color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto,
  },
  section: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2, color: t.textoTenue, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sysRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.card,
    borderWidth: 0.5, borderColor: t.borde, borderRadius: Radius.md, padding: Spacing.md, marginBottom: 6,
  },
  sysDot: { width: 10, height: 10, borderRadius: 5 },
  sysName: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: t.texto },
  sysLevel: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  rootLine: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: t.textoSecundario, lineHeight: 22 },
  rxBox: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.06), borderWidth: 0.5,
    borderColor: withOpacity(ATP_BRAND.lime, 0.3), borderRadius: Radius.lg,
    padding: Spacing.md, marginTop: Spacing.lg, gap: 8,
  },
  rxTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: t.texto, marginBottom: 4 },
  rxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rxRank: { fontFamily: Fonts.extraBold, fontSize: FontSizes.md, width: 20, color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto },
  rxName: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: t.texto },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 14, marginTop: Spacing.xl,
  },
  ctaText: { fontFamily: Fonts.extraBold, fontSize: FontSizes.md, color: t.textoSobreLima, letterSpacing: 0.5 },
});
