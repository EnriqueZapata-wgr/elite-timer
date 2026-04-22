/**
 * Test de Braverman — Evaluación clínica de neurotransmisores.
 * 313 preguntas V/F divididas en 2 partes (dominancia + deficiencias).
 * Progreso guardado automáticamente, retomable.
 */
import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Dimensions, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';
import {
  BRAVERMAN_QUESTIONS,
  NEUROTRANSMITTER_META,
  CATEGORY_LABELS,
  SUPPLEMENT_RECOMMENDATIONS,
  getDeficiencyLevel,
  DEFICIENCY_LABELS,
  DEFICIENCY_COLORS,
  type BravermanQuestion,
  type Neurotransmitter,
} from '../src/constants/braverman-questions';

const { width } = Dimensions.get('window');

const PART1 = BRAVERMAN_QUESTIONS.filter(q => q.part === 'dominance');
const PART2 = BRAVERMAN_QUESTIONS.filter(q => q.part === 'deficiency');

type Screen = 'intro' | 'quiz' | 'transition' | 'results';

export default function BravermanTest() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('intro');
  const [currentPart, setCurrentPart] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [resultId, setResultId] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const questions = currentPart === 1 ? PART1 : PART2;
  const currentQ = questions[currentIndex];
  const totalQuestions = PART1.length + PART2.length;
  const answeredTotal = Object.keys(responses).length;

  useEffect(() => { loadUser(); }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    // Retomar test en progreso
    const { data } = await supabase
      .from('braverman_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_complete', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setResultId(data.id);
      setCurrentPart(data.current_part || 1);
      setCurrentIndex(data.current_question || 0);
      setResponses(data.responses || {});
    }
  }

  async function answer(value: boolean) {
    if (!currentQ) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newResponses = { ...responses, [currentQ.id]: value };
    setResponses(newResponses);

    Animated.timing(slideAnim, {
      toValue: value ? width : -width,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(0);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        if ((currentIndex + 1) % 20 === 0) saveProgress(newResponses, currentPart, currentIndex + 1);
      } else if (currentPart === 1) {
        saveProgress(newResponses, 2, 0);
        setCurrentPart(2);
        setCurrentIndex(0);
        setScreen('transition');
      } else {
        calculateResults(newResponses);
      }
    });
  }

  async function saveProgress(resp: Record<string, boolean>, part: number, qIndex: number) {
    if (!userId) return;
    const payload = { user_id: userId, responses: resp, current_part: part, current_question: qIndex, updated_at: new Date().toISOString() };
    if (resultId) {
      await supabase.from('braverman_results').update(payload).eq('id', resultId);
    } else {
      const { data } = await supabase.from('braverman_results').insert(payload).select('id').single();
      if (data) setResultId(data.id);
    }
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // ═══ INTRO ═══
  if (screen === 'intro') {
    const neuros: Neurotransmitter[] = ['dopamine', 'acetylcholine', 'gaba', 'serotonin'];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
        </View>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: 'rgba(192,132,252,0.1)',
            justifyContent: 'center', alignItems: 'center', marginBottom: 24, marginTop: 20,
          }}>
            <Text style={{ fontSize: 48 }}>🧬</Text>
          </View>
          <Text style={{ color: '#c084fc', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>ATP EVALUACION</Text>
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 8 }}>
            Test de Braverman
          </Text>
          <Text style={{ color: '#999', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            Evaluacion clinica de neurotransmisores del Dr. Eric R. Braverman. Descubre tu naturaleza bioquimica dominante y detecta posibles deficiencias.
          </Text>

          <View style={{ marginTop: 24, width: '100%', gap: 8 }}>
            {neuros.map(nt => {
              const meta = NEUROTRANSMITTER_META[nt];
              return (
                <View key={nt} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14,
                  borderLeftWidth: 3, borderLeftColor: meta.color,
                }}>
                  <Text style={{ fontSize: 24 }}>{meta.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{meta.name}</Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>{meta.controls}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{
            backgroundColor: 'rgba(192,132,252,0.06)', borderRadius: 14, padding: 16,
            marginTop: 24, width: '100%',
            borderWidth: 1, borderColor: 'rgba(192,132,252,0.12)',
          }}>
            <Text style={{ color: '#c084fc', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>COMO FUNCIONA</Text>
            <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 20 }}>
              313 preguntas de Cierto/Falso divididas en 2 partes:{'\n'}
              {'\n'}• Parte 1: Tu naturaleza dominante (199 preguntas){'\n'}
              • Parte 2: Tus deficiencias actuales (114 preguntas){'\n'}
              {'\n'}Puedes pausar y retomar en cualquier momento. Tu progreso se guarda automaticamente.{'\n'}
              {'\n'}Responde segun como te sientes LA MAYOR PARTE DEL TIEMPO, no hoy en particular.
            </Text>
          </View>

          <Text style={{ color: '#666', fontSize: 10, textAlign: 'center', marginTop: 16 }}>
            ~15-20 minutos · Basado en "The Edge Effect" del Dr. Eric R. Braverman
          </Text>

          <Pressable
            onPress={() => { setScreen('quiz'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            style={{
              backgroundColor: '#c084fc', borderRadius: 16, padding: 18,
              width: '100%', alignItems: 'center', marginTop: 24,
            }}
          >
            <Text style={{ color: '#000', fontSize: 18, fontWeight: '800' }}>
              {answeredTotal > 0 ? 'CONTINUAR TEST' : 'INICIAR TEST'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ═══ TRANSITION ═══
  if (screen === 'transition') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Text style={{ fontSize: 48, marginBottom: 24 }}>🧬</Text>
        <Text style={{ color: '#c084fc', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>PARTE 1 COMPLETADA</Text>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 8 }}>
          Tu naturaleza dominante esta mapeada
        </Text>
        <Text style={{ color: '#999', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 22 }}>
          Ahora viene la Parte 2: identificar tus deficiencias actuales.{'\n'}
          Responde segun como te sientes AHORA MISMO, no como eres normalmente.
        </Text>
        <Text style={{ color: '#666', fontSize: 12, marginTop: 16 }}>114 preguntas restantes · ~5-8 minutos</Text>
        <Pressable
          onPress={() => { setScreen('quiz'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
          style={{
            backgroundColor: '#c084fc', borderRadius: 16, padding: 16,
            width: '100%', alignItems: 'center', marginTop: 30,
          }}
        >
          <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>CONTINUAR CON PARTE 2</Text>
        </Pressable>
      </View>
    );
  }

  // ═══ QUIZ ═══
  if (screen === 'quiz' && currentQ) {
    const neuroMeta = NEUROTRANSMITTER_META[currentQ.neurotransmitter];
    const categoryLabel = CATEGORY_LABELS[currentQ.category];
    const partLabel = currentPart === 1 ? 'PARTE 1 — DOMINANCIA' : 'PARTE 2 — DEFICIENCIAS';
    const partQuestions = currentPart === 1 ? PART1.length : PART2.length;
    const progressPart = (currentIndex / partQuestions) * 100;
    const progressTotal = (answeredTotal / totalQuestions) * 100;

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={() => {
              saveProgress(responses, currentPart, currentIndex);
              Alert.alert('Progreso guardado', 'Puedes retomar el test cuando quieras.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            }} hitSlop={12}>
              <Ionicons name="close" size={24} color="#999" />
            </Pressable>
            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600' }}>{partLabel}</Text>
            <Text style={{ color: '#c084fc', fontSize: 12, fontWeight: '700' }}>
              {currentIndex + 1}/{partQuestions}
            </Text>
          </View>

          <View style={{ marginTop: 12, gap: 4 }}>
            <View style={{ height: 3, backgroundColor: '#1a1a1a', borderRadius: 2 }}>
              <View style={{ height: 3, backgroundColor: neuroMeta.color, borderRadius: 2, width: `${progressPart}%` }} />
            </View>
            <View style={{ height: 2, backgroundColor: '#0a0a0a', borderRadius: 1 }}>
              <View style={{ height: 2, backgroundColor: '#a8e02a', borderRadius: 1, width: `${progressTotal}%` }} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Text style={{ fontSize: 16 }}>{neuroMeta.emoji}</Text>
            <Text style={{ color: neuroMeta.color, fontSize: 11, fontWeight: '700' }}>{neuroMeta.name}</Text>
            <Text style={{ color: '#444', fontSize: 11 }}>·</Text>
            <Text style={{ color: '#666', fontSize: 11 }}>{categoryLabel}</Text>
          </View>
        </View>

        {/* Question card */}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
          <Animated.View style={{
            transform: [{ translateX: slideAnim }],
            backgroundColor: '#0a0a0a', borderRadius: 24, padding: 32,
            minHeight: 200, justifyContent: 'center',
            borderWidth: 1, borderColor: `${neuroMeta.color}20`,
          }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 30 }}>
              {currentQ.text}
            </Text>
          </Animated.View>
        </View>

        {/* Answer buttons */}
        <View style={{
          flexDirection: 'row', gap: 16,
          paddingHorizontal: 20, paddingBottom: insets.bottom + 20,
        }}>
          <Pressable
            onPress={() => answer(false)}
            style={{
              flex: 1, backgroundColor: 'rgba(239,68,68,0.1)',
              borderRadius: 20, paddingVertical: 20, alignItems: 'center',
              borderWidth: 2, borderColor: 'rgba(239,68,68,0.3)',
            }}
          >
            <Ionicons name="close-circle-outline" size={32} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: '800', marginTop: 6 }}>FALSO</Text>
          </Pressable>

          <Pressable
            onPress={() => answer(true)}
            style={{
              flex: 1, backgroundColor: 'rgba(34,197,94,0.1)',
              borderRadius: 20, paddingVertical: 20, alignItems: 'center',
              borderWidth: 2, borderColor: 'rgba(34,197,94,0.3)',
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={32} color="#22c55e" />
            <Text style={{ color: '#22c55e', fontSize: 16, fontWeight: '800', marginTop: 6 }}>CIERTO</Text>
          </Pressable>
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
      <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16 }}>
          <Text style={{ color: '#c084fc', fontSize: 10, fontWeight: '700', letterSpacing: 2, textAlign: 'center' }}>
            TU PERFIL DE NEUROTRANSMISORES
          </Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 8 }}>
            Test de Braverman
          </Text>

          {/* Dominant nature */}
          <View style={{
            backgroundColor: `${domMeta.color}10`, borderRadius: 20, padding: 24, marginTop: 24,
            borderWidth: 1, borderColor: `${domMeta.color}30`, alignItems: 'center',
          }}>
            <Text style={{ fontSize: 48 }}>{domMeta.emoji}</Text>
            <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 12 }}>
              TU NATURALEZA DOMINANTE
            </Text>
            <Text style={{ color: domMeta.color, fontSize: 28, fontWeight: '800', marginTop: 4 }}>
              {domMeta.name}
            </Text>
            <Text style={{ color: '#ccc', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              {domMeta.dominantTraits}
            </Text>
          </View>

          {/* Dominance bars */}
          <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 24, marginBottom: 12 }}>
            DOMINANCIA
          </Text>
          {neuros.map(nt => {
            const meta = NEUROTRANSMITTER_META[nt];
            const score = scores.dominance[nt];
            const maxPossible = PART1.filter(q => q.neurotransmitter === nt).length;
            const pct = maxPossible > 0 ? (score / maxPossible) * 100 : 0;
            return (
              <View key={nt} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#ccc', fontSize: 13, fontWeight: '600' }}>
                    {meta.emoji} {meta.name}
                  </Text>
                  <Text style={{ color: meta.color, fontSize: 13, fontWeight: '700' }}>
                    {score}/{maxPossible}
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#1a1a1a', borderRadius: 4 }}>
                  <View style={{ height: 8, backgroundColor: meta.color, borderRadius: 4, width: `${pct}%` }} />
                </View>
              </View>
            );
          })}

          {/* Deficiency section */}
          <View style={{
            backgroundColor: `${DEFICIENCY_COLORS[defLevel]}10`, borderRadius: 20, padding: 24, marginTop: 24,
            borderWidth: 1, borderColor: `${DEFICIENCY_COLORS[defLevel]}30`, alignItems: 'center',
          }}>
            <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
              DEFICIENCIA PRINCIPAL
            </Text>
            <Text style={{ color: DEFICIENCY_COLORS[defLevel], fontSize: 22, fontWeight: '800', marginTop: 4 }}>
              {defMeta.name} — {DEFICIENCY_LABELS[defLevel]}
            </Text>
            <Text style={{ color: '#ccc', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              {defMeta.deficientSymptoms}
            </Text>
          </View>

          {/* Deficiency bars */}
          <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 24, marginBottom: 12 }}>
            DEFICIENCIAS
          </Text>
          {neuros.map(nt => {
            const meta = NEUROTRANSMITTER_META[nt];
            const score = scores.deficiency[nt];
            const level = getDeficiencyLevel(score);
            return (
              <View key={nt} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#ccc', fontSize: 13, fontWeight: '600' }}>
                    {meta.emoji} {meta.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: DEFICIENCY_COLORS[level], fontSize: 11, fontWeight: '600' }}>
                      {DEFICIENCY_LABELS[level]}
                    </Text>
                    <Text style={{ color: '#999', fontSize: 13 }}>{score}</Text>
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

          {/* Supplements */}
          {defLevel !== 'none' && (
            <View style={{ marginTop: 24 }}>
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
                SUPLEMENTOS RECOMENDADOS — {defMeta.name.toUpperCase()}
              </Text>
              <Text style={{ color: '#666', fontSize: 11, marginBottom: 12 }}>
                Basado en nivel de deficit: {DEFICIENCY_LABELS[defLevel]}
              </Text>
              {SUPPLEMENT_RECOMMENDATIONS[primaryDef].supplements.map((supp, i) => (
                <View key={i} style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: '#0a0a0a', borderRadius: 10, padding: 12, marginBottom: 4,
                }}>
                  <Text style={{ color: '#ccc', fontSize: 13, flex: 1 }}>{supp.name}</Text>
                  <Text style={{ color: '#a8e02a', fontSize: 13, fontWeight: '700' }}>
                    {supp[defLevel as 'minor' | 'moderate' | 'major'] || supp.minor}
                  </Text>
                </View>
              ))}
              <Text style={{ color: '#444', fontSize: 9, marginTop: 8, textAlign: 'center' }}>
                Consulta a un profesional de salud antes de iniciar suplementacion.
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={{ gap: 10, marginTop: 24 }}>
            <Pressable onPress={() => router.back()} style={{
              backgroundColor: '#a8e02a', borderRadius: 16, padding: 16, alignItems: 'center',
            }}>
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>VOLVER A ATP</Text>
            </Pressable>
            <Pressable onPress={() => {
              setResponses({}); setCurrentPart(1); setCurrentIndex(0);
              setResultId(null); setScreen('intro');
            }} style={{
              backgroundColor: '#0a0a0a', borderRadius: 16, padding: 14, alignItems: 'center',
              borderWidth: 1, borderColor: '#1a1a1a',
            }}>
              <Text style={{ color: '#999', fontSize: 14 }}>Repetir test</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  return null;
}
