/**
 * Log Exercise — Pantalla para registrar ejercicios manualmente fuera del timer.
 *
 * Permite seleccionar un ejercicio y agregar múltiples sets con reps, peso y RPE.
 */
import { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';


import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { EliteButton } from '@/components/elite-button';
import { ExercisePicker } from '@/src/components/ExercisePicker';
import { logExerciseSets } from '@/src/services/exercise-service';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import type { Exercise } from '@/src/types/exercise';

// === TIPOS LOCALES ===

interface SetEntry {
  id: string;
  reps: string;
  weight: string;
  rpe: number | null;
}

// === PANTALLA PRINCIPAL ===

export default function LogExerciseScreen() {
  const router = useRouter();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [sets, setSets] = useState<SetEntry[]>([
    { id: '1', reps: '', weight: '', rpe: null },
  ]);
  const [saving, setSaving] = useState(false);

  // Agregar un set nuevo
  const addSet = useCallback(() => {
    setSets(prev => [
      ...prev,
      { id: String(prev.length + 1), reps: '', weight: '', rpe: null },
    ]);
  }, []);

  // Eliminar un set
  const removeSet = useCallback((index: number) => {
    setSets(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Actualizar un campo de un set
  const updateSet = useCallback((index: number, field: keyof SetEntry, value: any) => {
    setSets(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  // Guardar todos los sets
  const handleSave = useCallback(async () => {
    if (!selectedExercise) {
      Alert.alert('Error', 'Selecciona un ejercicio primero.');
      return;
    }

    // Filtrar sets con reps válidas
    const validSets = sets.filter(s => {
      const reps = parseInt(s.reps, 10);
      return reps > 0;
    });

    if (validSets.length === 0) {
      Alert.alert('Error', 'Agrega al menos un set con reps.');
      return;
    }

    try {
      setSaving(true);
      await logExerciseSets(
        validSets.map((s, i) => ({
          exercise_id: selectedExercise.id,
          reps: parseInt(s.reps, 10),
          weight_kg: s.weight ? parseFloat(s.weight) : null,
          rpe: s.rpe,
          set_number: i + 1,
        })),
      );
      Alert.alert(
        'Guardado',
        `${validSets.length} set(s) de ${selectedExercise.name} registrados.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los sets.');
    } finally {
      setSaving(false);
    }
  }, [selectedExercise, sets, router]);

  const RPE_OPTIONS = [6, 7, 8, 9, 10];

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <ScreenHeader title="Registrar" />

        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Selector de ejercicio */}
          <Pressable
            onPress={() => setPickerVisible(true)}
            style={styles.exerciseSelector}
          >
            {selectedExercise ? (
              <View style={styles.selectedExercise}>
                <Ionicons name="barbell-outline" size={20} color={Colors.neonGreen} />
                <View style={styles.selectedInfo}>
                  <EliteText variant="body" style={styles.selectedName}>
                    {selectedExercise.name}
                  </EliteText>
                  <EliteText variant="caption" style={styles.selectedMuscle}>
                    {selectedExercise.muscle_group} · {selectedExercise.equipment}
                  </EliteText>
                </View>
                <Ionicons name="swap-horizontal" size={18} color={Colors.textSecondary} />
              </View>
            ) : (
              <View style={styles.placeholderExercise}>
                <Ionicons name="add-circle-outline" size={24} color={Colors.neonGreen} />
                <EliteText variant="body" style={styles.placeholderText}>
                  Seleccionar ejercicio
                </EliteText>
              </View>
            )}
          </Pressable>

          {/* Lista de sets */}
          {selectedExercise && (
            <View style={styles.setsSection}>
              <EliteText variant="label" style={styles.setsTitle}>SETS</EliteText>

              {sets.map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  {/* Número de set */}
                  <EliteText variant="body" style={styles.setNumber}>
                    {index + 1}
                  </EliteText>

                  {/* Reps */}
                  <View style={styles.setInputGroup}>
                    <EliteText variant="caption" style={styles.setInputLabel}>Reps</EliteText>
                    <TextInput
                      style={styles.setInput}
                      value={set.reps}
                      onChangeText={v => updateSet(index, 'reps', v)}
                      keyboardType="number-pad"
                      placeholder="—"
                      placeholderTextColor={Colors.disabled}
                      maxLength={3}
                    />
                  </View>

                  {/* Separador */}
                  <EliteText variant="body" style={styles.setSeparator}>×</EliteText>

                  {/* Peso */}
                  <View style={styles.setInputGroup}>
                    <EliteText variant="caption" style={styles.setInputLabel}>Peso (kg)</EliteText>
                    <TextInput
                      style={styles.setInput}
                      value={set.weight}
                      onChangeText={v => updateSet(index, 'weight', v)}
                      keyboardType="decimal-pad"
                      placeholder="BW"
                      placeholderTextColor={Colors.disabled}
                      maxLength={6}
                    />
                  </View>

                  {/* RPE */}
                  <View style={styles.setRpeGroup}>
                    <EliteText variant="caption" style={styles.setInputLabel}>RPE</EliteText>
                    <View style={styles.rpeRow}>
                      {RPE_OPTIONS.map(v => (
                        <Pressable
                          key={v}
                          onPress={() => updateSet(index, 'rpe', set.rpe === v ? null : v)}
                          style={[
                            styles.rpeMini,
                            set.rpe === v && styles.rpeMiniActive,
                          ]}
                        >
                          <EliteText
                            variant="caption"
                            style={[
                              styles.rpeMiniText,
                              set.rpe === v && styles.rpeMiniTextActive,
                            ]}
                          >
                            {v}
                          </EliteText>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Eliminar set */}
                  {sets.length > 1 && (
                    <Pressable onPress={() => removeSet(index)} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </Pressable>
                  )}
                </View>
              ))}

              {/* Agregar set */}
              <Pressable onPress={addSet} style={styles.addSetButton}>
                <Ionicons name="add-circle-outline" size={20} color={Colors.neonGreen} />
                <EliteText variant="body" style={styles.addSetText}>
                  Agregar set
                </EliteText>
              </Pressable>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer: botón guardar */}
        {selectedExercise && (
          <View style={styles.footer}>
            <EliteButton
              label={saving ? 'Guardando...' : 'GUARDAR TODO'}
              onPress={handleSave}
              disabled={saving}
            />
          </View>
        )}

        {/* Exercise Picker Modal */}
        <ExercisePicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onSelect={(exercise) => {
            setSelectedExercise(exercise);
            setPickerVisible(false);
          }}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  flex: {
    flex: 1,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    letterSpacing: 3,
  },

  // --- Selector de ejercicio ---
  exerciseSelector: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    overflow: 'hidden',
  },
  selectedExercise: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontFamily: Fonts.semiBold,
  },
  selectedMuscle: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  placeholderExercise: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  placeholderText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
  },

  // --- Sets ---
  setsSection: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  setsTitle: {
    color: Colors.neonGreen,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  setNumber: {
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    width: 28,
    textAlign: 'center',
    paddingBottom: 4,
  },
  setInputGroup: {
    flex: 1,
    gap: 2,
  },
  setInputLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    letterSpacing: 0.5,
  },
  setInput: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.black,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.xs,
    textAlign: 'center',
  },
  setSeparator: {
    color: Colors.textSecondary,
    paddingBottom: 4,
  },
  setRpeGroup: {
    gap: 2,
  },
  rpeRow: {
    flexDirection: 'row',
    gap: 2,
  },
  rpeMini: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeMiniActive: {
    borderColor: Colors.neonGreen,
    backgroundColor: Colors.neonGreen + '20',
  },
  rpeMiniText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
  },
  rpeMiniTextActive: {
    color: Colors.neonGreen,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: Radius.sm,
    borderStyle: 'dashed',
  },
  addSetText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
  },

  // --- Footer ---
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    alignItems: 'center',
  },
});
