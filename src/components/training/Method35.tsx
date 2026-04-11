/**
 * Método 3-5 — Ejecución de fuerza con auto-regulación de peso.
 *
 * El usuario hace 3-5 sets registrando reps reales.
 * La app compara vs target y dice si subir/bajar peso.
 */
import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TRAINING_METHODS } from '../../constants/training-methods';

interface Props {
  exerciseName: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  lastWeight?: number;
  onComplete: (sets: { weight: number; reps: number; feedback: string }[]) => void;
}

export function Method35({ exerciseName, userLevel, lastWeight, onComplete }: Props) {
  const config = TRAINING_METHODS.method_3_5.rules[userLevel];
  const targetReps = config.targetReps;
  const [currentWeight, setCurrentWeight] = useState(lastWeight || 20);
  const [completedSets, setCompletedSets] = useState<{ weight: number; reps: number; feedback: string }[]>([]);

  function logSet(reps: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    let feedback = '';
    if (reps > targetReps) {
      feedback = `${reps} reps → Sube peso`;
    } else if (reps < targetReps) {
      feedback = `${reps} reps → Baja peso`;
    } else {
      feedback = `${reps} reps → Peso perfecto`;
    }

    const newSet = { weight: currentWeight, reps, feedback };
    const updated = [...completedSets, newSet];
    setCompletedSets(updated);

    if (updated.length >= 5) {
      onComplete(updated);
    }
  }

  const repsOptions = [
    Math.max(1, targetReps - 2),
    Math.max(1, targetReps - 1),
    targetReps,
    targetReps + 1,
    targetReps + 2,
  ];

  return (
    <View style={{ padding: 20 }}>
      {/* Header */}
      <View style={{ backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="flash" size={18} color="#fbbf24" />
          <Text style={{ color: '#fbbf24', fontSize: 15, fontWeight: '800' }}>MÉTODO 3-5</Text>
        </View>
        <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 20 }}>
          Objetivo: {targetReps} reps con el máximo peso posible.{'\n'}
          {config.hint}
        </Text>
      </View>

      {/* Peso actual con +/- */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
        <Pressable
          onPress={() => setCurrentWeight(w => Math.max(0, w - 2.5))}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>−</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 42, fontWeight: '900' }}>{currentWeight}</Text>
          <Text style={{ color: '#666', fontSize: 12 }}>kg</Text>
        </View>
        <Pressable
          onPress={() => setCurrentWeight(w => w + 2.5)}
          style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>+</Text>
        </Pressable>
      </View>

      {/* Set actual */}
      <Text style={{ color: '#999', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>
        Set {completedSets.length + 1} de 3-5 · ¿Cuántas reps?
      </Text>

      {/* Botones de reps */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
        {repsOptions.map(r => (
          <Pressable
            key={r}
            onPress={() => logSet(r)}
            style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: r === targetReps ? '#fbbf24' : '#1a1a1a',
              justifyContent: 'center', alignItems: 'center',
              borderWidth: 1, borderColor: r === targetReps ? '#fbbf24' : '#333',
            }}
          >
            <Text style={{ color: r === targetReps ? '#000' : '#fff', fontSize: 18, fontWeight: '800' }}>{r}</Text>
          </Pressable>
        ))}
      </View>

      {/* Sets completados */}
      {completedSets.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: '#666', fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>SETS COMPLETADOS</Text>
          {completedSets.map((set, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#a8e02a', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#000', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 13, flex: 1 }}>{set.weight}kg × {set.reps}</Text>
              <Text style={{
                color: set.reps > targetReps ? '#a8e02a' : set.reps < targetReps ? '#ef4444' : '#fbbf24',
                fontSize: 11, fontWeight: '600',
              }}>
                {set.feedback}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Botón terminar (después de 3+ sets) */}
      {completedSets.length >= 3 && (
        <Pressable
          onPress={() => onComplete(completedSets)}
          style={{ backgroundColor: '#a8e02a', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 20 }}
        >
          <Text style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>TERMINAR EJERCICIO</Text>
        </Pressable>
      )}
    </View>
  );
}
