/**
 * Test de Braverman — Evaluación clínica de neurotransmisores.
 * 313 preguntas V/F divididas en 2 partes (dominancia + deficiencias).
 * Progreso guardado automáticamente, retomable.
 */
import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ImageBackground, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { supabase } from '../src/lib/supabase';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { ELEVATION, TEXT, ATP_BRAND, withOpacity } from '@/src/constants/brand';
import { Fonts, Spacing } from '@/constants/theme';
import {
  BRAVERMAN_QUESTIONS,
  NEUROTRANSMITTER_META,
  NEUROTRANSMITTER_PROFILES,
  CATEGORY_LABELS,
  SUPPLEMENT_RECOMMENDATIONS,
  getDeficiencyLevel,
  DEFICIENCY_LABELS,
  DEFICIENCY_COLORS,
  type Neurotransmitter,
} from '../src/constants/braverman-questions';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { advancePosition, retreatPosition, canRetreat } from '@/src/utils/braverman-nav';
import { MedicalDisclaimerGate } from '@/src/components/legal/MedicalDisclaimerGate';

const PART1 = BRAVERMAN_QUESTIONS.filter(q => q.part === 'dominance');
const PART2 = BRAVERMAN_QUESTIONS.filter(q => q.part === 'deficiency');

// Color identidad Braverman (mismo que BRAVERMAN_COLOR en quizzes.tsx)
const BRAVERMAN = '#c084fc';

// Imagen ambient para el fondo cinematic B/N del intro (hebra de ADN)
const AMBIENT_IMG = require('../assets/backgrounds/sangharsh-lohakare-8o_LkMpo8ug-unsplash.jpg');

// Desplazamiento sutil del cross-fade entre preguntas (px)
const CARD_SHIFT = 24;

type Screen = 'intro' | 'quiz' | 'transition' | 'results';

