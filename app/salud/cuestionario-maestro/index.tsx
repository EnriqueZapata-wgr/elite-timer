/**
 * CUESTIONARIO MAESTRO ATP (Mega-Sprint D · D6+D7).
 *
 * Levanta el fenotipo epigenético del user que alimenta el motor de personalización.
 * UX guiada no prisionera: una pregunta a la vez, barra de progreso dinámica, atrás,
 * "prefiero no responder", saltar, guardar-y-salir (auto-save), preview por sección,
 * y resumen final "TU FENOTIPO" + las 5 que el motor prescribe (motor INTOCADO).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { BackButton } from '@/src/components/ui/BackButton';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { QuestionInput } from '@/src/components/master-quiz/QuestionInput';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import {
  nextQuestion, computeProgress, isComplete, scoreToPhenotype,
  quizPhenotypeToMotorPhenotype, type QuizContext, type QuizAnswers,
} from '@/src/services/salud/master-quiz-core';
import { loadMasterQuiz, saveAnswer, skipQuestion } from '@/src/services/salud/master-quiz-service';
import { MASTER_QUIZ_SECTIONS, type MasterQuizQuestion } from '@/src/constants/master-quiz-bank';
import { personalizeInterventions } from '@/src/services/interventions/personalize-interventions';
import { ROOT_LABELS } from '@/src/constants/intervention-vocab';
import { Spacing, Fonts, FontSizes, Radius } from '@/constants/theme';
import { ELEVATION, TEXT, ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';

const SYSTEM_LABELS: Record<string, string> = {
  energia: 'Energía', sueno: 'Sueño', circadiano: 'Circadiano', digestion: 'Digestión',
  inflamacion: 'Inflamación', estres: 'Estrés', metabolismo: 'Metabólico',
  hormonal: 'Hormonal', cognitivo: 'Cognitivo',
};

function MasterQuizScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [ctx, setCtx] = useState<QuizContext>({ gender: 'non_binary' });
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<MasterQuizQuestion | null>(null);
  const [draft, setDraft] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [preview, setPreview] = useState<{ section: string; nextSection: string } | null>(null);

  // Carga inicial: género (para ramificación) + respuestas previas (resume).
  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const [{ answers: saved, skipped: sk }, gender, age] = await Promise.all([
        loadMasterQuiz(user.id),
        supabase.from('client_profiles').select('biological_sex, date_of_birth').eq('user_id', user.id).maybeSingle()
          .then(r => ({ g: (r.data as any)?.biological_sex, dob: (r.data as any)?.date_of_birth }), () => ({ g: null, dob: null })),
        Promise.resolve(null),
      ]);
      const g: QuizContext['gender'] = gender.g === 'female' ? 'female' : gender.g === 'male' ? 'male' : 'non_binary';
      const nextCtx: QuizContext = { gender: g };
      setCtx(nextCtx);
      setAnswers(saved);
      setSkipped(sk);
      const first = nextQuestion(saved, null, nextCtx, sk);
      setCurrent(first);
      setDraft(first ? saved[first.code] : undefined);
      setDone(first === null);
      setLoading(false);
      void age;
    })();
  }, [user?.id]);

  const progress = useMemo(
    () => computeProgress(answers, ctx, current?.code ?? null),
    [answers, ctx, current],
  );

  const advance = useCallback((nextAnswers: QuizAnswers, nextSkipped: Set<string>) => {
    const q = nextQuestion(nextAnswers, current?.code ?? null, ctx, nextSkipped);
    if (q === null || isComplete(nextAnswers, ctx, nextSkipped)) {
      setDone(true);
      setCurrent(null);
      return;
    }
    // Preview al cruzar de sección.
    if (current && q.section !== current.section) {
      setPreview({ section: current.section, nextSection: q.section });
    }
    setCurrent(q);
    setDraft(nextAnswers[q.code]);
  }, [current, ctx]);

  const onContinue = useCallback(async () => {
    if (!user?.id || !current || draft == null || (Array.isArray(draft) && draft.length === 0)) return;
    haptic.medium();
    const next = { ...answers, [current.code]: draft };
    setAnswers(next);
    saveAnswer(user.id, current.code, draft).catch(() => {});
    advance(next, skipped);
  }, [user?.id, current, draft, answers, skipped, advance]);

  const onSkip = useCallback(async () => {
    if (!user?.id || !current) return;
    haptic.light();
    const nextSk = new Set(skipped).add(current.code);
    setSkipped(nextSk);
    skipQuestion(user.id, current.code).catch(() => {});
    advance(answers, nextSk);
  }, [user?.id, current, skipped, answers, advance]);

  const onBack = useCallback(() => {
    // Volver a la pregunta anterior visible (simple: re-buscar la previa respondida).
    haptic.light();
    router.back();
  }, [router]);

  if (loading) {
    return <Screen><View style={s.center}><ActivityIndicator size="large" color={ATP_BRAND.lime} /></View></Screen>;
  }

  if (done) {
    return <SummaryView answers={answers} ctx={ctx} userId={user?.id ?? ''} onGoProtocol={() => router.push('/salud/intervenciones')} onBack={() => router.back()} />;
  }

  // Preview de sección (transición).
  if (preview && current) {
    const nextMeta = MASTER_QUIZ_SECTIONS.find((x) => x.id === preview.nextSection);
    return (
      <Screen>
        <View style={s.previewWrap}>
          <Animated.View entering={FadeIn.duration(300)} style={s.previewCard}>
            <Text style={s.previewEmoji}>{nextMeta?.emoji}</Text>
            <EliteText style={s.previewTitle}>{nextMeta?.title}</EliteText>
            <EliteText style={s.previewIntro}>{nextMeta?.intro}</EliteText>
            <AnimatedPressable onPress={() => { haptic.medium(); setPreview(null); }} style={s.previewBtn}>
              <Text style={s.previewBtnText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={16} color="#000" />
            </AnimatedPressable>
          </Animated.View>
        </View>
      </Screen>
    );
  }

  if (!current) return <Screen><View style={s.center}><ActivityIndicator color={ATP_BRAND.lime} /></View></Screen>;

  const sectionMeta = MASTER_QUIZ_SECTIONS.find((x) => x.id === current.section);
  const canContinue = draft != null && !(Array.isArray(draft) && draft.length === 0);

  return (
    <Screen edges={['top']}>
      {/* Header: progreso + guardar-y-salir */}
      <View style={s.header}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <Text style={s.progressLabel}>
            {sectionMeta?.emoji} Sección {progress.sectionIndex + 1} de {progress.sectionTotal} · Pregunta {progress.questionInSection} de {progress.questionsInSection}
          </Text>
          <View style={s.progressBar}><View style={[s.progressFill, { width: `${Math.round(progress.ratio * 100)}%` }]} /></View>
        </View>
        <Pressable onPress={onBack} hitSlop={8}><Text style={s.saveExit}>Guardar y salir</Text></Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View key={current.code} entering={FadeInUp.springify()}>
          <EliteText style={s.questionText}>{current.text}</EliteText>
          {current.why && (
            <View style={s.whyBox}>
              <Ionicons name="bulb-outline" size={14} color={ATP_BRAND.lime} />
              <EliteText style={s.whyText}>{current.why}</EliteText>
            </View>
          )}
          <View style={{ marginTop: Spacing.lg }}>
            <QuestionInput question={current} value={draft} onChange={setDraft} />
          </View>

          {current.allowPreferNot && (
            <Pressable onPress={onSkip} style={s.preferNot}>
              <Text style={s.preferNotText}>Prefiero no responder</Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>

      {/* Controles */}
      <View style={s.footer}>
        <Pressable onPress={onSkip} hitSlop={8}><Text style={s.skipText}>Saltar</Text></Pressable>
        <AnimatedPressable onPress={onContinue} disabled={!canContinue}
          style={[s.continueBtn, !canContinue && { opacity: 0.4 }]}>
          <Text style={s.continueText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={18} color="#000" />
        </AnimatedPressable>
      </View>
    </Screen>
  );
}

// ── Resumen final: TU FENOTIPO + las 5 del motor ─────────────────────────────

function SummaryView({ answers, ctx, userId, onGoProtocol, onBack }: {
  answers: QuizAnswers; ctx: QuizContext; userId: string;
  onGoProtocol: () => void; onBack: () => void;
}) {
  const quiz = useMemo(() => scoreToPhenotype(answers), [answers]);
  const top5 = useMemo(() => {
    try {
      return personalizeInterventions(quizPhenotypeToMotorPhenotype(quiz, userId, ctx.gender, ctx.age));
    } catch { return []; }
  }, [quiz, userId, ctx]);

  const worstSystems = [...quiz.dxLevels].sort((a, b) => a.level - b.level).slice(0, 3);
  const levelColor = (lvl: number) => (lvl <= 2 ? '#ef4444' : lvl <= 3 ? '#fbbf24' : '#4ade80');

  return (
    <Screen edges={['top']}>
      <View style={s.header}>
        <BackButton onPress={onBack} />
        <EliteText style={s.summaryHeaderTitle}>Tu fenotipo</EliteText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Animated.View entering={FadeInUp.springify()}>
          <EliteText style={s.summaryKicker}>🧬 TU FENOTIPO EPIGENÉTICO · ATP</EliteText>

          {worstSystems.length > 0 && (
            <>
              <EliteText style={s.summarySection}>Sistemas prioritarios a trabajar</EliteText>
              {worstSystems.map((sys) => (
                <View key={sys.system} style={s.sysRow}>
                  <View style={[s.sysDot, { backgroundColor: levelColor(sys.level) }]} />
                  <Text style={s.sysName}>{SYSTEM_LABELS[sys.system] ?? sys.system}</Text>
                  <Text style={[s.sysLevel, { color: levelColor(sys.level) }]}>Nivel {sys.level}/5</Text>
                </View>
              ))}
            </>
          )}

          {quiz.activatedRoots.length > 0 && (
            <>
              <EliteText style={s.summarySection}>Causas raíz identificadas</EliteText>
              {quiz.activatedRoots.slice(0, 6).map((r) => (
                <Text key={r} style={s.rootLine}>• {ROOT_LABELS[r as keyof typeof ROOT_LABELS] ?? r}</Text>
              ))}
            </>
          )}

          {top5.length > 0 && (
            <View style={s.rxBox}>
              <EliteText style={s.rxTitle}>ATP te prescribe estas {top5.length} para TU perfil</EliteText>
              {top5.map((r) => (
                <View key={r.intervention.key} style={s.rxRow}>
                  <Text style={s.rxRank}>{r.rank}</Text>
                  <Text style={s.rxName} numberOfLines={1}>{r.intervention.name}</Text>
                </View>
              ))}
            </View>
          )}

          <AnimatedPressable onPress={onGoProtocol} style={s.protocolBtn}>
            <Text style={s.protocolBtnText}>Ver Mi Protocolo</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </AnimatedPressable>

          <View style={{ height: Spacing.xxl }} />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  progressLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: TEXT.tertiary, marginBottom: 4 },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: ELEVATION[2].bg, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: ATP_BRAND.lime },
  saveExit: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: TEXT.secondary },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  questionText: { fontFamily: Fonts.extraBold, fontSize: 22, color: TEXT.primary, lineHeight: 28 },
  whyBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: withOpacity(ATP_BRAND.lime, 0.06), borderRadius: Radius.md, padding: Spacing.sm, marginTop: Spacing.md },
  whyText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSizes.xs, color: TEXT.secondary, lineHeight: 17 },
  preferNot: { alignSelf: 'center', marginTop: Spacing.lg, paddingVertical: Spacing.sm },
  preferNotText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.tertiary, textDecorationLine: 'underline' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderTopWidth: 0.5, borderTopColor: ELEVATION[1].border },
  skipText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.tertiary, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  continueBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ATP_BRAND.lime, borderRadius: Radius.pill, paddingHorizontal: Spacing.xl, paddingVertical: 12 },
  continueText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: '#000', letterSpacing: 0.5 },
  // preview
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  previewCard: { alignItems: 'center', gap: Spacing.sm },
  previewEmoji: { fontSize: 48 },
  previewTitle: { fontFamily: Fonts.extraBold, fontSize: 24, color: TEXT.primary, textAlign: 'center' },
  previewIntro: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ATP_BRAND.lime, borderRadius: Radius.pill, paddingHorizontal: Spacing.xl, paddingVertical: 12 },
  previewBtnText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: '#000' },
  // summary
  summaryHeaderTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: TEXT.primary },
  summaryKicker: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: ATP_BRAND.lime, letterSpacing: 1, marginBottom: Spacing.md },
  summarySection: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2, color: TEXT.tertiary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sysRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: ELEVATION[1].bg, borderWidth: 0.5, borderColor: ELEVATION[1].border, borderRadius: Radius.md, padding: Spacing.md, marginBottom: 6 },
  sysDot: { width: 10, height: 10, borderRadius: 5 },
  sysName: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  sysLevel: { fontFamily: Fonts.bold, fontSize: FontSizes.sm },
  rootLine: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, color: TEXT.secondary, lineHeight: 22 },
  rxBox: { backgroundColor: withOpacity(ATP_BRAND.lime, 0.06), borderWidth: 0.5, borderColor: withOpacity(ATP_BRAND.lime, 0.3), borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.lg, gap: 8 },
  rxTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.sm, color: TEXT.primary, marginBottom: 4 },
  rxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rxRank: { fontFamily: Fonts.extraBold, fontSize: FontSizes.md, color: ATP_BRAND.lime, width: 20 },
  rxName: { flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: TEXT.primary },
  protocolBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: 14, marginTop: Spacing.xl },
  protocolBtnText: { fontFamily: Fonts.extraBold, fontSize: FontSizes.md, color: '#000', letterSpacing: 0.5 },
});

export default function MasterQuizGated() {
  return (
    <MedicalDisclaimerGate>
      <MasterQuizScreen />
    </MedicalDisclaimerGate>
  );
}
