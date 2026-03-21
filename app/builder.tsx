/**
 * Builder — Editor visual de rutinas con bloques anidados.
 *
 * Permite crear y editar rutinas con estructura jerárquica de bloques:
 * grupos (containers con rounds) y hojas (work/rest/prep con duración).
 *
 * Las stats se recalculan en vivo con cada cambio.
 * Guarda en Supabase usando el formato engine (Routine de types.ts).
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EliteText } from '@/components/elite-text';
import { EliteButton } from '@/components/elite-button';
import { StatsBar } from '@/src/components/builder/StatsBar';
import { BlockCard } from '@/src/components/builder/BlockCard';
import { AddBlockButton } from '@/src/components/builder/AddBlockButton';

import { flattenRoutine, calcRoutineStats } from '@/src/engine';
import type { Block, Routine, ExecutionStep } from '@/src/engine/types';
import { formatTime } from '@/src/engine/helpers';
import { saveRoutine, getRoutine } from '@/src/services/routine-service';
import { generateUUID as generateId } from '@/src/services/routine-service';
import { deepCopyBlock } from '@/src/utils/routine-storage';
import { ExercisePicker } from '@/src/components/ExercisePicker';
import type { Exercise } from '@/src/types/exercise';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';

// === CATEGORÍAS ===

const CATEGORIES = [
  { key: 'workout', label: 'Workout' },
  { key: 'fasting', label: 'Fasting' },
  { key: 'breathing', label: 'Breathing' },
  { key: 'custom', label: 'Custom' },
] as const;

// === PANTALLA PRINCIPAL ===

export default function BuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ routineId?: string; clone?: string }>();

  // Estado de la rutina
  const [routine, setRoutine] = useState<Routine>({
    id: generateId(),
    name: '',
    description: '',
    category: 'workout',
    blocks: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  // Estado del picker de ejercicios
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  // Callback que se invoca cuando se selecciona un ejercicio del picker
  const exercisePickerCallback = useRef<((exercise: { id: string; name: string }) => void) | null>(null);

  // Cargar rutina existente si viene routineId
  useEffect(() => {
    async function load() {
      try {
        if (params.routineId) {
          const existing = await getRoutine(params.routineId);
          if (existing) {
            // Si es clon, generar nuevo ID y agregar "(copia)" al nombre
            if (params.clone === 'true') {
              setRoutine({
                ...existing,
                id: generateId(),
                name: existing.name + ' (copia)',
              });
            } else {
              setRoutine(existing);
            }
          }
        }
      } catch (err) {
        Alert.alert('Error', 'No se pudo cargar la rutina. Verifica tu conexión.');
      }
      setLoaded(true);
    }
    load();
  }, [params.routineId, params.clone]);

  // Calcular stats en vivo
  const stats = useMemo(() => {
    try {
      const steps = flattenRoutine(routine);
      return calcRoutineStats(steps);
    } catch {
      return null;
    }
  }, [routine]);

  // Marcar cambios en cada update
  const updateRoutine = useCallback((updater: (prev: Routine) => Routine) => {
    setRoutine(prev => {
      const next = updater(prev);
      setHasChanges(true);
      return next;
    });
  }, []);

  // --- Operaciones en bloques raíz ---

  const updateBlock = useCallback((index: number, updated: Block) => {
    updateRoutine(prev => {
      const blocks = [...prev.blocks];
      blocks[index] = updated;
      return { ...prev, blocks };
    });
  }, [updateRoutine]);

  const deleteBlock = useCallback((index: number) => {
    updateRoutine(prev => {
      const blocks = prev.blocks.filter((_, i) => i !== index);
      const reindexed = blocks.map((b, i) => ({ ...b, sort_order: i }));
      return { ...prev, blocks: reindexed };
    });
  }, [updateRoutine]);

  const moveBlock = useCallback((index: number, direction: -1 | 1) => {
    updateRoutine(prev => {
      const blocks = [...prev.blocks];
      const target = index + direction;
      if (target < 0 || target >= blocks.length) return prev;
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      const reindexed = blocks.map((b, i) => ({ ...b, sort_order: i }));
      return { ...prev, blocks: reindexed };
    });
  }, [updateRoutine]);

  const addRootBlock = useCallback((block: Block) => {
    updateRoutine(prev => {
      const blocks = [...prev.blocks];
      const newBlock = { ...block, parent_block_id: null, sort_order: blocks.length };
      blocks.push(newBlock);
      return { ...prev, blocks };
    });
  }, [updateRoutine]);

  const duplicateBlock = useCallback((index: number) => {
    updateRoutine(prev => {
      const blocks = [...prev.blocks];
      const original = blocks[index];
      const copy = deepCopyBlock(original, null);
      blocks.splice(index + 1, 0, copy);
      const reindexed = blocks.map((b, i) => ({ ...b, sort_order: i }));
      return { ...prev, blocks: reindexed };
    });
  }, [updateRoutine]);

  // --- Abrir el picker de ejercicios con un callback ---

  const openExercisePicker = useCallback((onSelect: (exercise: { id: string; name: string }) => void) => {
    exercisePickerCallback.current = onSelect;
    setExercisePickerVisible(true);
  }, []);

  const handleExerciseSelected = useCallback((exercise: Exercise) => {
    if (exercisePickerCallback.current) {
      exercisePickerCallback.current(exercise);
      setHasChanges(true);
    }
    exercisePickerCallback.current = null;
    setExercisePickerVisible(false);
  }, []);

  // --- Guardar ---

  const handleSave = useCallback(async () => {
    if (!routine.name.trim()) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para la rutina.');
      return;
    }
    try {
      setSaving(true);
      await saveRoutine(routine);
      setHasChanges(false);
      Alert.alert('Guardado', `"${routine.name}" guardada correctamente.`);
    } catch (err) {
      Alert.alert('Error al guardar', 'No se pudo guardar la rutina. Verifica tu conexión.');
    } finally {
      setSaving(false);
    }
  }, [routine]);

  // --- Probar ---

  const handleTest = useCallback(async () => {
    if (!routine.name.trim()) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para la rutina antes de probar.');
      return;
    }
    try {
      setSaving(true);
      await saveRoutine(routine);
      setHasChanges(false);
      router.push({
        pathname: '/execution',
        params: { routine: JSON.stringify(routine) },
      });
    } catch (err) {
      Alert.alert('Error al guardar', 'No se pudo guardar la rutina antes de probar.');
    } finally {
      setSaving(false);
    }
  }, [routine, router]);

  // --- Volver con confirmación ---

  const handleBack = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Cambios sin guardar',
        '¿Quieres salir sin guardar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  }, [hasChanges, router]);

  // --- Preview ---

  const previewSteps = useMemo(() => {
    try {
      return flattenRoutine(routine).slice(0, 15);
    } catch {
      return [];
    }
  }, [routine]);

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* === HEADER === */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={Colors.neonGreen} />
          </Pressable>
          <EliteText variant="title" style={styles.headerTitle}>
            {params.routineId && params.clone !== 'true' ? 'EDITAR' : 'CREAR'} RUTINA
          </EliteText>
        </View>

        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* === NOMBRE === */}
          <View style={styles.nameRow}>
            <View style={styles.nameInputContainer}>
              <Ionicons name="create-outline" size={18} color={Colors.textSecondary} />
              <View style={styles.nameInputWrapper}>
                {/* TextInput nativo para mayor control */}
                <RoutineNameInput
                  value={routine.name}
                  onChangeText={name => updateRoutine(prev => ({ ...prev, name }))}
                />
              </View>
            </View>
          </View>

          {/* === CATEGORÍA === */}
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat.key}
                onPress={() => updateRoutine(prev => ({ ...prev, category: cat.key }))}
                style={[
                  styles.categoryPill,
                  routine.category === cat.key && styles.categoryPillActive,
                ]}
              >
                <EliteText
                  variant="caption"
                  style={[
                    styles.categoryText,
                    routine.category === cat.key && styles.categoryTextActive,
                  ]}
                >
                  {cat.label}
                </EliteText>
              </Pressable>
            ))}
          </View>

          {/* === STATS BAR === */}
          {stats && stats.totalSteps > 0 && (
            <View style={styles.statsContainer}>
              <StatsBar stats={stats} />
            </View>
          )}

          {/* === ZONA DE BLOQUES === */}
          <View style={styles.blocksZone}>
            {routine.blocks.length === 0 ? (
              <View style={styles.emptyBlocks}>
                <Ionicons name="layers-outline" size={48} color={Colors.textSecondary} />
                <EliteText variant="body" style={styles.emptyText}>
                  Agrega bloques para construir tu rutina
                </EliteText>
              </View>
            ) : (
              routine.blocks.map((block, index) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  depth={0}
                  onUpdate={updated => updateBlock(index, updated)}
                  onDelete={() => deleteBlock(index)}
                  onDuplicate={() => duplicateBlock(index)}
                  onAddChild={child => {
                    // Para agregar child a un bloque raíz grupo
                    const children = [...(block.children ?? [])];
                    const newChild = { ...child, parent_block_id: block.id, sort_order: children.length };
                    children.push(newChild);
                    updateBlock(index, { ...block, children });
                  }}
                  onMoveUp={index > 0 ? () => moveBlock(index, -1) : null}
                  onMoveDown={index < routine.blocks.length - 1 ? () => moveBlock(index, 1) : null}
                  onRequestExercisePicker={openExercisePicker}
                  onAssignExercise={() => {
                    openExercisePicker((exercise) => {
                      updateBlock(index, {
                        ...block,
                        exercise_id: exercise.id,
                        exercise_name: exercise.name,
                      });
                    });
                  }}
                />
              ))
            )}

            {/* Botón agregar bloque raíz */}
            <AddBlockButton
              parentId={null}
              onAdd={addRootBlock}
              label="Agregar bloque"
            />
          </View>

          {/* Padding inferior para scroll */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* === FOOTER === */}
        <View style={styles.footer}>
          <Pressable
            onPress={() => setPreviewVisible(true)}
            style={({ pressed }) => [styles.footerBtn, pressed && { opacity: 0.6 }]}
            disabled={!stats || stats.totalSteps === 0}
          >
            <Ionicons name="eye-outline" size={18} color={Colors.neonGreen} />
            <EliteText variant="caption" style={styles.footerBtnText}>Preview</EliteText>
          </Pressable>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.6 }, saving && { opacity: 0.5 }]}
          >
            <Ionicons name="save-outline" size={18} color={Colors.textOnGreen} />
            <EliteText variant="caption" style={styles.saveBtnText}>
              {saving ? 'Guardando...' : 'Guardar'}
            </EliteText>
          </Pressable>

          <Pressable
            onPress={handleTest}
            style={({ pressed }) => [styles.footerBtn, pressed && { opacity: 0.6 }]}
            disabled={!stats || stats.totalSteps === 0}
          >
            <Ionicons name="play" size={18} color={Colors.neonGreen} />
            <EliteText variant="caption" style={styles.footerBtnText}>Probar</EliteText>
          </Pressable>
        </View>

        {/* === MODAL PREVIEW === */}
        <Modal
          visible={previewVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPreviewVisible(false)}
        >
          <View style={styles.previewOverlay}>
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <EliteText variant="label" style={styles.previewTitle}>
                  PREVIEW ({previewSteps.length} steps)
                </EliteText>
                <Pressable onPress={() => setPreviewVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </Pressable>
              </View>
              <ScrollView style={styles.previewScroll}>
                {previewSteps.map((step, i) => (
                  <View key={i} style={styles.previewStep}>
                    <EliteText variant="caption" style={styles.previewIndex}>
                      {step.stepIndex + 1}
                    </EliteText>
                    <View
                      style={[
                        styles.previewDot,
                        {
                          backgroundColor: step.isRestBetween
                            ? '#888'
                            : step.type === 'work' ? '#a8e02a'
                            : step.type === 'rest' ? '#5B9BD5'
                            : '#EF9F27',
                        },
                      ]}
                    />
                    <EliteText variant="body" style={styles.previewLabel} numberOfLines={1}>
                      {step.isRestBetween ? `⟳ ${step.label}` : step.label}
                    </EliteText>
                    <EliteText variant="caption" style={styles.previewTime}>
                      {formatTime(step.durationSeconds)}
                    </EliteText>
                  </View>
                ))}
                {stats && stats.totalSteps > 15 && (
                  <EliteText variant="caption" style={styles.previewMore}>
                    ... y {stats.totalSteps - 15} steps más
                  </EliteText>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
        {/* === EXERCISE PICKER MODAL === */}
        <ExercisePicker
          visible={exercisePickerVisible}
          onClose={() => {
            exercisePickerCallback.current = null;
            setExercisePickerVisible(false);
          }}
          onSelect={handleExerciseSelected}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// === COMPONENTE DE NOMBRE (evita re-renders del teclado) ===

import { TextInput } from 'react-native';

function RoutineNameInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <TextInput
      style={styles.nameInput}
      value={value}
      onChangeText={onChangeText}
      placeholder="Nombre de la rutina"
      placeholderTextColor={Colors.textSecondary}
      maxLength={50}
    />
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

  // --- Nombre ---
  nameRow: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  nameInputWrapper: {
    flex: 1,
  },
  nameInput: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm + 2,
  },

  // --- Categoría ---
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  categoryPillActive: {
    borderColor: Colors.neonGreen,
    backgroundColor: Colors.neonGreen + '20',
  },
  categoryText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  categoryTextActive: {
    color: Colors.neonGreen,
  },

  // --- Stats ---
  statsContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },

  // --- Bloques ---
  blocksZone: {
    paddingHorizontal: Spacing.md,
  },
  emptyBlocks: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // --- Footer ---
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceLight,
    backgroundColor: Colors.black,
  },
  footerBtn: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  footerBtnText: {
    color: Colors.neonGreen,
    fontFamily: Fonts.semiBold,
    fontSize: 11,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.neonGreen,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
  },
  saveBtnText: {
    color: Colors.textOnGreen,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },

  // --- Preview modal ---
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  previewContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    maxHeight: '70%',
    padding: Spacing.md,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  previewTitle: {
    color: Colors.neonGreen,
    letterSpacing: 2,
  },
  previewScroll: {
    flex: 1,
  },
  previewStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceLight,
  },
  previewIndex: {
    width: 28,
    textAlign: 'right',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewLabel: {
    flex: 1,
    fontSize: 13,
  },
  previewTime: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontSize: 12,
  },
  previewMore: {
    textAlign: 'center',
    paddingVertical: Spacing.md,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
