/**
 * Myo Reps — Activación 20 reps + mini sets de 5 con 5 seg descanso hasta fallar.
 *
 * Fases: activación → descanso 5s → sobrecarga → repetir hasta fallo.
 * Feedback de peso basado en cuántas sobrecargas logró.
 */
import { View, Text, Pressable, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  exerciseName: string;
  onComplete: (result: { activationReps: number; overloadSets: number[]; failedAt: number; weightFeedback: string }) => void;
}

export function MyoReps({ exerciseName, onComplete }: Props) {
  const [phase, setPhase] = useState<'activation' | 'rest' | 'overload' | 'done'>('activation');
  const [overloadSets, setOverloadSets] = useState<number[]>([]);
  const [restTimer, setRestTimer] = useState(5);

  // 5 second rest timer
  useEffect(() => {
    if (phase !== 'rest') return;
    if (restTimer <= 0) {
      setPhase('overload');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const t = setTimeout(() => setRestTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, restTimer]);

  function completeActivation() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase('rest');
    setRestTimer(5);
  }

  function completeOverload(reps: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const setNumber = overloadSets.length + 1;
    const updated = [...overloadSets, reps];
    setOverloadSets(updated);

    if (reps < 5) {
      // FALLO — feedback basado en cuántas sobrecargas logró
      let weightFeedback = '';
      if (setNumber <= 5) weightFeedback = 'Peso alto. Baja la próxima sesión.';
      else if (setNumber <= 9) weightFeedback = 'Peso perfecto. Mantén este peso.';
      else weightFeedback = 'Peso OK.';

      setPhase('done');
      onComplete({ activationReps: 20, overloadSets: updated, failedAt: setNumber, weightFeedback });
    } else if (setNumber >= 10) {
      // Llegó a 10 sin fallar
      setPhase('done');
      onComplete({
        activationReps: 20, overloadSets: updated, failedAt: 0,
        weightFeedback: 'Peso bajo. Sube la próxima sesión.',
      });
    } else {
      // Siguiente overload
      setPhase('rest');
      setRestTimer(5);
    }
  }

  return (
    <View style={{ padding: 20 }}>
      {/* Header */}
      <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="flame" size={18} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '800' }}>MYO REPS</Text>
        </View>
        <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 20 }}>
          Activación: 20 reps{'\n'}
          Sobrecargas: 5 reps con 5 seg descanso hasta fallar{'\n'}
          Elige un peso con el que puedas hacer 20 reps.
        </Text>
      </View>

      {/* ACTIVATION */}
      {phase === 'activation' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>SET DE ACTIVACIÓN</Text>
          <Text style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>Haz 20 reps con tu peso elegido</Text>
          <Pressable
            onPress={completeActivation}
            style={{ backgroundColor: '#ef4444', borderRadius: 20, padding: 18, paddingHorizontal: 40 }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>COMPLETÉ 20 REPS</Text>
          </Pressable>
        </View>
      )}

      {/* REST */}
      {phase === 'rest' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#38bdf8', fontSize: 64, fontWeight: '900' }}>{restTimer}</Text>
          <Text style={{ color: '#999', fontSize: 14 }}>segundos de descanso</Text>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
            Siguiente: Sobrecarga {overloadSets.length + 1}
          </Text>
        </View>
      )}

      {/* OVERLOAD */}
      {phase === 'overload' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 }}>
            SOBRECARGA {overloadSets.length + 1}
          </Text>
          <Text style={{ color: '#999', fontSize: 13, marginBottom: 20 }}>
            Haz 5 reps. Si no puedes → fallo controlado.
          </Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Pressable
              onPress={() => completeOverload(5)}
              style={{ backgroundColor: '#a8e02a', borderRadius: 16, padding: 16, paddingHorizontal: 28 }}
            >
              <Text style={{ color: '#000', fontSize: 15, fontWeight: '800' }}>5 REPS</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert('¿Cuántas reps hiciste?', 'Selecciona las reps completadas antes de fallar', [
                  { text: '1 rep', onPress: () => completeOverload(1) },
                  { text: '2 reps', onPress: () => completeOverload(2) },
                  { text: '3 reps', onPress: () => completeOverload(3) },
                  { text: '4 reps', onPress: () => completeOverload(4) },
                ]);
              }}
              style={{ backgroundColor: '#ef4444', borderRadius: 16, padding: 16, paddingHorizontal: 28 }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>FALLO</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* DONE */}
      {phase === 'done' && (
        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Ionicons name="checkmark-circle" size={48} color="#a8e02a" />
          <Text style={{ color: '#a8e02a', fontSize: 20, fontWeight: '800', marginTop: 8 }}>MYO REPS COMPLETADO</Text>
          <Text style={{ color: '#999', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            20 activación + {overloadSets.length} sobrecargas
          </Text>
        </View>
      )}

      {/* Sets log */}
      {overloadSets.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: '#666', fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 6 }}>PROGRESO</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#a8e02a', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#000', fontSize: 9, fontWeight: '700' }}>A</Text>
            </View>
            <Text style={{ color: '#a8e02a', fontSize: 12 }}>Activación: 20 reps</Text>
          </View>
          {overloadSets.map((reps, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: reps === 5 ? '#a8e02a' : '#ef4444',
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ color: reps === 5 ? '#000' : '#fff', fontSize: 9, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <Text style={{ color: reps === 5 ? '#a8e02a' : '#ef4444', fontSize: 12 }}>
                Sobrecarga: {reps} reps {reps < 5 ? '(FALLO)' : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
