/**
 * EMOM Autoajustable — Estrés metabólico con deuda de reps.
 *
 * Cada minuto el usuario hace X reps. Reps faltantes = deuda.
 * Al final, serie de paga. La app dice si subir/bajar peso.
 */
import { View, Text, Pressable } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  exerciseName: string;
  userLevel: 'beginner' | 'intermediate';
  onComplete: (result: { rounds: number[]; debt: number; weightFeedback: string }) => void;
}

export function EMOMAuto({ exerciseName, userLevel, onComplete }: Props) {
  const config = userLevel === 'beginner' ? { rounds: 8, targetReps: 8 } : { rounds: 10, targetReps: 10 };
  const [phase, setPhase] = useState<'ready' | 'active' | 'debt' | 'done'>('ready');
  const [currentRound, setCurrentRound] = useState(0);
  const [timer, setTimer] = useState(60);
  const [roundResults, setRoundResults] = useState<number[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (phase !== 'active') return;
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // Si no registró reps en este minuto, contar como 0
          handleRoundTimeout();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, currentRound]);

  function handleRoundTimeout() {
    if (roundResults.length <= currentRound) {
      logReps(0);
    }
  }

  function logReps(reps: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const debt = Math.max(0, config.targetReps - reps);
    const newResults = [...roundResults, reps];
    setRoundResults(newResults);
    setTotalDebt(prev => prev + debt);

    if (newResults.length >= config.rounds) {
      // EMOM terminado
      if (intervalRef.current) clearInterval(intervalRef.current);
      const finalDebt = totalDebt + debt;
      if (finalDebt === 0) {
        setPhase('done');
        onComplete({ rounds: newResults, debt: 0, weightFeedback: 'Peso bajo. Sube el peso la próxima sesión.' });
      } else {
        setPhase('debt');
      }
    } else {
      setCurrentRound(prev => prev + 1);
      setTimer(60);
    }
  }

  function completeDebtPayment() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const lastRound = roundResults[roundResults.length - 1];
    let weightFeedback = '';
    if (totalDebt > lastRound) {
      weightFeedback = `Deuda (${totalDebt}) > última serie (${lastRound}). Peso alto, bájale.`;
    } else {
      weightFeedback = 'Deuda pagada. Peso OK.';
    }
    setPhase('done');
    onComplete({ rounds: roundResults, debt: totalDebt, weightFeedback });
  }

  // Generar botones de reps (target hacia abajo)
  const repsButtons = Array.from({ length: config.targetReps + 1 }, (_, i) => config.targetReps - i).filter(r => r >= 0);

  return (
    <View style={{ padding: 20 }}>
      {/* Header */}
      <View style={{ backgroundColor: 'rgba(251,146,60,0.1)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="timer" size={18} color="#fb923c" />
          <Text style={{ color: '#fb923c', fontSize: 15, fontWeight: '800' }}>EMOM AUTOAJUSTABLE</Text>
        </View>
        <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 20 }}>
          {config.rounds} rondas × {config.targetReps} reps por minuto.{'\n'}
          Reps faltantes = deuda. Al final, serie de paga.
        </Text>
      </View>

      {/* READY */}
      {phase === 'ready' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 20 }}>
            {exerciseName}
          </Text>
          <Pressable
            onPress={() => { setPhase('active'); setTimer(60); }}
            style={{ backgroundColor: '#fb923c', borderRadius: 16, padding: 18, paddingHorizontal: 48, alignItems: 'center' }}
          >
            <Text style={{ color: '#000', fontSize: 18, fontWeight: '800' }}>INICIAR EMOM</Text>
          </Pressable>
        </View>
      )}

      {/* ACTIVE */}
      {phase === 'active' && (
        <View style={{ alignItems: 'center' }}>
          {/* Timer grande */}
          <Text style={{ color: '#fb923c', fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
            0:{String(timer).padStart(2, '0')}
          </Text>
          <Text style={{ color: '#999', fontSize: 14, marginBottom: 4 }}>
            Ronda {currentRound + 1} de {config.rounds}
          </Text>
          <Text style={{ color: totalDebt > 0 ? '#ef4444' : '#a8e02a', fontSize: 13, fontWeight: '600', marginBottom: 20 }}>
            Deuda acumulada: {totalDebt} reps
          </Text>

          {/* ¿Cuántas reps hiciste? */}
          <Text style={{ color: '#999', fontSize: 12, marginBottom: 10 }}>¿Cuántas reps completaste?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {repsButtons.slice(0, 6).map(r => (
              <Pressable
                key={r}
                onPress={() => logReps(r)}
                style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: r === config.targetReps ? '#fb923c' : '#1a1a1a',
                  justifyContent: 'center', alignItems: 'center',
                  borderWidth: 1, borderColor: r === config.targetReps ? '#fb923c' : '#333',
                }}
              >
                <Text style={{ color: r === config.targetReps ? '#000' : '#fff', fontSize: 16, fontWeight: '700' }}>{r}</Text>
              </Pressable>
            ))}
          </View>

          {/* Rondas completadas */}
          {roundResults.length > 0 && (
            <View style={{ marginTop: 20, width: '100%' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {roundResults.map((reps, i) => (
                  <View key={i} style={{
                    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                    backgroundColor: reps === config.targetReps ? 'rgba(168,224,42,0.15)' : 'rgba(239,68,68,0.15)',
                  }}>
                    <Text style={{ color: reps === config.targetReps ? '#a8e02a' : '#ef4444', fontSize: 11, fontWeight: '600' }}>
                      R{i + 1}: {reps}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* DEBT PAYMENT */}
      {phase === 'debt' && (
        <View style={{ alignItems: 'center' }}>
          <Ionicons name="warning" size={32} color="#fb923c" />
          <Text style={{ color: '#fb923c', fontSize: 22, fontWeight: '800', marginTop: 8 }}>SERIE DE PAGA</Text>
          <Text style={{ color: '#fff', fontSize: 56, fontWeight: '900', marginVertical: 16 }}>{totalDebt}</Text>
          <Text style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>reps de deuda — mínimo descanso</Text>
          <Pressable
            onPress={completeDebtPayment}
            style={{ backgroundColor: '#fb923c', borderRadius: 16, padding: 18, paddingHorizontal: 48 }}
          >
            <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>DEUDA PAGADA</Text>
          </Pressable>
        </View>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Ionicons name="checkmark-circle" size={48} color="#a8e02a" />
          <Text style={{ color: '#a8e02a', fontSize: 20, fontWeight: '800', marginTop: 8 }}>EMOM COMPLETADO</Text>
          <Text style={{ color: '#999', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            {roundResults.length} rondas · Deuda: {totalDebt} reps
          </Text>
        </View>
      )}
    </View>
  );
}
