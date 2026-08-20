/**
 * TESTS · motor único de cuestionarios (Ola 4, Anexo C, pieza 3b).
 *
 * Una ruta responde por los cuatro motores que hoy son cuatro pantallas:
 * los 5 funcionales, el quiz de base de datos, el cronotipo y el Cuestionario
 * Maestro. Lo que cambiaba entre ellos era el banco, la ramificación, el scorer,
 * la tabla y el efecto al terminar, y todo eso ya es dato en el registry.
 *
 * Lo que gana la app al unificarlos:
 *  - resume universal: guardar y salir existe en los cuatro, no en uno.
 *  - "prefiero no responder" deja de ser exclusivo del Maestro (menos donde
 *    falsearía un resultado categórico: el cronotipo reparte puntos entre
 *    cuatro animales y una pregunta menos cambia el animal).
 *  - el flash POR QUÉ IMPORTA de los funcionales queda como capacidad del
 *    motor, disponible para cualquier pregunta que traiga su porqué.
 *
 * Lo que NO cambia: dónde aterriza cada dato y cuándo. Ver engine-runtime.ts.
 * Braverman no pasa por aquí: se justifica con pantalla propia.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { BackButton } from '@/src/components/ui/BackButton';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { QuestionInput } from '@/src/components/master-quiz/QuestionInput';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';
import { FunctionalResult } from '@/src/components/assessments/FunctionalResult';
import { LifestyleResult } from '@/src/components/assessments/LifestyleResult';
import { ChronotypeReveal } from '@/src/components/assessments/ChronotypeReveal';
import { PhenotypeSummary } from '@/src/components/assessments/PhenotypeSummary';
import { useAuth } from '@/src/contexts/auth-context';
import { getAssessment } from '@/src/constants/assessments';
import {
  loadSession, finish, saveProgress, persistAnswer, clearDraft, writeDraft,
  acceptProtocols, activateChronotype, allowsSkip,
  nextCode, prevCode, progressOf, questionByCode, engineFamily,
  type EngineSession, type EngineOutcome,
} from '@/src/services/assessments/engine-runtime';
import { scoreFunctional } from '@/src/services/assessments/adapters';
import { haptic } from '@/src/utils/haptics';
import { ATP_BRAND, withOpacity, type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

type Phase = 'intro' | 'question' | 'result';

function AssessmentEngine() {
  const t = useAppTheme().tokens;
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const assessment = id ? getAssessment(id) : undefined;
  const family = assessment ? engineFamily(assessment) : null;

  const [session, setSession] = useState<EngineSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<string | null>(null);
  const [draft, setDraft] = useState<unknown>(undefined);
  const [flash, setFlash] = useState<string | null>(null);

  const [outcome, setOutcome] = useState<EngineOutcome | null>(null);
  const [selectedRecs, setSelectedRecs] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // ── Carga ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !assessment) return;
    let alive = true;
    loadSession(assessment, user.id)
      .then((sess) => {
        if (!alive) return;
        setSession(sess);
        setAnswers(sess.answers);
        setSkipped(sess.skipped);
        setCurrent(sess.startCode);
        setDraft(sess.startCode ? sess.answers[sess.startCode] : undefined);
        // El Maestro nunca tuvo portada y no se le inventa una: entra directo.
        // Los otros tres sí la tienen y ahí se decide si empezar o continuar.
        if (sess.completed) {
          setPhase('result');
          if (sess.family === 'functional' && sess.raw.functional) {
            const responses: Record<string, boolean> = {};
            for (const [k, v] of Object.entries(sess.answers)) responses[k] = v === true || v === 'true';
            const scored = scoreFunctional(sess.raw.functional, responses);
            setOutcome({ kind: 'functional', quiz: sess.raw.functional, ...scored });
          } else {
            setOutcome({ kind: 'master' });
          }
        } else {
          setPhase(sess.family === 'master' ? 'question' : 'intro');
        }
        setLoading(false);
      })
      .catch((e: Error) => {
        if (!alive) return;
        setError(e.message || 'No se pudo cargar la evaluación.');
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user?.id, assessment?.id]);

  const question = useMemo(
    () => (session ? questionByCode(session, answers, current) : null),
    [session, answers, current],
  );
  const progress = useMemo(
    () => (session ? progressOf(session, answers, current) : { ratio: 0, label: '' }),
    [session, answers, current],
  );

  // ── Avanzar ────────────────────────────────────────────────────────────────

  const complete = useCallback(async (finalAnswers: Record<string, unknown>) => {
    if (!session || !user?.id) return;
    setSaving(true);
    try {
      const result = await finish(session, user.id, finalAnswers);
      setOutcome(result);
      // El borrador local ya cumplió: la respuesta o su decisión mandan ahora.
      if (session.family === 'db-quiz' || session.family === 'chronotype') {
        await writeDraft(user.id, session.assessment.id, finalAnswers, new Set(), null);
      }
      setPhase('result');
      haptic.success();
    } catch {
      Alert.alert('No se pudo terminar', 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [session, user?.id]);

  /** Sin pregunta siguiente, terminar ES la siguiente pantalla. */
  const goTo = useCallback((code: string | null, nextAnswers: Record<string, unknown>) => {
    if (code === null) { void complete(nextAnswers); return; }
    setCurrent(code);
    setDraft(nextAnswers[code]);
  }, [complete]);

  const submit = useCallback(async (value: unknown, wasSkipped = false) => {
    if (!session || !user?.id || !current || !question) return;
    haptic.light();

    const nextAnswers = { ...answers };
    const nextSkipped = new Set(skipped);
    if (wasSkipped) { delete nextAnswers[current]; nextSkipped.add(current); }
    else { nextAnswers[current] = value; nextSkipped.delete(current); }

    setAnswers(nextAnswers);
    setSkipped(nextSkipped);
    void persistAnswer(session, user.id, current, value, wasSkipped);

    // El flash POR QUÉ IMPORTA: el porqué de la pregunta aparece cuando la
    // respuesta lo hace relevante (en los funcionales, cuando es cierto).
    if (!wasSkipped && question.why && (value === true || value === 'true')) {
      setFlash(question.why);
      setTimeout(() => setFlash(null), 1800);
    }

    const upcoming = nextCode(session, nextAnswers, nextSkipped, current);

    // El funcional guarda cada 10, exactamente como la pantalla que absorbe.
    if (session.family === 'functional') {
      const index = session.questions.findIndex((q) => q.code === upcoming);
      if (index > 0 && index % 10 === 0) {
        void saveProgress(session, user.id, nextAnswers, nextSkipped, upcoming).then(setSession);
      }
    }
    if (session.family === 'db-quiz' || session.family === 'chronotype') {
      void writeDraft(user.id, session.assessment.id, nextAnswers, nextSkipped, upcoming);
    }

    goTo(upcoming, nextAnswers);
  }, [session, user?.id, current, question, answers, skipped, goTo]);

  /** Una sola opción no necesita confirmarse: se elige y se avanza. */
  const autoAdvances = !!session && session.family !== 'master'
    && (question?.type === 'toggle' || question?.type === 'single');

  const onSaveAndExit = useCallback(async () => {
    if (!session || !user?.id) { router.back(); return; }
    haptic.light();
    await saveProgress(session, user.id, answers, skipped, current);
    router.back();
  }, [session, user?.id, answers, skipped, current, router]);

  const onBack = useCallback(() => {
    if (!session) { router.back(); return; }
    const prev = prevCode(session, answers, current);
    haptic.light();
    if (prev === null) { router.back(); return; }
    setCurrent(prev);
    setDraft(answers[prev]);
  }, [session, answers, current, router]);

  // ── Segundo tiempo de las familias que deciden antes de escribir ───────────

  const onAcceptProtocols = useCallback(async () => {
    if (!user?.id || outcome?.kind !== 'db-quiz') return;
    setSaving(true);
    try {
      const count = await acceptProtocols(
        user.id, outcome.quiz, answers, outcome.domainScores, outcome.recommendations, selectedRecs,
      );
      await clearDraft(user.id, session!.assessment.id);
      if (count > 0) {
        haptic.success();
        Alert.alert('Listo', `Se guardaron ${count} propuesta${count > 1 ? 's' : ''}.`);
      } else {
        haptic.success();
      }
      router.replace('/tests');
    } catch {
      Alert.alert('Error', 'No se pudieron guardar las propuestas.');
    } finally {
      setSaving(false);
    }
  }, [user?.id, outcome, answers, selectedRecs, session, router]);

  const onActivateChronotype = useCallback(async () => {
    if (outcome?.kind !== 'chronotype' || !user?.id) return;
    // E-9 (MB-12): sin horarios NO se guarda ni se navega en falso.
    if (!outcome.schedule) {
      Alert.alert('No se pudo activar', 'Tu resultado no se pudo guardar ahora. Intenta de nuevo en un momento.');
      return;
    }
    setSaving(true);
    try {
      await activateChronotype(outcome.template, answers, outcome.scores, outcome.result, outcome.schedule);
      await clearDraft(user.id, session!.assessment.id);
      haptic.success();
      // El resultado del cronotipo tiene casa propia porque se consulta después.
      router.replace('/tests/resultado/cronotipo');
    } catch {
      Alert.alert('No se pudo guardar', 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [outcome, answers, user?.id, session, router]);

  const restart = useCallback(() => {
    if (!session) return;
    // Repetir es un intento NUEVO: se suelta la fila anterior para no pisar el
    // resultado que ya quedó guardado.
    setSession({ ...session, rowId: null, completed: false });
    setAnswers({});
    setSkipped(new Set());
    setOutcome(null);
    setSelectedRecs(new Set());
    setCurrent(session.questions[0]?.code ?? null);
    setDraft(undefined);
    setPhase('intro');
  }, [session]);

  // ── Estados de borde ───────────────────────────────────────────────────────

  if (!assessment || !family) {
    return (
      <Screen themed>
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={44} color={t.error} />
          <EliteText style={s.errorTitle}>Evaluación no encontrada</EliteText>
          <AnimatedPressable onPress={() => router.replace('/tests')} style={s.quiet}>
            <EliteText variant="caption" style={s.quietText}>Volver a Tests</EliteText>
          </AnimatedPressable>
        </View>
      </Screen>
    );
  }

  if (loading) {
    return <Screen themed><View style={s.center}><ActivityIndicator size="large" color={ATP_BRAND.lime} /></View></Screen>;
  }

  if (error || !session) {
    return (
      <Screen themed>
        <View style={s.center}>
          <EliteText variant="caption" style={s.errorBody}>{error ?? 'No se pudo cargar la evaluación.'}</EliteText>
          <AnimatedPressable onPress={() => router.back()} style={s.quiet}>
            <EliteText variant="caption" style={s.quietText}>Volver</EliteText>
          </AnimatedPressable>
        </View>
      </Screen>
    );
  }

  // ── Portada ────────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    const answered = Object.keys(answers).length;
    return (
      <Screen edges={['top']} themed>
        <View style={s.header}><BackButton onPress={() => router.back()} /></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          <Animated.View entering={FadeInUp.springify()}>
            <EliteText style={[s.introKicker, { color: assessment.color ?? ATP_BRAND.lime }]}>ATP EVALUACIÓN</EliteText>
            <EliteText style={s.introTitle}>{assessment.title}</EliteText>
            {assessment.subtitle && <EliteText variant="caption" style={s.introSub}>{assessment.subtitle}</EliteText>}

            <View style={s.howBox}>
              <EliteText style={s.howTitle}>CÓMO FUNCIONA</EliteText>
              <EliteText variant="caption" style={s.howBody}>
                {session.questions.length} preguntas.
                {'\n\n'}Puedes pausar y retomar cuando quieras: tu avance se guarda.
                {'\n\n'}Responde según cómo te sientes la mayor parte del tiempo, no solo hoy.
              </EliteText>
            </View>

            <EliteText variant="caption" style={s.meta}>
              {assessment.estimatedMinutes ? `~${assessment.estimatedMinutes} minutos · ` : ''}
              {session.questions.length} preguntas
            </EliteText>

            <AnimatedPressable onPress={() => { haptic.medium(); setPhase('question'); }} style={s.primary}>
              <EliteText style={s.primaryText}>
                {answered > 0 ? 'CONTINUAR EVALUACIÓN' : 'INICIAR EVALUACIÓN'}
              </EliteText>
            </AnimatedPressable>
            <View style={{ height: Spacing.xxl }} />
          </Animated.View>
        </ScrollView>
      </Screen>
    );
  }

  // ── Resultado ──────────────────────────────────────────────────────────────

  if (phase === 'result' && outcome) {
    if (outcome.kind === 'functional') {
      return (
        <Screen edges={['top']} themed>
          <View style={s.header}><BackButton onPress={() => router.replace('/tests')} /></View>
          <FunctionalResult
            quiz={outcome.quiz}
            domainScores={outcome.domainScores}
            activeInsights={outcome.activeInsights}
            onFinish={() => router.replace('/tests')}
            onRetake={restart}
          />
        </Screen>
      );
    }
    if (outcome.kind === 'db-quiz') {
      return (
        <Screen edges={['top']} themed>
          <View style={s.header}><BackButton onPress={() => router.replace('/tests')} /></View>
          <LifestyleResult
            domainScores={outcome.domainScores}
            recommendations={outcome.recommendations}
            selected={selectedRecs}
            onToggle={(key) => setSelectedRecs((prev) => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key); else next.add(key);
              return next;
            })}
            onAccept={onAcceptProtocols}
            onExplore={() => router.push('/salud/intervenciones')}
            saving={saving}
          />
        </Screen>
      );
    }
    if (outcome.kind === 'chronotype') {
      return (
        <Screen edges={['top']} themed>
          <View style={s.header}><BackButton onPress={() => router.replace('/tests')} /></View>
          <ChronotypeReveal
            result={outcome.result}
            scores={outcome.scores}
            schedule={outcome.schedule}
            totalQuestions={session.questions.length}
            saving={saving}
            onActivate={onActivateChronotype}
            onRetake={restart}
          />
        </Screen>
      );
    }
    return (
      <Screen edges={['top']} themed>
        <View style={s.header}>
          <BackButton onPress={() => router.replace('/tests')} />
          <EliteText style={s.summaryTitle}>Tu fenotipo</EliteText>
          <View style={{ width: 40 }} />
        </View>
        <PhenotypeSummary
          answers={answers}
          ctx={session.ctx}
          userId={user?.id ?? ''}
          onGoProtocol={() => router.push('/salud/intervenciones')}
        />
      </Screen>
    );
  }

  // ── Captura ────────────────────────────────────────────────────────────────

  if (!question) {
    return <Screen themed><View style={s.center}><ActivityIndicator color={ATP_BRAND.lime} /></View></Screen>;
  }

  const canContinue = draft != null && !(Array.isArray(draft) && draft.length === 0);
  const canSkip = allowsSkip(session.family);

  return (
    <Screen edges={['top']} themed>
      <View style={s.header}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1 }}>
          <EliteText variant="caption" style={s.progressLabel}>{progress.label}</EliteText>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.round(progress.ratio * 100)}%` }]} />
          </View>
        </View>
        <Pressable onPress={onSaveAndExit} hitSlop={8}>
          <EliteText variant="caption" style={s.saveExit}>Guardar y salir</EliteText>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View key={question.code} entering={FadeInUp.springify()}>
          <EliteText style={s.questionText}>{question.text}</EliteText>

          {/* El porqué que se lee siempre (Maestro) vive en la caja fija. */}
          {session.family === 'master' && question.why && (
            <View style={s.whyBox}>
              <Ionicons name="bulb-outline" size={14} color={ATP_BRAND.lime} />
              <EliteText variant="caption" style={s.whyText}>{question.why}</EliteText>
            </View>
          )}

          <View style={{ marginTop: Spacing.lg }}>
            <QuestionInput
              question={question}
              value={draft}
              onChange={(value) => {
                setDraft(value);
                if (autoAdvances) void submit(value);
              }}
            />
          </View>

          {canSkip && (
            <Pressable onPress={() => submit(undefined, true)} style={s.preferNot}>
              <EliteText variant="caption" style={s.preferNotText}>Prefiero no responder</EliteText>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>

      {/* El flash POR QUÉ IMPORTA: aparece, informa y se va solo. */}
      {flash && (
        <Animated.View entering={FadeIn.duration(150)} style={s.flash}>
          <EliteText style={s.flashLabel}>POR QUÉ IMPORTA</EliteText>
          <EliteText variant="caption" style={s.flashBody}>{flash}</EliteText>
        </Animated.View>
      )}

      {!autoAdvances && (
        <View style={s.footer}>
          {session.family === 'master' ? (
            <Pressable onPress={() => submit(undefined, true)} hitSlop={8}>
              <EliteText variant="caption" style={s.skipText}>Saltar</EliteText>
            </Pressable>
          ) : <View />}
          <AnimatedPressable
            onPress={() => submit(draft)}
            disabled={!canContinue || saving}
            style={[s.continue, (!canContinue || saving) && { opacity: 0.4 }]}
          >
            <EliteText style={s.continueText}>Continuar</EliteText>
            <Ionicons name="arrow-forward" size={18} color={t.textoSobreLima} />
          </AnimatedPressable>
        </View>
      )}
    </Screen>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },

  errorTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: t.texto },
  errorBody: { color: t.textoSecundario, fontSize: FontSizes.sm, textAlign: 'center' },
  quiet: { borderWidth: 1, borderColor: t.borde, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.lg },
  quietText: { color: t.textoSecundario, fontSize: FontSizes.sm },

  introKicker: { fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 3 },
  introTitle: { fontFamily: Fonts.extraBold, fontSize: 28, color: t.texto, marginTop: 6, lineHeight: 34 },
  introSub: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 21, marginTop: Spacing.xs },
  howBox: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.05), borderRadius: Radius.lg, padding: Spacing.md,
    marginTop: Spacing.lg, borderWidth: 1, borderColor: withOpacity(ATP_BRAND.lime, 0.15),
  },
  howTitle: { fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1, marginBottom: 6, color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto },
  howBody: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 20 },
  meta: { color: t.textoTenue, fontSize: FontSizes.xs, textAlign: 'center', marginTop: Spacing.md },
  primary: { backgroundColor: ATP_BRAND.lime, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  primaryText: { fontFamily: Fonts.extraBold, fontSize: FontSizes.md, color: t.textoSobreLima, letterSpacing: 0.5 },

  progressLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: t.textoTenue, marginBottom: 4 },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: t.flotante, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: ATP_BRAND.lime },
  saveExit: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, color: t.textoSecundario },

  questionText: { fontFamily: Fonts.extraBold, fontSize: 22, color: t.texto, lineHeight: 28 },
  whyBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: Spacing.md,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.06), borderRadius: Radius.md, padding: Spacing.sm,
  },
  whyText: { flex: 1, color: t.textoSecundario, fontSize: FontSizes.xs, lineHeight: 17 },
  preferNot: { alignSelf: 'center', marginTop: Spacing.lg, paddingVertical: Spacing.sm },
  preferNotText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: t.textoTenue, textDecorationLine: 'underline' },

  flash: {
    position: 'absolute', left: Spacing.md, right: Spacing.md, bottom: Spacing.xl,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.12), borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: withOpacity(ATP_BRAND.lime, 0.3),
  },
  flashLabel: { fontFamily: Fonts.extraBold, fontSize: 10, letterSpacing: 1, marginBottom: 4, color: t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto },
  flashBody: { color: t.textoSecundario, fontSize: FontSizes.sm, lineHeight: 18 },

  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderTopWidth: 0.5, borderTopColor: t.borde,
  },
  skipText: { fontFamily: Fonts.semiBold, fontSize: FontSizes.sm, color: t.textoTenue, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  continue: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.pill, paddingHorizontal: Spacing.xl, paddingVertical: 12,
  },
  continueText: { fontFamily: Fonts.bold, fontSize: FontSizes.md, color: t.textoSobreLima, letterSpacing: 0.5 },
  summaryTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: FontSizes.lg, color: t.texto },
});

export default function AssessmentEngineGated() {
  return (
    <MedicalDisclaimerGate>
      <AssessmentEngine />
    </MedicalDisclaimerGate>
  );
}
