/**
 * Onboarding — Edad ATP Estimada ("Win de 5 minutos").
 *
 * 4 fases internas:
 *   intro → questions (8) → composicion (opcional) → resultado (hero)
 *
 * Persiste resultado en client_profiles + body_measurements al confirmar.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInUp, FadeIn, FadeInDown, SlideInRight, ZoomIn,
} from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { OptionCard } from '@/src/components/onboarding/OptionCard';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { haptic } from '@/src/utils/haptics';
import { getLocalToday } from '@/src/utils/date-helpers';
import { type FactorKey } from '@/src/constants/edad-atp-model';
import {
  computeEdadAtp,
  computeFfmi,
  type EdadAtpResult,
  type CompositionInput,
} from '@/src/services/edad-atp-service';
import {
  saveBlockProgress, loadBlockProgress, clearBlockProgress,
  getPreviousOnboardingRoute,
} from '@/src/services/onboarding-service';
import { Fonts, FontSizes, Spacing, Radius } from '@/constants/theme';
import { ATP_BRAND } from '@/src/constants/brand';

type Phase = 'intro' | 'questions' | 'composicion' | 'resultado';

// === QUESTION DEFINITIONS ===

interface EdadAtpQuestion {
  factor: FactorKey;
  text: string;
  options: { key: string; label: string }[];
  numeric?: boolean;
}

const QUESTIONS: EdadAtpQuestion[] = [
  {
    factor: 'tabaco',
    text: '¿Fumas o has fumado?',
    options: [
      { key: 'nunca', label: 'Nunca' },
      { key: 'ex_antes_40', label: 'Lo dejé hace +10 años o antes de los 40' },
      { key: 'ex_reciente', label: 'Lo dejé hace poco' },
      { key: 'fuma', label: 'Fumo' },
    ],
  },
  {
    factor: 'actividad',
    text: '¿Minutos de ejercicio moderado-vigoroso por semana?',
    options: [
      { key: 'activo', label: '150 o más' },
      { key: 'algo', label: '75 a 149' },
      { key: 'sedentario', label: 'Menos de 75' },
    ],
  },
  {
    factor: 'dieta',
    text: '¿Cómo describirías tu alimentación habitual?',
    options: [
      { key: 'excelente', label: 'Comida real casi siempre' },
      { key: 'promedio', label: 'Mezcla' },
      { key: 'pobre', label: 'Ultraprocesados frecuentes' },
    ],
  },
  {
    factor: 'composicion',
    text: 'Cintura y estatura (cm)',
    options: [],
    numeric: true,
  },
  {
    factor: 'sueno',
    text: 'Tu sueño habitual',
    options: [
      { key: 'optimo', label: '7-8 h consistente' },
      { key: 'suboptimo', label: 'Fuera de eso pero estable' },
      { key: 'malo', label: 'Menos de 6 h o muy irregular' },
    ],
  },
  {
    factor: 'social',
    text: 'Tu vida social y emocional',
    options: [
      { key: 'fuerte', label: 'Red fuerte y acompañado' },
      { key: 'ok', label: 'Más o menos' },
      { key: 'aislado', label: 'Aislado / me siento solo' },
    ],
  },
  {
    factor: 'alcohol',
    text: 'Bebidas alcohólicas por semana',
    options: [
      { key: 'ninguno_bajo', label: '0-2' },
      { key: 'moderado', label: '3-6' },
      { key: 'alto', label: '7 o más' },
    ],
  },
  {
    factor: 'estres',
    text: 'Tu nivel de estrés y manejo',
    options: [
      { key: 'bajo', label: 'Bajo, lo manejo bien' },
      { key: 'moderado', label: 'Moderado' },
      { key: 'alto', label: 'Alto y crónico' },
    ],
  },
];

// === MAIN COMPONENT ===

export default function EdadAtpOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Phase state
  const [phase, setPhase] = useState<Phase>('intro');

  // Questions state
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<FactorKey, string>>>({});
  const [animKey, setAnimKey] = useState(0);

  // Q4 numeric inputs (cintura/estatura)
  const [cintura, setCintura] = useState('');
  const [estatura, setEstatura] = useState('');
  const estaturaRef = useRef<TextInput>(null);

  // Optional composition
  const [peso, setPeso] = useState('');
  const [grasaPct, setGrasaPct] = useState('');
  const [visceralRating, setVisceralRating] = useState('');

  // Result
  const [result, setResult] = useState<EdadAtpResult | null>(null);
  const [dob, setDob] = useState<string | null>(null);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [saving, setSaving] = useState(false);

  // Load DOB and sex from client_profiles
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('client_profiles')
      .select('date_of_birth, biological_sex')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.date_of_birth) setDob(data.date_of_birth);
        if (data?.biological_sex) setSex(data.biological_sex as 'male' | 'female');
      });
  }, [user?.id]);

  // Restaurar progreso al reabrir mid-cuestionario (resume — bug F01.17)
  useEffect(() => {
    if (!user?.id) return;
    loadBlockProgress(user.id, 'edad_atp').then(prog => {
      if (prog && prog.answers) {
        setAnswers(prog.answers as Partial<Record<FactorKey, string>>);
        setCurrentQ(Math.min(prog.currentQ ?? 0, QUESTIONS.length - 1));
        if (typeof prog.cintura === 'string') setCintura(prog.cintura);
        if (typeof prog.estatura === 'string') setEstatura(prog.estatura);
        setPhase('questions');
      }
    });
  }, [user?.id]);

  // === HANDLERS ===

  const persistProgress = useCallback((
    nextAnswers: Partial<Record<FactorKey, string>>,
    nextQ: number,
  ) => {
    if (!user?.id) return;
    saveBlockProgress(user.id, 'edad_atp', {
      answers: nextAnswers, currentQ: nextQ, cintura, estatura,
    });
  }, [user?.id, cintura, estatura]);

  const handleOptionSelect = useCallback((factor: FactorKey, key: string) => {
    haptic.light();
    const updated = { ...answers, [factor]: key };
    setAnswers(updated);
    const nextQ = currentQ < QUESTIONS.length - 1 ? currentQ + 1 : currentQ;
    persistProgress(updated, nextQ);
    // Auto-advance after short delay for visual feedback
    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ(prev => prev + 1);
        setAnimKey(prev => prev + 1);
      } else {
        setPhase('composicion');
      }
    }, 250);
  }, [currentQ, answers, persistProgress]);

  const handleComposicionNumeric = useCallback(() => {
    const c = parseFloat(cintura);
    const e = parseFloat(estatura);
    if (!c || !e || e === 0) return;
    const ratio = c / e;
    let classification: string;
    if (ratio < 0.5) classification = 'optima';
    else if (ratio <= 0.6) classification = 'borderline';
    else classification = 'alta';

    haptic.light();
    const updated = { ...answers, composicion: classification };
    setAnswers(updated);
    const nextQ = currentQ < QUESTIONS.length - 1 ? currentQ + 1 : currentQ;
    persistProgress(updated, nextQ);
    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ(prev => prev + 1);
        setAnimKey(prev => prev + 1);
      } else {
        setPhase('composicion');
      }
    }, 250);
  }, [cintura, estatura, currentQ, answers, persistProgress]);

  const handleBack = useCallback(() => {
    haptic.light();
    if (currentQ > 0) {
      setCurrentQ(prev => prev - 1);
      setAnimKey(prev => prev + 1);
    } else {
      setPhase('intro');
    }
  }, [currentQ]);

  const computeResult = useCallback(() => {
    if (!dob) return;

    const heightCm = parseFloat(estatura);
    let composition: CompositionInput | undefined;

    const pesoNum = parseFloat(peso);
    const grasaNum = parseFloat(grasaPct);
    const visceralNum = parseFloat(visceralRating);

    if (pesoNum && heightCm) {
      composition = {
        weight_kg: pesoNum,
        body_fat_pct: grasaNum || undefined,
        visceral_fat_rating: visceralNum || undefined,
        height_cm: heightCm,
        sex,
      };
    }

    const res = computeEdadAtp(dob, answers, composition);
    setResult(res);
    setPhase('resultado');
  }, [dob, estatura, peso, grasaPct, visceralRating, sex, answers]);

  const handlePersistAndContinue = useCallback(async () => {
    if (!user?.id || !result) return;
    setSaving(true);
    try {
      const heightCm = parseFloat(estatura);

      // Persist edad ATP to client_profiles
      const factorsShape: Record<string, { answer: string; delta: number }> = {};
      for (const [factor, delta] of Object.entries(result.deltas)) {
        factorsShape[factor] = {
          answer: answers[factor as FactorKey] || '',
          delta: delta as number,
        };
      }

      await supabase.from('client_profiles').update({
        edad_atp_estimated_years: result.years,
        edad_atp_confidence: result.confidence,
        edad_atp_factors: factorsShape,
        edad_atp_culpables: result.culpables.map(c => ({
          factor: c.factor,
          delta: c.delta,
          label: c.label,
        })),
        edad_atp_computed_at: new Date().toISOString(),
        ...(heightCm ? { height_cm: heightCm } : {}),
      }).eq('user_id', user.id);

      // If measured composition was provided, save to body_measurements
      const pesoNum = parseFloat(peso);
      if (result.composition_used && pesoNum) {
        const grasaNum = parseFloat(grasaPct);
        const visceralNum = parseFloat(visceralRating);
        const ffmi = (grasaNum && heightCm)
          ? computeFfmi(pesoNum, grasaNum, heightCm)
          : null;

        await supabase.from('body_measurements').insert({
          user_id: user.id,
          date: getLocalToday(),
          weight_kg: pesoNum,
          ...(grasaNum ? { body_fat_pct: grasaNum } : {}),
          ...(visceralNum ? { visceral_fat_rating: visceralNum } : {}),
          ...(ffmi ? { ffmi } : {}),
        });
      }

      // Mark onboarding step + limpiar progreso
      clearBlockProgress(user.id);
      await supabase.from('profiles').update({
        onboarding_step: 'edad_atp',
      }).eq('id', user.id);

      haptic.success();
      router.replace('/onboarding/voice-config' as any);
    } catch (e) {
      console.warn('Error persisting edad ATP:', e);
      router.replace('/onboarding/voice-config' as any);
    } finally {
      setSaving(false);
    }
  }, [user?.id, result, estatura, peso, grasaPct, visceralRating, answers, router]);

  // === RENDER PHASES ===

  if (phase === 'intro') return renderIntro();
  if (phase === 'questions') return renderQuestions();
  if (phase === 'composicion') return renderComposicion();
  if (phase === 'resultado' && result) return renderResultado();

  // Fallback — missing DOB
  return (
    <SafeAreaView style={s.container}>
      <View style={s.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#fbbf24" />
        <EliteText style={s.fallbackTitle}>
          Necesitamos un par de datos más
        </EliteText>
        <EliteText style={s.fallbackDesc}>
          Para calcular tu Edad ATP necesitamos tu fecha de nacimiento.
        </EliteText>
        <AnimatedPressable
          style={s.primaryBtn}
          onPress={() => router.replace('/onboarding-basics' as any)}
        >
          <EliteText style={s.primaryBtnText}>COMPLETAR DATOS</EliteText>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );

  // === PHASE: INTRO ===

  function renderIntro() {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.introBackRow}>
          <AnimatedPressable
            onPress={() => {
              haptic.light();
              const prev = getPreviousOnboardingRoute('edad_atp');
              if (prev) router.replace(prev as any);
            }}
            hitSlop={12}
            style={s.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#888" />
          </AnimatedPressable>
        </View>
        <View style={s.centered}>
          <Animated.View entering={FadeInUp.delay(100).duration(600)}>
            <View style={s.introIconCircle}>
              <Ionicons name="pulse-outline" size={44} color={ATP_BRAND.lime} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).duration(600)}>
            <EliteText style={s.introTitle}>
              En 5 minutos te decimos{'\n'}algo cierto sobre ti
            </EliteText>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(500).duration(600)}>
            <EliteText style={s.introDesc}>
              8 preguntas basadas en ciencia.{'\n'}
              Un número que te va a sorprender.
            </EliteText>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(700).duration(600)} style={s.introBtnWrap}>
            <AnimatedPressable
              style={s.primaryBtn}
              onPress={() => {
                haptic.medium();
                if (!dob) {
                  router.replace('/onboarding-basics' as any);
                  return;
                }
                setPhase('questions');
              }}
            >
              <EliteText style={s.primaryBtnText}>EMPEZAR</EliteText>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </AnimatedPressable>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(900).duration(400)}>
            <EliteText style={s.introDisclaimer}>
              Estimación basada en respuestas — no es diagnóstico médico.
            </EliteText>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // === PHASE: QUESTIONS ===

  function renderQuestions() {
    const q = QUESTIONS[currentQ];

    return (
      <SafeAreaView style={s.container}>
        {/* Progress bar */}
        <View style={s.progressHeader}>
          <AnimatedPressable onPress={handleBack} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#888" />
          </AnimatedPressable>
          <View style={s.progressBarWrap}>
            {QUESTIONS.map((_, i) => (
              <View
                key={i}
                style={[
                  s.progressSegment,
                  i <= currentQ && s.progressSegmentFilled,
                ]}
              />
            ))}
          </View>
          <EliteText style={s.progressLabel}>{currentQ + 1}/{QUESTIONS.length}</EliteText>
        </View>

        <ScrollView
          contentContainerStyle={s.questionScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View key={animKey} entering={SlideInRight.duration(250).springify()}>
            <EliteText style={s.questionText}>{q.text}</EliteText>

            {q.numeric ? (
              // Q4: Cintura + Estatura inputs
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <EliteText style={s.numericSubtitle}>
                  Para calcular tu ratio cintura/estatura
                </EliteText>

                <View style={s.numericRow}>
                  <View style={s.numericField}>
                    <EliteText style={s.numericLabel}>CINTURA</EliteText>
                    <TextInput
                      style={s.numericInput}
                      placeholder="cm"
                      placeholderTextColor="#444"
                      value={cintura}
                      onChangeText={t => setCintura(t.replace(/[^0-9.]/g, ''))}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                      onSubmitEditing={() => estaturaRef.current?.focus()}
                      autoFocus
                    />
                  </View>
                  <View style={s.numericField}>
                    <EliteText style={s.numericLabel}>ESTATURA</EliteText>
                    <TextInput
                      ref={estaturaRef}
                      style={s.numericInput}
                      placeholder="cm"
                      placeholderTextColor="#444"
                      value={estatura}
                      onChangeText={t => setEstatura(t.replace(/[^0-9.]/g, ''))}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                {cintura && estatura && (
                  <Animated.View entering={FadeInUp.delay(50).springify()}>
                    <AnimatedPressable
                      style={s.primaryBtn}
                      onPress={handleComposicionNumeric}
                    >
                      <EliteText style={s.primaryBtnText}>CONTINUAR</EliteText>
                      <Ionicons name="arrow-forward" size={16} color="#000" />
                    </AnimatedPressable>
                  </Animated.View>
                )}
              </KeyboardAvoidingView>
            ) : (
              // Standard option-based question
              <View style={s.optionsWrap}>
                {q.options.map((opt, idx) => (
                  <Animated.View
                    key={opt.key}
                    entering={FadeInUp.delay(80 + idx * 50).springify()}
                  >
                    <OptionCard
                      text={opt.label}
                      selected={answers[q.factor] === opt.key}
                      onPress={() => handleOptionSelect(q.factor, opt.key)}
                    />
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // === PHASE: COMPOSICION (optional measured) ===

  function renderComposicion() {
    const hasPeso = peso.trim().length > 0;
    return (
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={s.composicionScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInUp.delay(100).duration(500)}>
              <View style={s.composicionIconCircle}>
                <Ionicons name="scale-outline" size={36} color={ATP_BRAND.lime} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(200).duration(500)}>
              <EliteText style={s.composicionTitle}>
                ¿Tienes báscula inteligente?
              </EliteText>
              <EliteText style={s.composicionDesc}>
                Con estos datos extra tu estimación sube de confianza Media a Alta. Si no los tienes, sáltalo — tu resultado sigue siendo válido.
              </EliteText>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(300).duration(500)}>
              <EliteText style={s.numericLabel}>PESO (kg)</EliteText>
              <TextInput
                style={s.composicionInput}
                placeholder="Ej: 78"
                placeholderTextColor="#444"
                value={peso}
                onChangeText={t => setPeso(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
              />

              <EliteText style={s.numericLabel}>% GRASA CORPORAL</EliteText>
              <TextInput
                style={s.composicionInput}
                placeholder="Ej: 22"
                placeholderTextColor="#444"
                value={grasaPct}
                onChangeText={t => setGrasaPct(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
              />

              <EliteText style={s.numericLabel}>GRASA VISCERAL (rating)</EliteText>
              <TextInput
                style={s.composicionInput}
                placeholder="Ej: 8"
                placeholderTextColor="#444"
                value={visceralRating}
                onChangeText={t => setVisceralRating(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
              />
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(400).duration(500)}>
              {hasPeso && (
                <AnimatedPressable
                  style={[s.primaryBtn, { marginTop: Spacing.lg }]}
                  onPress={() => { haptic.medium(); computeResult(); }}
                >
                  <EliteText style={s.primaryBtnText}>CALCULAR CON ESTO</EliteText>
                  <Ionicons name="calculator-outline" size={18} color="#000" />
                </AnimatedPressable>
              )}

              <AnimatedPressable
                style={s.skipBtn}
                onPress={() => { haptic.light(); computeResult(); }}
              >
                <EliteText style={s.skipBtnText}>
                  {hasPeso ? 'Saltar de todos modos' : 'SALTAR'}
                </EliteText>
              </AnimatedPressable>
            </Animated.View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // === PHASE: RESULTADO (hero moment) ===

  function renderResultado() {
    if (!result) return null;

    const diff = result.years - result.chronologicalAge;
    const isOlder = diff > 0;
    const diffColor = isOlder ? '#ef4444' : diff < 0 ? '#4ade80' : ATP_BRAND.lime;
    const diffSign = diff > 0 ? '+' : '';

    return (
      <SafeAreaView style={s.container}>
        <ScrollView
          contentContainerStyle={s.resultScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero number */}
          <Animated.View entering={FadeInUp.delay(200).duration(800)} style={s.resultHero}>
            <EliteText style={s.resultLabel}>TU EDAD ATP ESTIMADA</EliteText>

            <Animated.View entering={ZoomIn.delay(400).duration(600)}>
              <EliteText style={[s.resultNumber, { color: diffColor }]}>
                {result.years}
              </EliteText>
            </Animated.View>

            <EliteText style={s.resultUnit}>años</EliteText>

            <Animated.View entering={FadeIn.delay(800).duration(400)}>
              <View style={s.resultComparison}>
                <EliteText style={s.resultComparisonText}>
                  Tu edad real: {result.chronologicalAge} años
                </EliteText>
                <View style={[s.resultDiffBadge, { backgroundColor: `${diffColor}20` }]}>
                  <EliteText style={[s.resultDiffText, { color: diffColor }]}>
                    {diffSign}{diff} años
                  </EliteText>
                </View>
              </View>
            </Animated.View>
          </Animated.View>

          {/* Confidence badge */}
          <Animated.View entering={FadeInUp.delay(900).duration(400)}>
            <View style={s.confidenceBadge}>
              <Ionicons
                name={result.confidence === 'alta' ? 'shield-checkmark' : 'shield-half'}
                size={16}
                color={result.confidence === 'alta' ? '#4ade80' : '#fbbf24'}
              />
              <EliteText style={s.confidenceText}>
                Confianza: {result.confidence === 'alta' ? 'Alta' : 'Media'}
                {result.confidence === 'media' && ' — sube con datos de báscula'}
              </EliteText>
            </View>
          </Animated.View>

          {/* Culpables */}
          {result.culpables.length > 0 && (
            <Animated.View entering={FadeInUp.delay(1100).duration(500)}>
              <EliteText style={s.culpablesTitle}>
                Lo que más te está envejeciendo
              </EliteText>

              {result.culpables.map((c, idx) => (
                <Animated.View
                  key={c.factor}
                  entering={FadeInUp.delay(1200 + idx * 150).springify()}
                >
                  <View style={s.culpableCard}>
                    <View style={s.culpableRank}>
                      <EliteText style={s.culpableRankText}>{idx + 1}</EliteText>
                    </View>
                    <View style={s.culpableContent}>
                      <EliteText style={s.culpableLabel}>{c.label}</EliteText>
                      <EliteText style={s.culpableDelta}>
                        +{c.delta.toFixed(1)} años
                      </EliteText>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </Animated.View>
          )}

          {/* No culpables (great result) */}
          {result.culpables.length === 0 && (
            <Animated.View entering={FadeInUp.delay(1100).duration(500)}>
              <View style={s.greatResultCard}>
                <Ionicons name="checkmark-circle" size={28} color="#4ade80" />
                <EliteText style={s.greatResultText}>
                  No se detectaron factores significativos. Tus hábitos están cuidando tu edad biológica.
                </EliteText>
              </View>
            </Animated.View>
          )}

          {/* CTA next step */}
          <Animated.View entering={FadeInUp.delay(1400).duration(500)}>
            <View style={s.ctaCard}>
              <Ionicons name="flask-outline" size={22} color={ATP_BRAND.lime} />
              <EliteText style={s.ctaCardText}>
                ¿Tienes labs? Súbelos en cualquier momento y te calculo el PhenoAge exacto.
              </EliteText>
            </View>
          </Animated.View>

          {/* Disclaimer */}
          <Animated.View entering={FadeIn.delay(1600).duration(400)}>
            <EliteText style={s.disclaimer}>
              Esta es una estimación basada en tus respuestas — no es un diagnóstico médico. El número exacto se calcula con análisis de sangre (PhenoAge).
            </EliteText>
          </Animated.View>

          {/* Continue button */}
          <Animated.View entering={FadeInDown.delay(1700).duration(400)}>
            <AnimatedPressable
              style={[s.primaryBtn, saving && { opacity: 0.6 }]}
              onPress={handlePersistAndContinue}
              disabled={saving}
            >
              <EliteText style={s.primaryBtnText}>
                {saving ? 'GUARDANDO...' : 'CONTINUAR'}
              </EliteText>
              {!saving && <Ionicons name="arrow-forward" size={18} color="#000" />}
            </AnimatedPressable>
          </Animated.View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }
}

// === STYLES ===

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  introBackRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
  },

  // Intro
  introIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(168,224,42,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 16,
  },
  introDesc: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  introBtnWrap: { width: '100%', marginTop: 40 },
  introDisclaimer: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: '#444',
    textAlign: 'center',
    marginTop: 20,
  },

  // Progress header
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
  },
  progressSegmentFilled: {
    backgroundColor: ATP_BRAND.lime,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: Fonts.semiBold,
    color: '#555',
    width: 30,
    textAlign: 'right',
  },

  // Questions
  questionScroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: 24,
  },
  questionText: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#fff',
    lineHeight: 30,
    marginBottom: Spacing.lg,
  },
  optionsWrap: {
    marginTop: Spacing.sm,
  },

  // Numeric inputs (Q4)
  numericSubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#666',
    marginBottom: Spacing.lg,
  },
  numericRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  numericField: {
    flex: 1,
  },
  numericLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: '#888',
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 16,
  },
  numericInput: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSizes.lg,
    fontFamily: Fonts.semiBold,
    color: '#fff',
    textAlign: 'center',
  },

  // Composicion (optional)
  composicionScroll: {
    paddingHorizontal: Spacing.md + 8,
    paddingTop: 40,
  },
  composicionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(168,224,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  composicionTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  composicionDesc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  composicionInput: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: '#fff',
    marginBottom: 8,
  },
  skipBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  skipBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: '#666',
    letterSpacing: 1,
  },

  // Resultado
  resultScroll: {
    paddingHorizontal: Spacing.md + 8,
    paddingTop: 32,
  },
  resultHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
    color: ATP_BRAND.lime,
    letterSpacing: 3,
    marginBottom: 8,
  },
  resultNumber: {
    fontSize: 96,
    fontFamily: Fonts.extraBold,
    lineHeight: 106,
  },
  resultUnit: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.regular,
    color: '#666',
    marginTop: -4,
  },
  resultComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  resultComparisonText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#888',
  },
  resultDiffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  resultDiffText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
  },

  // Confidence
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.pill,
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 32,
  },
  confidenceText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: '#888',
  },

  // Culpables
  culpablesTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginBottom: 12,
  },
  culpableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 14,
  },
  culpableRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  culpableRankText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#ef4444',
  },
  culpableContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  culpableLabel: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: '#fff',
    flex: 1,
  },
  culpableDelta: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#ef4444',
  },

  // Great result (no culpables)
  greatResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0a0a0a',
    borderWidth: 0.5,
    borderColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  greatResultText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#999',
    lineHeight: 18,
  },

  // CTA card
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(168,224,42,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(168,224,42,0.2)',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  ctaCardText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#999',
    lineHeight: 18,
  },

  // Disclaimer
  disclaimer: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: '#444',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.lg,
    paddingVertical: 16,
  },
  primaryBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },

  // Fallback
  fallbackTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
  },
  fallbackDesc: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.regular,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
});
