/**
 * SetLogModal — Modal compacto para registrar un set durante la ejecución.
 *
 * Aparece al terminar un step de work con ejercicio asignado.
 * Diseñado para ser RÁPIDO — máximo 5 segundos para llenarlo.
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, Modal, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

interface SetLogModalProps {
  visible: boolean;
  exerciseName: string;
  setNumber: number;
  onSave: (data: { reps: number; weight_kg: number | null; rpe: number | null }) => void;
  onSkip: () => void;
}

export function SetLogModal({
  visible,
  exerciseName,
  setNumber,
  onSave,
  onSkip,
}: SetLogModalProps) {
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const repsInputRef = useRef<TextInput>(null);

  // Reset y auto-focus cuando se abre
  useEffect(() => {
    if (visible) {
      setReps('');
      setWeight('');
      setRpe(null);
      // Pequeño delay para que el modal se renderice antes de hacer focus
      setTimeout(() => repsInputRef.current?.focus(), 300);
    }
  }, [visible]);

  const handleSave = () => {
    const repsNum = parseInt(reps, 10);
    if (!repsNum || repsNum <= 0) {
      // Si no puso reps, saltar
      onSkip();
      return;
    }

    const weightNum = weight ? parseFloat(weight) : null;
    onSave({
      reps: repsNum,
      weight_kg: weightNum && weightNum > 0 ? weightNum : null,
      rpe,
    });
  };

  // RPE options: 6-10 (los más comunes)
  const RPE_OPTIONS = [6, 7, 8, 9, 10];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header compacto */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="barbell-outline" size={18} color={Colors.neonGreen} />
              <EliteText variant="label" style={styles.title} numberOfLines={1}>
                {exerciseName}
              </EliteText>
            </View>
            <View style={styles.setBadge}>
              <EliteText variant="caption" style={styles.setNumber}>
                Set {setNumber}
              </EliteText>
            </View>
          </View>

          {/* Inputs en fila: Reps × Peso */}
          <View style={styles.inputsRow}>
            {/* Reps */}
            <View style={styles.inputGroup}>
              <EliteText variant="caption" style={styles.inputLabel}>REPS</EliteText>
              <TextInput
                ref={repsInputRef}
                style={styles.input}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={Colors.disabled}
                maxLength={3}
                selectTextOnFocus
              />
            </View>

            <EliteText variant="body" style={styles.separator}>×</EliteText>

            {/* Peso */}
            <View style={styles.inputGroup}>
              <EliteText variant="caption" style={styles.inputLabel}>PESO (kg)</EliteText>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="BW"
                placeholderTextColor={Colors.disabled}
                maxLength={6}
                selectTextOnFocus
              />
            </View>
          </View>

          {/* RPE selector compacto */}
          <View style={styles.rpeRow}>
            <EliteText variant="caption" style={styles.rpeLabel}>RPE</EliteText>
            <View style={styles.rpeOptions}>
              {RPE_OPTIONS.map(value => (
                <Pressable
                  key={value}
                  onPress={() => setRpe(rpe === value ? null : value)}
                  style={[
                    styles.rpePill,
                    rpe === value && styles.rpePillActive,
                  ]}
                >
                  <EliteText
                    variant="caption"
                    style={[
                      styles.rpeText,
                      rpe === value && styles.rpeTextActive,
                    ]}
                  >
                    {value}
                  </EliteText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Botones */}
          <View style={styles.buttonsRow}>
            <Pressable onPress={onSkip} style={styles.skipButton}>
              <EliteText variant="caption" style={styles.skipText}>Saltar</EliteText>
            </Pressable>

            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Ionicons name="checkmark" size={20} color={Colors.textOnGreen} />
              <EliteText variant="label" style={styles.saveText}>Guardar</EliteText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neonGreen + '40',
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  setBadge: {
    backgroundColor: Colors.neonGreen + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  setNumber: {
    color: Colors.neonGreen,
    fontFamily: Fonts.bold,
    fontSize: 11,
  },

  // --- Inputs ---
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inputGroup: {
    flex: 1,
    gap: Spacing.xs,
  },
  inputLabel: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    fontSize: 10,
  },
  input: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    backgroundColor: Colors.black,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  separator: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    marginTop: Spacing.md,
  },

  // --- RPE ---
  rpeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  rpeLabel: {
    color: Colors.textSecondary,
    letterSpacing: 1,
    fontSize: 10,
    width: 30,
  },
  rpeOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flex: 1,
  },
  rpePill: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    alignItems: 'center',
  },
  rpePillActive: {
    borderColor: Colors.neonGreen,
    backgroundColor: Colors.neonGreen + '20',
  },
  rpeText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  rpeTextActive: {
    color: Colors.neonGreen,
  },

  // --- Botones ---
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
  },
  skipText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.semiBold,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.neonGreen,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.pill,
  },
  saveText: {
    color: Colors.textOnGreen,
    fontFamily: Fonts.bold,
  },
});
