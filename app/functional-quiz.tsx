/**
 * Motor de Quiz Funcional — Pantalla reutilizable para los 5 quizzes.
 * Recibe quiz_id por params y carga el quiz correspondiente.
 * CIERTO/FALSO, progreso, resultados.
 */
import { useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, ScrollView, DeviceEventEmitter } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';
import { getQuizById } from '../src/constants/functional-quizzes';
import { awardBooleanElectron } from '../src/services/electron-service';

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
  const [showDetail, setShowDetail] = useState(false);

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

    // Primero: verificar si ya completó este quiz → mostrar resultados
    const { data: completed } = await supabase
      .from('functional_quiz_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_id', quiz!.id)
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

    // Segundo: verificar quiz en progreso (incompleto)
    const { data: inProgress } = await supabase
      .from('functional_quiz_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_id', quiz!.id)
      .eq('is_complete', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inProgress) {
      setResultId(inProgress.id);
      setCurrentIndex(inProgress.current_question || 0);
      setResponses(inProgress.responses || {});
    }
  }

  function answer(value: boolean) {
    if (!currentQ) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newResponses = { ...responses, [currentQ.id]: value };
    setResponses(newResponses);

    // Transición inmediata — sin animación
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      if ((currentIndex + 1) % 10 === 0) saveProgress(newResponses, currentIndex + 1);
    } else {
      // SOLO cuando es la última pregunta
      calculateResults(newResponses);
    }
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
    const domainScores: Record<string, number> = {};
    for (const q of quiz.questions) {
      if (resp[q.id] === true) {
        domainScores[q.domain] = (domainScores[q.domain] || 0) + q.weight;
      }
    }

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

    try {
      await awardBooleanElectron(userId, 'functional_quiz' as any);
      DeviceEventEmitter.emit('electrons_changed');
    } catch { /* opcional */ }

    setScreen('results');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

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
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: domain.color }} />
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
    const progress = ((currentIndex + 1) / questions.length) * 100;

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

          {/* Barra de progreso */}
          <View style={{ marginTop: 12 }}>
            <View style={{ height: 3, backgroundColor: '#1a1a1a', borderRadius: 2 }}>
              <View style={{ height: 3, backgroundColor: domainColor, borderRadius: 2, width: `${progress}%` }} />
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

        {/* Question card — render directo, sin animación */}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20 }}>
          <View style={{
            backgroundColor: '#0a0a0a', borderRadius: 24, padding: 32,
            minHeight: 200, justifyContent: 'center',
            borderWidth: 1, borderColor: `${domainColor}20`,
          }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', textAlign: 'center', lineHeight: 30 }}>
              {currentQ.text}
            </Text>
          </View>
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
    const domainScores: Record<string, number> = {};
    for (const q of quiz.questions) {
      if (responses[q.id] === true) {
        domainScores[q.domain] = (domainScores[q.domain] || 0) + q.weight;
      }
    }

    const activeInsights = quiz.resultInsights.filter(
      insight => (domainScores[insight.domain] || 0) >= insight.threshold
    );

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16 }}>
          <Text style={{ color: quiz.color, fontSize: 10, fontWeight: '700', letterSpacing: 2, textAlign: 'center' }}>
            RESULTADOS
          </Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 8 }}>
            {quiz.name}
          </Text>

          {/* Resultado principal */}
          <View style={{
            backgroundColor: activeInsights.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
            borderRadius: 20, padding: 24, alignItems: 'center', marginTop: 24,
            borderWidth: 1,
            borderColor: activeInsights.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
          }}>
            <Ionicons
              name={activeInsights.length > 0 ? 'warning-outline' : 'checkmark-circle-outline'}
              size={48}
              color={activeInsights.length > 0 ? '#fb7185' : '#22c55e'}
            />
            <Text style={{
              color: activeInsights.length > 0 ? '#fb7185' : '#22c55e',
              fontSize: 22, fontWeight: '800', marginTop: 12,
            }}>
              {activeInsights.length > 0
                ? `${activeInsights.length} área${activeInsights.length > 1 ? 's' : ''} de atención`
                : 'Todo en orden'}
            </Text>
            <Text style={{ color: '#999', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
              {activeInsights.length > 0
                ? 'ARGOS detectó patrones que vale la pena atender'
                : 'No se detectaron alertas significativas en esta evaluación'}
            </Text>
          </View>

          {/* Insights activos — QUÉ DETECTAMOS */}
          {activeInsights.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
                QUÉ DETECTAMOS
              </Text>
              {activeInsights.map((insight, i) => {
                const domColor = getDomainColor(insight.domain);
                return (
                  <View key={i} style={{
                    backgroundColor: '#0a0a0a', borderRadius: 16, padding: 18, marginBottom: 10,
                    borderLeftWidth: 3, borderLeftColor: domColor,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 6 }}>
                      {insight.title}
                    </Text>
                    <Text style={{ color: '#999', fontSize: 13, lineHeight: 20, marginBottom: 10 }}>
                      {insight.description}
                    </Text>
                    <View style={{
                      backgroundColor: 'rgba(168,224,42,0.06)', borderRadius: 10, padding: 12,
                    }}>
                      <Text style={{ color: '#a8e02a', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
                        RECOMENDACIÓN
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

          {/* Detalle por dominio — colapsable */}
          <Pressable onPress={() => setShowDetail(!showDetail)} style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: '#666', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
                DETALLE POR DOMINIO
              </Text>
              <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={16} color="#666" />
            </View>
          </Pressable>

          {showDetail && quiz.domains.map(domain => {
            const score = domainScores[domain.id] || 0;
            const maxScore = quiz.questions.filter(q => q.domain === domain.id).reduce((s, q) => s + q.weight, 0);
            const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const isAlert = pct > 40;

            return (
              <View key={domain.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: domain.color }} />
                    <Text style={{ color: '#ccc', fontSize: 13, fontWeight: '600' }}>{domain.name}</Text>
                  </View>
                  <Text style={{ color: isAlert ? '#fb7185' : '#22c55e', fontSize: 12, fontWeight: '600' }}>
                    {isAlert ? 'Atención' : 'OK'}
                  </Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#1a1a1a', borderRadius: 3 }}>
                  <View style={{
                    height: 6, borderRadius: 3,
                    backgroundColor: isAlert ? '#fb7185' : '#22c55e',
                    width: `${Math.min(pct, 100)}%`,
                  }} />
                </View>
              </View>
            );
          })}

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
              setResultId(null); setShowDetail(false); setScreen('intro');
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

  // Guard: quiz screen pero currentQ undefined momentáneamente
  if (screen === 'quiz') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#999', fontSize: 14 }}>Cargando pregunta...</Text>
      </View>
    );
  }

  return null;
}
