/**
 * Método 3-5 — Ejecución de fuerza con auto-regulación de peso.
 *
 * El usuario hace 3-5 sets registrando reps reales.
 * La app compara vs target y dice si subir/bajar peso.
 *
 * MB-3.5 #2: tocar un número SELECCIONA (estado visible, corregible); la serie
 * se cierra con CONFIRMAR SERIE — no al primer tap. La regla de peso no cambia.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TRAINING_METHODS } from '../../constants/training-methods';
import { Fonts, Radius } from '@/constants/theme';
import { ELEVATION, TEXT } from '@/src/constants/brand';

const AMBAR = '#fbbf24';

interface Props {
  exerciseName: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  lastWeight?: number;
  onComplete: (sets: { weight: number; reps: number; feedback: string }[]) => void;
  /** Cue de voz opcional (el host decide si habla). { hito } = se habla también en modo 'solo hitos'. */
  onCue?: (text: string, opts?: { hito?: boolean }) => void;
}

export function Method35({ exerciseName, userLevel, lastWeight, onComplete, onCue }: Props) {
  const config = TRAINING_METHODS.method_3_5.rules[userLevel];
  const targetReps = config.targetReps;
  const [currentWeight, setCurrentWeight] = useState(lastWeight || 20);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [completedSets, setCompletedSets] = useState<{ weight: number; reps: number; feedback: string }[]>([]);

  /** Cierre explícito de la serie — la comparación vs target NO cambia. */
  function confirmarSerie() {
    if (seleccion == null) return;
    const reps = seleccion;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    let feedback = '';
    if (reps > targetReps) {
      feedback = `${reps} reps → Sube peso`;
      onCue?.('Sube peso.', { hito: true });
    } else if (reps < targetReps) {
      feedback = `${reps} reps → Baja peso`;
      onCue?.('Baja peso.', { hito: true });
    } else {
      feedback = `${reps} reps → Peso perfecto`;
      onCue?.('Peso perfecto.', { hito: true });
    }

    const newSet = { weight: currentWeight, reps, feedback };
    const updated = [...completedSets, newSet];
    setCompletedSets(updated);
    setSeleccion(null);

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
      <View style={s.headerCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Ionicons name="flash" size={18} color={AMBAR} />
          <Text style={s.headerTitle}>MÉTODO 3-5</Text>
        </View>
        <Text style={s.headerBody}>
          Objetivo: {targetReps} reps con el máximo peso posible.{'\n'}
          {config.hint}
        </Text>
      </View>

      {/* Peso actual con +/- */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
        <Pressable onPress={() => setCurrentWeight(w => Math.max(0, w - 2.5))} style={s.weightBtn}>
          <Text style={s.weightBtnText}>−</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.weightValue}>{currentWeight}</Text>
          <Text style={s.weightUnit}>kg</Text>
        </View>
        <Pressable onPress={() => setCurrentWeight(w => w + 2.5)} style={s.weightBtn}>
          <Text style={s.weightBtnText}>+</Text>
        </Pressable>
      </View>

      {/* Set actual */}
      <Text style={s.setHint}>
        Set {completedSets.length + 1} de 3-5 · {seleccion == null ? '¿Cuántas reps? (tocar selecciona)' : `${seleccion} reps — confirma o corrige`}
      </Text>

      {/* Botones de reps — tap = seleccionar (corregible), no cerrar */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
        {repsOptions.map(r => (
          <Pressable
            key={r}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSeleccion(r); }}
            style={[s.repBtn, seleccion === r && s.repBtnActivo]}
          >
            <Text style={[s.repBtnText, seleccion === r && s.repBtnTextActivo]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      {/* Confirmar serie (cierre explícito) */}
      {seleccion != null && (
        <Pressable onPress={confirmarSerie} style={s.confirmBtn}>
          <Ionicons name="checkmark-circle" size={18} color="#000" />
          <Text style={s.confirmText}>CONFIRMAR SERIE</Text>
        </Pressable>
      )}

      {/* Sets completados */}
      {completedSets.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={s.logLabel}>SETS COMPLETADOS</Text>
          {completedSets.map((set, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <View style={s.logDot}>
                <Text style={s.logDotText}>{i + 1}</Text>
              </View>
              <Text style={s.logText}>{set.weight}kg × {set.reps}</Text>
              <Text style={{
                color: set.reps > targetReps ? '#a8e02a' : set.reps < targetReps ? '#ef4444' : AMBAR,
                fontSize: 11, fontFamily: Fonts.semiBold,
              }}>
                {set.feedback}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Botón terminar (después de 3+ sets) */}
      {completedSets.length >= 3 && (
        <Pressable onPress={() => onComplete(completedSets)} style={s.endBtn}>
          <Text style={s.endText}>TERMINAR EJERCICIO</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  headerCard: { backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: Radius.card, padding: 16, marginBottom: 20 },
  headerTitle: { color: AMBAR, fontSize: 15, fontFamily: Fonts.extraBold },
  headerBody: { color: '#ccc', fontSize: 13, lineHeight: 20, fontFamily: Fonts.regular },

  weightBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: ELEVATION[2].bg,
    borderWidth: 1, borderColor: ELEVATION[2].border, justifyContent: 'center', alignItems: 'center',
  },
  weightBtnText: { color: '#fff', fontSize: 22, fontFamily: Fonts.bold },
  weightValue: { color: '#fff', fontSize: 42, fontFamily: Fonts.extraBold },
  weightUnit: { color: TEXT.tertiary, fontSize: 12, fontFamily: Fonts.regular },

  setHint: { color: TEXT.secondary, fontSize: 12, textAlign: 'center', marginBottom: 12, fontFamily: Fonts.regular },

  repBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: ELEVATION[2].bg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: ELEVATION[2].border,
  },
  repBtnActivo: { backgroundColor: AMBAR, borderColor: AMBAR },
  repBtnText: { color: '#fff', fontSize: 18, fontFamily: Fonts.extraBold },
  repBtnTextActivo: { color: '#000' },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: AMBAR, borderRadius: Radius.card, padding: 16, marginTop: 16,
  },
  confirmText: { color: '#000', fontSize: 15, fontFamily: Fonts.extraBold, letterSpacing: 1 },

  logLabel: { color: TEXT.tertiary, fontSize: 10, fontFamily: Fonts.semiBold, letterSpacing: 1, marginBottom: 8 },
  logDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#a8e02a', justifyContent: 'center', alignItems: 'center' },
  logDotText: { color: '#000', fontSize: 11, fontFamily: Fonts.bold },
  logText: { color: '#fff', fontSize: 13, flex: 1, fontFamily: Fonts.regular },

  endBtn: { backgroundColor: '#a8e02a', borderRadius: Radius.card, padding: 16, alignItems: 'center', marginTop: 20 },
  endText: { color: '#000', fontSize: 16, fontFamily: Fonts.extraBold },
});