function BravermanTest() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('intro');
  const [currentPart, setCurrentPart] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [resultId, setResultId] = useState<string | null>(null);
  const [userId, setUserId] = useState('');

  // F1.1 (fix flicker): la card NO se re-monta — un solo nodo con cross-fade.
  // El bug anterior: slide de salida + setValue(0) instantáneo en el callback
  // dejaba 1 frame con la pregunta nueva "teletransportada" al centro.
  // Ahora: fade-out + shift sutil → swap de contenido invisible → fade-in
  // desde el lado contrario. transitioningRef bloquea doble-tap mid-animación.
  const cardOpacity = useSharedValue(1);
  const cardShift = useSharedValue(0);
  const transitioningRef = useRef(false);
  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: cardShift.value }],
  }));

  const questions = currentPart === 1 ? PART1 : PART2;
  const currentQ = questions[currentIndex];
  const totalQuestions = PART1.length + PART2.length;
  const answeredTotal = Object.keys(responses).length;
  // F1.2: hay pregunta anterior a la cual volver (dentro de parte o cruzando a Parte 1)
  const canGoBack = canRetreat({ part: currentPart as 1 | 2, index: currentIndex });

  useEffect(() => { loadUser(); }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Primero: verificar si ya tiene test completado → mostrar resultados
    const { data: completed } = await supabase
      .from('braverman_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_complete', true)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (completed) {
      setResponses(completed.responses || {});
      setResultId(completed.id);
      setScreen('results');
      return;
    }

    // Segundo: verificar test en progreso (incompleto)
    const { data: inProgress } = await supabase
      .from('braverman_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_complete', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inProgress) {
      setResultId(inProgress.id);
      setCurrentPart(inProgress.current_part || 1);
      setCurrentIndex(inProgress.current_question || 0);
      setResponses(inProgress.responses || {});
    }
  }

  function releaseTransition() {
    transitioningRef.current = false;
  }

  /** Swap de pregunta con la card invisible + fade-in desde el lado contrario. */
  function fadeInCard(fromDir: 1 | -1) {
    cardShift.value = -fromDir * CARD_SHIFT;
    cardShift.value = withTiming(0, { duration: 160 });
    cardOpacity.value = withTiming(1, { duration: 160 }, (finished) => {
      if (finished) runOnJS(releaseTransition)();
    });
  }

  function advanceAfterFade(newResponses: Record<string, boolean>, dir: 1 | -1) {
    const next = advancePosition({ part: currentPart as 1 | 2, index: currentIndex }, PART1.length, PART2.length);
    if (next.kind === 'question') {
      setCurrentIndex(next.pos.index);
      // F40.10: persistir CADA respuesta. Antes era cada 20 preguntas y
      // si Paty respondía 15 y cerraba la app, perdía las 15 al regresar
      // (vuelta al último múltiplo de 20). Fire-and-forget — la
      // animación corre en paralelo.
      saveProgress(newResponses, next.pos.part, next.pos.index);
      fadeInCard(dir);
    } else if (next.kind === 'transition') {
      saveProgress(newResponses, next.pos.part, next.pos.index);
      setCurrentPart(next.pos.part);
      setCurrentIndex(next.pos.index);
      setScreen('transition');
      cardShift.value = 0;
      cardOpacity.value = 1;
      transitioningRef.current = false;
    } else {
      calculateResults(newResponses);
      cardShift.value = 0;
      cardOpacity.value = 1;
      transitioningRef.current = false;
    }
  }

  function answer(value: boolean) {
    if (!currentQ || transitioningRef.current) return;
    transitioningRef.current = true;
    haptic.light();
    const newResponses = { ...responses, [currentQ.id]: value };
    setResponses(newResponses);
    const dir: 1 | -1 = value ? 1 : -1;
    cardShift.value = withTiming(dir * CARD_SHIFT, { duration: 140 });
    cardOpacity.value = withTiming(0, { duration: 140 }, (finished) => {
      if (finished) runOnJS(advanceAfterFade)(newResponses, dir);
    });
  }

  function retreatAfterFade() {
    const prev = retreatPosition({ part: currentPart as 1 | 2, index: currentIndex }, PART1.length);
    if (!prev) {
      transitioningRef.current = false;
      cardOpacity.value = 1;
      return;
    }
    setCurrentPart(prev.part);
    setCurrentIndex(prev.index);
    saveProgress(responses, prev.part, prev.index);
    fadeInCard(-1);
  }

  /** F1.2: volver a la pregunta anterior. La respuesta previa queda marcada
   * en los botones (responses conserva todo, keyed por id de pregunta). */
  function goBack() {
    if (transitioningRef.current || !canGoBack) return;
    transitioningRef.current = true;
    haptic.light();
    cardShift.value = withTiming(CARD_SHIFT, { duration: 140 });
    cardOpacity.value = withTiming(0, { duration: 140 }, (finished) => {
      if (finished) runOnJS(retreatAfterFade)();
    });
  }

  // F40.10: guard contra inserts duplicados. Como saveProgress se llama por
  // cada respuesta, si las primeras 2 respuestas se disparan antes de que el
  // INSERT inicial retorne con el resultId, ambos saves verían `resultId`
  // null y harían 2 inserts → 2 filas in_progress. El ref bloquea el segundo
  // hasta que el primero asigne el id (después de eso, todos son updates).
  const insertInFlightRef = useRef<Promise<void> | null>(null);

  async function saveProgress(resp: Record<string, boolean>, part: number, qIndex: number) {
    if (!userId) return;
    const payload = { user_id: userId, responses: resp, current_part: part, current_question: qIndex, updated_at: new Date().toISOString() };
    if (resultId) {
      // Fire-and-forget — no bloqueamos el caller con el await de Supabase.
      supabase.from('braverman_results').update(payload).eq('id', resultId)
        .then(({ error }) => { if (error) console.warn('Braverman save error:', error.message); });
      return;
    }
    // Sin resultId aún. Si ya hay un insert in-flight, esperamos a que el
    // resultId quede asignado y luego re-llamamos (ahora caerá en la rama
    // de update).
    if (insertInFlightRef.current) {
      await insertInFlightRef.current;
      return saveProgress(resp, part, qIndex);
    }
    insertInFlightRef.current = (async () => {
      try {
        const { data } = await supabase.from('braverman_results').insert(payload).select('id').single();
        if (data) setResultId(data.id);
      } catch (e: any) {
        console.warn('Braverman insert error:', e?.message);
      } finally {
        insertInFlightRef.current = null;
      }
    })();
    await insertInFlightRef.current;
  }

  async function calculateResults(resp: Record<string, boolean>) {
    const scores = {
      dominance: { dopamine: 0, acetylcholine: 0, gaba: 0, serotonin: 0 },
      deficiency: { dopamine: 0, acetylcholine: 0, gaba: 0, serotonin: 0 },
    };
    for (const q of BRAVERMAN_QUESTIONS) {
      if (resp[q.id] === true) scores[q.part][q.neurotransmitter]++;
    }

    const neuros: Neurotransmitter[] = ['dopamine', 'acetylcholine', 'gaba', 'serotonin'];
    const domEntries = neuros.map(n => ({ n, s: scores.dominance[n] })).sort((a, b) => b.s - a.s);
    const defEntries = neuros.map(n => ({ n, s: scores.deficiency[n] })).sort((a, b) => b.s - a.s);
    const dominantType = domEntries[0].n;
    const primaryDeficiency = defEntries[0].n;
    const defLevel = getDeficiencyLevel(defEntries[0].s);

    const payload = {
      dominance_dopamine: scores.dominance.dopamine,
      dominance_acetylcholine: scores.dominance.acetylcholine,
      dominance_gaba: scores.dominance.gaba,
      dominance_serotonin: scores.dominance.serotonin,
      dominant_type: dominantType,
      deficiency_dopamine: scores.deficiency.dopamine,
      deficiency_acetylcholine: scores.deficiency.acetylcholine,
      deficiency_gaba: scores.deficiency.gaba,
      deficiency_serotonin: scores.deficiency.serotonin,
      primary_deficiency: primaryDeficiency,
      deficiency_level: defLevel,
      responses: resp,
      current_part: 2,
      current_question: PART2.length,
      is_complete: true,
      completed_at: new Date().toISOString(),
    };

    if (resultId) {
      await supabase.from('braverman_results').update(payload).eq('id', resultId);
    } else {
      await supabase.from('braverman_results').insert({ user_id: userId, ...payload });
    }
    setScreen('results');
    haptic.success();
  }

  // ═══ INTRO ═══
  if (screen === 'intro') {
    const neuros: Neurotransmitter[] = ['dopamine', 'acetylcholine', 'gaba', 'serotonin'];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: ELEVATION[0].bg }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero cinematic: imagen ambient (ADN) bajo overlay fuerte → lee B/N */}
        <ImageBackground source={AMBIENT_IMG} style={{ width: '100%' }} imageStyle={{ opacity: 0.55 }}>
          <LinearGradient
            colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.45)', '#000']}
            style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: Spacing.xl }}
          >
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
            </Pressable>
            <View style={{ alignItems: 'center', marginTop: Spacing.xl }}>
              <Text style={{ fontSize: 44 }}>🧬</Text>
              <Text style={{
                color: BRAVERMAN, fontSize: 11, fontFamily: Fonts.semiBold,
                letterSpacing: 2, marginTop: Spacing.md,
              }}>
                ATP EVALUACIÓN
              </Text>
              <Text style={{
                color: TEXT.primary, fontSize: 30, fontFamily: Fonts.extraBold,
                textAlign: 'center', marginTop: 4,
              }}>
                Test de Braverman
              </Text>
              <Text style={{
                color: '#bbb', fontSize: 14, fontFamily: Fonts.regular,
                textAlign: 'center', marginTop: 8, lineHeight: 22, maxWidth: 320,
              }}>
                Evaluación clínica de neurotransmisores del Dr. Eric R. Braverman. Descubre tu naturaleza bioquímica dominante y detecta posibles deficiencias.
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ width: '100%', gap: 8 }}>
            {neuros.map((nt, i) => {
              const meta = NEUROTRANSMITTER_META[nt];
              return (
                <Animated.View
                  key={nt}
                  entering={FadeInDown.delay(i * 60).springify()}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: ELEVATION[1].bg, borderRadius: 14, padding: 14,
                    borderWidth: 1, borderColor: ELEVATION[1].border,
                    borderLeftWidth: 3, borderLeftColor: meta.color,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{meta.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: TEXT.primary, fontSize: 14, fontFamily: Fonts.semiBold }}>{meta.name}</Text>
                    <Text style={{ color: TEXT.tertiary, fontSize: 11, fontFamily: Fonts.regular }}>{meta.controls}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          <View style={{
            backgroundColor: ELEVATION[1].bg, borderRadius: 16, padding: Spacing.md,
            marginTop: Spacing.lg, width: '100%',
            borderWidth: 1, borderColor: ELEVATION[1].border,
          }}>
            <Text style={{
              color: BRAVERMAN, fontSize: 11, fontFamily: Fonts.semiBold,
              letterSpacing: 2, marginBottom: 8,
            }}>
              CÓMO FUNCIONA
            </Text>
            <Text style={{ color: '#ccc', fontSize: 13, fontFamily: Fonts.regular, lineHeight: 21 }}>
              313 preguntas de Cierto/Falso divididas en 2 partes:{'\n'}
              {'\n'}• Parte 1: Tu naturaleza dominante (199 preguntas){'\n'}
              • Parte 2: Tus deficiencias actuales (114 preguntas){'\n'}
              {'\n'}Puedes pausar y retomar en cualquier momento. Tu progreso se guarda automáticamente.{'\n'}
              {'\n'}Responde según cómo te sientes LA MAYOR PARTE DEL TIEMPO, no hoy en particular.
            </Text>
          </View>

          <Text style={{
            color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.regular,
            textAlign: 'center', marginTop: Spacing.md,
          }}>
            ~15-20 minutos · Basado en {'“'}The Edge Effect{'”'} del Dr. Eric R. Braverman
          </Text>

          <AnimatedPressable
            onPress={() => { setScreen('quiz'); haptic.medium(); }}
            style={{
              backgroundColor: ATP_BRAND.lime, borderRadius: 16, padding: 18,
              width: '100%', alignItems: 'center', marginTop: Spacing.lg,
            }}
          >
            <Text style={{ color: '#000', fontSize: 17, fontFamily: Fonts.extraBold }}>
              {answeredTotal > 0 ? 'CONTINUAR TEST' : 'INICIAR TEST'}
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    );
  }

  // ═══ TRANSITION ═══
  if (screen === 'transition') {
    return (
      <View style={{ flex: 1, backgroundColor: ELEVATION[0].bg, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Animated.View entering={FadeInDown.duration(400).springify()} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: Spacing.lg }}>🧬</Text>
          <Text style={{ color: BRAVERMAN, fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 2 }}>
            PARTE 1 COMPLETADA
          </Text>
          <Text style={{
            color: TEXT.primary, fontSize: 24, fontFamily: Fonts.extraBold,
            textAlign: 'center', marginTop: 8,
          }}>
            Tu naturaleza dominante está mapeada
          </Text>
          <Text style={{
            color: TEXT.secondary, fontSize: 14, fontFamily: Fonts.regular,
            textAlign: 'center', marginTop: 12, lineHeight: 22,
          }}>
            Ahora viene la Parte 2: identificar tus deficiencias actuales.{'\n'}
            Responde según cómo te sientes AHORA MISMO, no cómo eres normalmente.
          </Text>
          <Text style={{ color: TEXT.tertiary, fontSize: 12, fontFamily: Fonts.regular, marginTop: Spacing.md }}>
            114 preguntas restantes · ~5-8 minutos
          </Text>
        </Animated.View>
        <AnimatedPressable
          onPress={() => { setScreen('quiz'); haptic.medium(); }}
          style={{
            backgroundColor: ATP_BRAND.lime, borderRadius: 16, padding: 16,
            width: '100%', alignItems: 'center', marginTop: 30,
          }}
        >
          <Text style={{ color: '#000', fontSize: 16, fontFamily: Fonts.extraBold }}>CONTINUAR CON PARTE 2</Text>
        </AnimatedPressable>
      </View>
    );
  }

  // ═══ QUIZ ═══
  if (screen === 'quiz' && currentQ) {
    const neuroMeta = NEUROTRANSMITTER_META[currentQ.neurotransmitter];
    const categoryLabel = CATEGORY_LABELS[currentQ.category];
    const partLabel = currentPart === 1 ? 'PARTE 1 — DOMINANCIAS' : 'PARTE 2 — DEFICIENCIAS';
    const partQuestions = currentPart === 1 ? PART1.length : PART2.length;
    const progressPart = (currentIndex / partQuestions) * 100;
    const progressTotal = (answeredTotal / totalQuestions) * 100;
    // F1.2: si el usuario volvió atrás, su respuesta previa queda marcada
    const prevAnswer = responses[currentQ.id];

    const answerBtn = (value: boolean, icon: 'close-circle-outline' | 'checkmark-circle-outline', color: string, label: string) => {
      const selected = prevAnswer === value;
      return (
        <AnimatedPressable
          onPress={() => answer(value)}
          style={{
            flex: 1,
            backgroundColor: selected ? withOpacity(color, 0.12) : ELEVATION[1].bg,
            borderRadius: 20, paddingVertical: 20, alignItems: 'center',
            borderWidth: 1.5,
            borderColor: selected ? withOpacity(color, 0.6) : ELEVATION[1].border,
          }}
        >
          <Ionicons name={icon} size={32} color={color} />
          <Text style={{ color: selected ? color : TEXT.primary, fontSize: 16, fontFamily: Fonts.bold, marginTop: 6 }}>
            {label}
          </Text>
        </AnimatedPressable>
      );
    };

    return (
      <View style={{ flex: 1, backgroundColor: ELEVATION[0].bg }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={() => {
              saveProgress(responses, currentPart, currentIndex);
              Alert.alert('Progreso guardado', 'Puedes retomar el test cuando quieras.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            }} hitSlop={12}>
              <Ionicons name="close" size={24} color={TEXT.secondary} />
            </Pressable>
            <Text style={{ color: TEXT.secondary, fontSize: 11, fontFamily: Fonts.semiBold, letterSpacing: 1 }}>
              {partLabel}
            </Text>
            <Text style={{ color: BRAVERMAN, fontSize: 12, fontFamily: Fonts.bold }}>
              {currentIndex + 1}/{partQuestions}
            </Text>
          </View>

          {/* Progress minimal: parte (color del neurotransmisor) + total (lima) */}
          <View style={{ marginTop: 12, gap: 4 }}>
            <View style={{ height: 3, backgroundColor: '#1a1a1a', borderRadius: 2 }}>
              <View style={{ height: 3, backgroundColor: neuroMeta.color, borderRadius: 2, width: `${progressPart}%` }} />
            </View>
            <View style={{ height: 2, backgroundColor: '#0a0a0a', borderRadius: 1 }}>
              <View style={{ height: 2, backgroundColor: ATP_BRAND.lime, borderRadius: 1, width: `${progressTotal}%` }} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Text style={{ fontSize: 16 }}>{neuroMeta.emoji}</Text>
            <Text style={{ color: neuroMeta.color, fontSize: 11, fontFamily: Fonts.semiBold }}>{neuroMeta.name}</Text>
            <Text style={{ color: TEXT.muted, fontSize: 11 }}>·</Text>
            <Text style={{ color: TEXT.tertiary, fontSize: 11, fontFamily: Fonts.regular }}>{categoryLabel}</Text>
          </View>
        </View>

        {/* Question card — pieza aislada con aire, cross-fade entre preguntas */}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
          <Animated.View style={[cardAnimStyle, {
            backgroundColor: ELEVATION[1].bg, borderRadius: 24, padding: 32,
            minHeight: 220, justifyContent: 'center',
            borderWidth: 1, borderColor: ELEVATION[1].border,
          }]}>
            <Text style={{
              color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.semiBold,
              letterSpacing: 2, textAlign: 'center', marginBottom: Spacing.md,
            }}>
              PREGUNTA {currentIndex + 1}
            </Text>
            <Text style={{
              color: TEXT.primary, fontSize: 21, fontFamily: Fonts.semiBold,
              textAlign: 'center', lineHeight: 32,
            }}>
              {currentQ.text}
            </Text>
          </Animated.View>

          {/* F1.2: volver a la pregunta anterior (conserva la respuesta marcada) */}
          {canGoBack && (
            <AnimatedPressable
              onPress={goBack}
              hitSlop={8}
              style={{
                flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
                gap: 6, marginTop: Spacing.md, paddingVertical: 8, paddingHorizontal: 16,
              }}
            >
              <Ionicons name="chevron-back" size={16} color={TEXT.secondary} />
              <Text style={{ color: TEXT.secondary, fontSize: 13, fontFamily: Fonts.semiBold }}>
                Pregunta anterior
              </Text>
            </AnimatedPressable>
          )}
        </View>

        {/* Answer buttons */}
        <View style={{
          flexDirection: 'row', gap: 16,
          paddingHorizontal: 20, paddingBottom: insets.bottom + 20,
        }}>
          {answerBtn(false, 'close-circle-outline', '#ef4444', 'FALSO')}
          {answerBtn(true, 'checkmark-circle-outline', '#22c55e', 'CIERTO')}
        </View>
      </View>
    );
  }

  // ═══ RESULTS ═══
  if (screen === 'results') {
    const scores = {
      dominance: { dopamine: 0, acetylcholine: 0, gaba: 0, serotonin: 0 },
      deficiency: { dopamine: 0, acetylcholine: 0, gaba: 0, serotonin: 0 },
    };
    for (const q of BRAVERMAN_QUESTIONS) {
      if (responses[q.id] === true) scores[q.part][q.neurotransmitter]++;
    }

    const neuros: Neurotransmitter[] = ['dopamine', 'acetylcholine', 'gaba', 'serotonin'];
    const maxDom = Math.max(...neuros.map(n => scores.dominance[n]));
    const maxDef = Math.max(...neuros.map(n => scores.deficiency[n]));
    const dominantType = neuros.find(n => scores.dominance[n] === maxDom) || 'dopamine';
    const primaryDef = neuros.find(n => scores.deficiency[n] === maxDef) || 'dopamine';
    const defLevel = getDeficiencyLevel(maxDef);
    const domMeta = NEUROTRANSMITTER_META[dominantType];
    const defMeta = NEUROTRANSMITTER_META[primaryDef];

    return (
      <ScrollView style={{ flex: 1, backgroundColor: ELEVATION[0].bg }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16 }}>
          {/* Reveal editorial: cada sección entra en fade + desplazamiento sutil */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={{
              color: BRAVERMAN, fontSize: 11, fontFamily: Fonts.semiBold,
              letterSpacing: 2, textAlign: 'center',
            }}>
              TU PERFIL DE NEUROTRANSMISORES
            </Text>
            <Text style={{
              color: TEXT.primary, fontSize: 28, fontFamily: Fonts.extraBold,
              textAlign: 'center', marginTop: 8,
            }}>
              Test de Braverman
            </Text>
          </Animated.View>

          {/* Dominant nature — el protagonista de la pantalla */}
          <Animated.View entering={FadeInDown.delay(120).springify()} style={{
            backgroundColor: withOpacity(domMeta.color, 0.06), borderRadius: 20, padding: 24, marginTop: Spacing.lg,
            borderWidth: 1, borderColor: withOpacity(domMeta.color, 0.2), alignItems: 'center',
          }}>
            <Text style={{ fontSize: 48 }}>{domMeta.emoji}</Text>
            <Text style={{
              color: TEXT.secondary, fontSize: 10, fontFamily: Fonts.semiBold,
              letterSpacing: 2, marginTop: 12,
            }}>
              TU NATURALEZA DOMINANTE
            </Text>
            <Text style={{ color: domMeta.color, fontSize: 28, fontFamily: Fonts.extraBold, marginTop: 4 }}>
              {domMeta.name}
            </Text>
            <Text style={{
              color: '#ccc', fontSize: 13, fontFamily: Fonts.regular,
              textAlign: 'center', marginTop: 8, lineHeight: 20,
            }}>
              {domMeta.dominantTraits}
            </Text>
          </Animated.View>

          {/* #90: Reporte PREMIUM ARGOS — análisis profundo generado por IA */}
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <AnimatedPressable
              onPress={() => { haptic.medium(); router.push('/braverman-premium' as any); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: withOpacity('#A8E02A', 0.08), borderRadius: 16,
                borderWidth: 1, borderColor: withOpacity('#A8E02A', 0.3),
                padding: 16, marginTop: Spacing.md,
              }}
            >
              <Text style={{ fontSize: 24 }}>🧠</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#A8E02A', fontSize: 14, fontFamily: Fonts.bold }}>
                  Reporte PREMIUM ARGOS
                </Text>
                <Text style={{ color: '#999', fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 }}>
                  Análisis profundo de tus 4 naturalezas + plan específico
                </Text>
              </View>
              <Text style={{ color: '#A8E02A', fontSize: 16 }}>→</Text>
            </AnimatedPressable>
          </Animated.View>

          {/* Dominance bars */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={{
            color: TEXT.secondary, fontSize: 10, fontFamily: Fonts.semiBold,
            letterSpacing: 2, marginTop: Spacing.lg, marginBottom: 12,
          }}>
            DOMINANCIAS
          </Text>
          {neuros.map(nt => {
            const meta = NEUROTRANSMITTER_META[nt];
            const score = scores.dominance[nt];
            const maxPossible = PART1.filter(q => q.neurotransmitter === nt).length;
            const pct = maxPossible > 0 ? (score / maxPossible) * 100 : 0;
            return (
              <View key={nt} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#ccc', fontSize: 13, fontFamily: Fonts.semiBold }}>
                    {meta.emoji} {meta.name}
                  </Text>
                  <Text style={{ color: meta.color, fontSize: 13, fontFamily: Fonts.bold }}>
                    {score}/{maxPossible}
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#1a1a1a', borderRadius: 4 }}>
                  <View style={{ height: 8, backgroundColor: meta.color, borderRadius: 4, width: `${pct}%` }} />
                </View>
              </View>
            );
          })}
          </Animated.View>

          {/* Deficiency section */}
          <Animated.View entering={FadeInDown.delay(280).springify()} style={{
            backgroundColor: withOpacity(DEFICIENCY_COLORS[defLevel], 0.06), borderRadius: 20, padding: 24, marginTop: Spacing.lg,
            borderWidth: 1, borderColor: withOpacity(DEFICIENCY_COLORS[defLevel], 0.2), alignItems: 'center',
          }}>
            <Text style={{ color: TEXT.secondary, fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 2 }}>
              DEFICIENCIA PRINCIPAL
            </Text>
            <Text style={{ color: DEFICIENCY_COLORS[defLevel], fontSize: 22, fontFamily: Fonts.extraBold, marginTop: 4 }}>
              {defMeta.name} — {DEFICIENCY_LABELS[defLevel]}
            </Text>
            <Text style={{
              color: '#ccc', fontSize: 13, fontFamily: Fonts.regular,
              textAlign: 'center', marginTop: 8, lineHeight: 20,
            }}>
              {defMeta.deficientSymptoms}
            </Text>
          </Animated.View>

          {/* Deficiency bars */}
          <Animated.View entering={FadeInDown.delay(360).springify()}>
          <Text style={{
            color: TEXT.secondary, fontSize: 10, fontFamily: Fonts.semiBold,
            letterSpacing: 2, marginTop: Spacing.lg, marginBottom: 12,
          }}>
            DEFICIENCIAS
          </Text>
          {neuros.map(nt => {
            const meta = NEUROTRANSMITTER_META[nt];
            const score = scores.deficiency[nt];
            const level = getDeficiencyLevel(score);
            return (
              <View key={nt} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#ccc', fontSize: 13, fontFamily: Fonts.semiBold }}>
                    {meta.emoji} {meta.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: DEFICIENCY_COLORS[level], fontSize: 11, fontFamily: Fonts.semiBold }}>
                      {DEFICIENCY_LABELS[level]}
                    </Text>
                    <Text style={{ color: TEXT.secondary, fontSize: 13, fontFamily: Fonts.regular }}>{score}</Text>
                  </View>
                </View>
                <View style={{ height: 6, backgroundColor: '#1a1a1a', borderRadius: 3 }}>
                  <View style={{
                    height: 6, borderRadius: 3,
                    backgroundColor: DEFICIENCY_COLORS[level],
                    width: `${Math.min((score / 25) * 100, 100)}%`,
                  }} />
                </View>
              </View>
            );
          })}
          </Animated.View>

          {/* PERFIL DETALLADO */}
          <Animated.View entering={FadeInDown.delay(440).springify()} style={{ marginTop: Spacing.lg }}>
            <Text style={{
              color: TEXT.secondary, fontSize: 10, fontFamily: Fonts.semiBold,
              letterSpacing: 2, marginBottom: 12,
            }}>
              TU PERFIL DETALLADO
            </Text>

            {/* Naturaleza dominante — descripción completa */}
            <View style={{
              backgroundColor: ELEVATION[1].bg, borderRadius: 16, padding: 20, marginBottom: 12,
              borderWidth: 1, borderColor: ELEVATION[1].border,
              borderLeftWidth: 3, borderLeftColor: domMeta.color,
            }}>
              <Text style={{ color: domMeta.color, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}>
                {domMeta.emoji} Naturaleza {domMeta.name}
              </Text>
              <Text style={{ color: '#ccc', fontSize: 13, fontFamily: Fonts.regular, lineHeight: 21 }}>
                {NEUROTRANSMITTER_PROFILES[dominantType].fullDescription}
              </Text>
            </View>

            {/* Deficiencia principal — síntomas + por qué importa */}
            {defLevel !== 'none' && (
              <View style={{
                backgroundColor: ELEVATION[1].bg, borderRadius: 16, padding: 20, marginBottom: 12,
                borderWidth: 1, borderColor: ELEVATION[1].border,
                borderLeftWidth: 3, borderLeftColor: DEFICIENCY_COLORS[defLevel],
              }}>
                <Text style={{ color: DEFICIENCY_COLORS[defLevel], fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}>
                  Deficiencia de {defMeta.name}
                </Text>
                <Text style={{ color: '#ccc', fontSize: 13, fontFamily: Fonts.regular, lineHeight: 21, marginBottom: 12 }}>
                  {NEUROTRANSMITTER_PROFILES[primaryDef].deficiencyDetail}
                </Text>
                <Text style={{ color: TEXT.secondary, fontSize: 11, fontFamily: Fonts.semiBold, marginBottom: 8 }}>
                  PROBLEMAS ASOCIADOS:
                </Text>
                <Text style={{ color: TEXT.secondary, fontSize: 12, fontFamily: Fonts.regular, lineHeight: 20 }}>
                  {NEUROTRANSMITTER_PROFILES[primaryDef].associatedProblems}
                </Text>
              </View>
            )}

            {/* Balance general */}
            <View style={{
              backgroundColor: withOpacity(ATP_BRAND.lime, 0.06), borderRadius: 16, padding: 20,
              borderWidth: 1, borderColor: withOpacity(ATP_BRAND.lime, 0.1),
            }}>
              <Text style={{ color: ATP_BRAND.lime, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}>
                ¿Qué significa para tu salud?
              </Text>
              <Text style={{ color: '#ccc', fontSize: 13, fontFamily: Fonts.regular, lineHeight: 21 }}>
                Tu cerebro tiene naturaleza {domMeta.name.toLowerCase()} ({domMeta.controls.toLowerCase()}).
                {defLevel !== 'none' ? ` Tu deficiencia principal en ${defMeta.name.toLowerCase()} puede estar causando: ${defMeta.deficientSymptoms.toLowerCase()}.` : ''}
                {'\n\n'}ARGOS usará este perfil para personalizar tus recomendaciones de suplementos, nutrición, ejercicio y protocolos.
              </Text>
            </View>
          </Animated.View>

          {/* PLAN DE SUPLEMENTOS INTEGRADO */}
          <Animated.View entering={FadeInDown.delay(520).springify()} style={{ marginTop: Spacing.lg }}>
            <Text style={{
              color: TEXT.secondary, fontSize: 10, fontFamily: Fonts.semiBold,
              letterSpacing: 2, marginBottom: 12,
            }}>
              PLAN DE SUPLEMENTOS PERSONALIZADO
            </Text>
            <Text style={{ color: TEXT.tertiary, fontSize: 11, fontFamily: Fonts.regular, marginBottom: 16 }}>
              Basado en TODAS tus deficiencias, no solo la principal
            </Text>

            {neuros.map(nt => {
              const score = scores.deficiency[nt];
              const level = getDeficiencyLevel(score);
              if (level === 'none') return null;

              const meta = NEUROTRANSMITTER_META[nt];
              const supps = SUPPLEMENT_RECOMMENDATIONS[nt];

              return (
                <View key={nt} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                    <Text style={{ color: meta.color, fontSize: 13, fontFamily: Fonts.bold }}>
                      {meta.name} — {DEFICIENCY_LABELS[level]}
                    </Text>
                  </View>
                  {supps.supplements.slice(0, 4).map((supp, i) => (
                    <View key={i} style={{
                      flexDirection: 'row', justifyContent: 'space-between',
                      backgroundColor: ELEVATION[1].bg, borderRadius: 8, padding: 10, marginBottom: 3,
                      borderWidth: 1, borderColor: ELEVATION[1].border,
                    }}>
                      <Text style={{ color: '#ccc', fontSize: 12, fontFamily: Fonts.regular, flex: 1 }}>{supp.name}</Text>
                      <Text style={{ color: ATP_BRAND.lime, fontSize: 12, fontFamily: Fonts.semiBold }}>
                        {supp[level as 'minor' | 'moderate' | 'major'] || supp.minor}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}

            <View style={{
              backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 12, padding: 14, marginTop: 8,
            }}>
              <Text style={{ color: '#fbbf24', fontSize: 11, fontFamily: Fonts.regular }}>
                ⚠️ Los suplementos se pueden superponer entre deficiencias. Consulta a un profesional de salud para un plan personalizado que evite duplicidades y considere interacciones.
              </Text>
            </View>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(600).springify()} style={{ gap: 10, marginTop: Spacing.lg }}>
            <AnimatedPressable onPress={() => router.back()} style={{
              backgroundColor: ATP_BRAND.lime, borderRadius: 16, padding: 16, alignItems: 'center',
            }}>
              <Text style={{ color: '#000', fontSize: 16, fontFamily: Fonts.extraBold }}>VOLVER A ATP</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => {
              setResponses({}); setCurrentPart(1); setCurrentIndex(0);
              setResultId(null); setScreen('intro');
            }} style={{
              backgroundColor: ELEVATION[1].bg, borderRadius: 16, padding: 14, alignItems: 'center',
              borderWidth: 1, borderColor: ELEVATION[1].border,
            }}>
              <Text style={{ color: TEXT.secondary, fontSize: 14, fontFamily: Fonts.semiBold }}>Repetir test</Text>
            </AnimatedPressable>
          </Animated.View>
        </View>
        <MedicalDisclaimer feature="braverman" />
      </ScrollView>
    );
  }

  return null;
}

// #42: gate de disclaimers médicos — modal en primera visita (o bump de versión).
export default function BravermanTestGated() {
  return (
    <MedicalDisclaimerGate>
      <BravermanTest />
    </MedicalDisclaimerGate>
  );
}
