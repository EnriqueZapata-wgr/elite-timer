/**
 * Motor de Quiz Funcional — Pantalla reutilizable para los 5 quizzes.
 * Recibe quiz_id por params y carga el quiz correspondiente.
 * Misma UI que Braverman: swipe cards, CIERTO/FALSO, progreso, resultados.
 */
import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Dimensions, Alert, ScrollView, DeviceEventEmitter } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';
import { getQuizById, type FunctionalQuiz, type FunctionalQuestion } from '../src/constants/functional-quizzes';
import { awardBooleanElectron } from '../src/services/electron-service';

const { width } = Dimensions.get('window');

type Screen = 'intro' | 'quiz' | 'results';

export default function FunctionalQuizScreen() {
  const insets = useSafeAreaInsets();
  const { quiz_id } = useLocalSearchParams();
  const quiz = getQuizById(quiz_id as string);

  const [screen, setScreen] = useState<Screen>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [resultId, setResultId] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [showRootCause, setShowRootCause] = useState(false);
  const [lastRootCause, setLastRootCause] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const questions = quiz?.questions ?? [];
  const currentQ = questions[currentIndex];
  const answeredTotal = Object.keys(responses).length;

  useEffect(() => { loadUser(); }, []);

  if (!quiz) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 }}>Quiz no encontrado</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24 }}>
          <Text style={{ color: '#a8e02a', fontSize: 14 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    // Retomar quiz en progreso
    const { data } = await supabase
      .from('functional_quiz_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_id', quiz!.id)
      .eq('is_complete', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setResultId(data.id);
      setCurrentIndex(data.current_question || 0);
      setResponses(data.responses || {});
    }
  }

  function answer(value: boolean) {
    if (!currentQ) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newResponses = { ...responses, [currentQ.id]: value };
    setResponses(newResponses);

    // Mostrar rootCause si respondió CIERTO
    if (value) {
      setLastRootCause(currentQ.rootCause);
      setShowRootCause(true);
      setTimeout(() => setShowRootCause(false), 1500);
    }

    Animated.timing(slideAnim, {
      toValue: value ? width : -width,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(0);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        if ((currentIndex + 1) % 10 === 0) saveProgress(newResponses, currentIndex + 1);
      } else {
        calculateResults(newResponses);
      }
    });
  }

  async function saveProgress(resp: Record<string, boolean>, qIndex: number) {
    if (!userId || !quiz) return;
    const payload = {
      user_id: userId,
      quiz_id: quiz.id,
      responses: resp,
      current_question: qIndex,
      updated_at: new Date().toISOString(),
    };
    if (resultId) {
      await supabase.from('functional_quiz_results').update(payload).eq('id', resultId);
    } else {
      const { data } = await supabase.from('functional_quiz_results').insert(payload).select('id').single();
      if (data) setResultId(data.id);
    }
  }

  async function calculateResults(resp: Record<string, boolean>) {
    if (!quiz) return;
    // Calcular scores por dominio con weight
    const domainScores: Record<string, number> = {};
    for (const q of quiz.questions) {
      if (resp[q.id] === true) {
        domainScores[q.domain] = (domainScores[q.domain] || 0) + q.weight;
      }
    }

    // Filtrar insights que superan threshold
    const activeInsights = quiz.resultInsights.filter(
      insight => (domainScores[insight.domain] || 0) >= insight.threshold
    );

    const payload = {
      domain_scores: domainScores,
      active_insights: activeInsights,
      responses: resp,
      current_question: questions.length,
      is_complete: true,
      completed_at: new Date().toISOString(),
    };

    if (resultId) {
      await supabase.from('functional_quiz_results').update(payload).eq('id', resultId);
    } else {
      await supabase.from('functional_quiz_results').insert({
        user_id: userId,
        quiz_id: quiz.id,
        ...payload,
      });
    }

    // Electrones por completar
    try {
      await awardBooleanElectron(userId, 'functional_quiz' as any);
      DeviceEventEmitter.emit('electrons_changed');
    } catch { /* opcional */ }

    setScreen('results');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // Encontrar el dominio de la pregunta actual para color
  function getDomainColor(domainId: string): string {
    return quiz!.domains.find(d => d.id === domainId)?.color || quiz!.color;
  }

  function getDomainName(domainId: string): string {
    return quiz!.domains.find(d => d.id === domainId)?.name || '';
  }

  // ═══ INTRO ═══
  if (screen === 'intro') {
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
            backgroundColor: `${quiz.color}15`,
            justifyContent: 'center', alignItems: 'center', marginBottom: 24, marginTop: 20,
          }}>
            <Text style={{ fontSize: 48 }}>{quiz.emoji}</Text>
          </View>
          <Text style={{ color: quiz.color, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>ATP EVALUACION</Text>
          <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginTop: 8 }}>
            {quiz.name}
          </Text>
          <Text style={{ color: '#999', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            {quiz.description}
          </Text>

          {/* Dominios */}
          <View style={{ marginTop: 24, width: '100%', gap: 8 }}>
            {quiz.domains.map(domain => (
              <View key={domain.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14,
                borderLeftWidth: 3, borderLeftColor: domain.color,
              }}>
                <View style={{
                  width: 8, height: 8, borderRadius: 4, backgroundColor: domain.color,
                }} />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 }}>
                  {domain.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Cómo funciona */}
          <View style={{
            backgroundColor: `${quiz.color}08`, borderRadius: 14, padding: 16,
            marginTop: 24, width: '100%',
            borderWidth: 1, borderColor: `${quiz.color}15`,
          }}>
            <Text style={{ color: quiz.color, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>COMO FUNCIONA</Text>
            <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 20 }}>
              {quiz.questions.length} preguntas de Cierto/Falso.{'\n'}
              {'\n'}Cada respuesta detecta una CAUSA RAÍZ específica, no solo un síntoma.{'\n'}
              {'\n'}Puedes pausar y retomar en cualquier momento. Tu progreso se guarda automáticamente.{'\n'}
              {'\n'}Responde según como te sientes LA MAYOR PARTE DEL TIEMPO, no hoy en particular.
            </Text>
          </View>

          <Text style={{ color: '#666', fontSize: 10, textAlign: 'center', marginTop: 16 }}>
            ~{quiz.estimatedMinutes} minutos · {quiz.questions.length} preguntas
          </Text>

          <Pressable
            onPress={() => { setScreen('quiz'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            style={{
              backgroundColor: quiz.color, borderRadius: 16, padding: 18,
              width: '100%', alignItems: 'center', marginTop: 24,
            }}
          >
            <Text style={{ color: '#000', fontSize: 18, fontWeight: '800' }}>
              {answeredTotal > 0 ? 'CONTINUAR EVALUACION' : 'INICIAR EVALUACION'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ═══ QUIZ ═══
  if (screen === 'quiz' && currentQ) {
    const domainColor = getDomainColor(currentQ.domain);
    const domainName = getDomainName(currentQ.domain);
    const progress = (currentIndex / questions.length) * 100;
    const progressTotal = (answeredTotal / questions.length) * 100;

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={() => {
              saveProgress(responses, currentIndex);
              Alert.alert('Progreso guardado', 'Puedes retomar la evaluación cuando quieras.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            }} hitSlop={12}>
              <Ionicons name="close" size={24} color="#999" />
            </Pressable>
            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600' }}>{quiz.name.toUpperCase()}</Text>
            <Text style={{ color: quiz.color, fontSize: 12, fontWeight: '700' }}>
              {currentIndex + 1}/{questions.length}
            </Text>
          </View>

          {/* Barras de progreso */}
          <View style={{ marginTop: 12, gap: 4 }}>
            <View style={{ height: 3, backgroundColor: '#1a1a1a', borderRadius: 2 }}>
              <View style={{ height: 3, backgroundColor: domainColor, borderRadius: 2, width: `${progress}%` }} />
            </View>
            <View style={{ height: 2, backgroundColor: '#0a0a0a', borderRadius: 1 }}>
              <View style={{ height: 2, backgroundColor: '#a8e02a', borderRadius: 1, width: `${progressTotal}%` }} />
            </View>
          </View>

          {/* Dominio actual */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: domainColor }} />
            <Text style={{ color: domainColor, fontSize: 11, fontWeight: '700' }}>{domainName}</Text>
            {currentQ.weight === 2 && (
              <>
                <Text style={{ color: '#444', fontSize: 11 }}>·</Text>
                <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '600' }}>RED FLAG</Text>
              </>
            )}
          </View>
        </View>

        {/* Question card */}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
          <Animated.View style={{
            transform: [{ translateX: slideAnim }],
            backgroundColor: '#0a0a0a', borderRadius: 24, padding: 32,
            minHeight: 200, justifyContent: 'center',
            borderWidth: 1, borderColor: `${domainColor}20`,
          }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 30 }}>
              {currentQ.text}
            </Text>
          </Animated.View>

          {/* RootCause flash */}
          {showRootCause && (
            <View style={{
              position: 'absolute', bottom: -80, left: 0, right: 0,
              backgroundColor: 'rgba(168,224,42,0.08)', borderRadius: 12, padding: 12,
              borderWidth: 1, borderColor: 'rgba(168,224,42,0.15)',
              marginHorizontal: 20,
            }}>
              <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>POR QUÉ IMPORTA</Text>
              <Text style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>{lastRootCause}</Text>
            </View>
          )}
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
    // Calcular scores por dominio
    const domainScores: Record<string, number> = {};
    for (const q of quiz.questions) {
      if (responses[q.id] === true) {
        domainScores[q.domain] = (domainScores[q.domain] || 0) + q.weight;
      }
    }

    // Max posible por dominio (sumar todos los weights)
    const maxByDomain: Record<string, number> = {};
    for (const q of quiz.questions) {
      maxByDomain[q.domain] = (maxByDomain[q.domain] || 0) + q.weight;
    }

    // Insights activos
    const activeInsights = quiz.resultInsights.filter(
      insight => (domainScores[insight.domain] || 0) >= insight.threshold
    );

    // Dominio con mayor score relativo
    const topDomain = quiz.domains.reduce((top, d) => {
      const score = domainScores[d.id] || 0;
      const max = maxByDomain[d.id] || 1;
      const pct = score / max;
      return pct > (top.pct || 0) ? { domain: d, pct, score } : top;
    }, { domain: quiz.domains[0], pct: 0, score: 0 });

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16 }}>
          <Text style={{ color: quiz.color, fontSize: 10, fontWeight: '700', letterSpacing: 2, textAlign: 'center' }}>
            RESULTADOS
          </Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 8 }}>
            {quiz.name}
          </Text>

          {/* Resumen principal */}
          {activeInsights.length > 0 ? (
            <View style={{
              backgroundColor: `${topDomain.domain.color}10`, borderRadius: 20, padding: 24, marginTop: 24,
              borderWidth: 1, borderColor: `${topDomain.domain.color}30`, alignItems: 'center',
            }}>
              <Text style={{ fontSize: 48 }}>{quiz.emoji}</Text>
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 12 }}>
                AREA DE MAYOR ATENCION
              </Text>
              <Text style={{ color: topDomain.domain.color, fontSize: 22, fontWeight: '800', marginTop: 4, textAlign: 'center' }}>
                {topDomain.domain.name}
              </Text>
              <Text style={{ color: '#ccc', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                {activeInsights.length} {activeInsights.length === 1 ? 'area requiere' : 'areas requieren'} atención
              </Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 20, padding: 24, marginTop: 24,
              borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', alignItems: 'center',
            }}>
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text style={{ color: '#22c55e', fontSize: 22, fontWeight: '800', marginTop: 12 }}>
                Todo en orden
              </Text>
              <Text style={{ color: '#ccc', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                No se detectaron alertas significativas en esta evaluación
              </Text>
            </View>
          )}

          {/* Barras por dominio */}
          <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 24, marginBottom: 12 }}>
            PUNTAJE POR DOMINIO
          </Text>
          {quiz.domains.map(domain => {
            const score = domainScores[domain.id] || 0;
            const max = maxByDomain[domain.id] || 1;
            const pct = (score / max) * 100;
            const hasAlert = quiz.resultInsights.some(
              i => i.domain === domain.id && score >= i.threshold
            );
            return (
              <View key={domain.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: domain.color }} />
                    <Text style={{ color: '#ccc', fontSize: 13, fontWeight: '600' }}>{domain.name}</Text>
                    {hasAlert && <Ionicons name="warning" size={12} color="#f59e0b" />}
                  </View>
                  <Text style={{ color: domain.color, fontSize: 13, fontWeight: '700' }}>
                    {score}/{max}
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#1a1a1a', borderRadius: 4 }}>
                  <View style={{ height: 8, backgroundColor: domain.color, borderRadius: 4, width: `${pct}%` }} />
                </View>
              </View>
            );
          })}

          {/* Insights activos */}
          {activeInsights.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
                HALLAZGOS Y RECOMENDACIONES
              </Text>
              {activeInsights.map((insight, i) => {
                const domColor = quiz.domains.find(d => d.id === insight.domain)?.color || quiz.color;
                return (
                  <View key={i} style={{
                    backgroundColor: `${domColor}08`, borderRadius: 16, padding: 16, marginBottom: 10,
                    borderWidth: 1, borderColor: `${domColor}15`,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Ionicons name="alert-circle" size={16} color={domColor} />
                      <Text style={{ color: domColor, fontSize: 14, fontWeight: '700', flex: 1 }}>
                        {insight.title}
                      </Text>
                    </View>
                    <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 20, marginBottom: 10 }}>
                      {insight.description}
                    </Text>
                    <View style={{
                      backgroundColor: 'rgba(168,224,42,0.06)', borderRadius: 10, padding: 12,
                      borderWidth: 1, borderColor: 'rgba(168,224,42,0.1)',
                    }}>
                      <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
                        PROTOCOLO SUGERIDO
                      </Text>
                      <Text style={{ color: '#ccc', fontSize: 12, lineHeight: 18 }}>
                        {insight.recommendation}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Descargo */}
          <Text style={{ color: '#444', fontSize: 9, marginTop: 16, textAlign: 'center', lineHeight: 14 }}>
            Esta evaluación es educativa y no sustituye el diagnóstico médico profesional.
            Consulta a un profesional de salud antes de iniciar suplementación.
          </Text>

          {/* Actions */}
          <View style={{ gap: 10, marginTop: 24 }}>
            <Pressable onPress={() => router.back()} style={{
              backgroundColor: '#a8e02a', borderRadius: 16, padding: 16, alignItems: 'center',
            }}>
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>VOLVER A ATP</Text>
            </Pressable>
            <Pressable onPress={() => {
              setResponses({}); setCurrentIndex(0);
              setResultId(null); setScreen('intro');
            }} style={{
              backgroundColor: '#0a0a0a', borderRadius: 16, padding: 14, alignItems: 'center',
              borderWidth: 1, borderColor: '#1a1a1a',
            }}>
              <Text style={{ color: '#999', fontSize: 14 }}>Repetir evaluación</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  return null;
}
