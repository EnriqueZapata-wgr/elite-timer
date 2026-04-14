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
  KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';

import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
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
import { Colors, Spacing, Radius, Fonts, FontSizes, BlockColors } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS, SEMANTIC } from '@/src/constants/brand';

// === CATEGORÍAS (solo Workout y Custom según diseño) ===

const CATEGORIES = [
  { key: 'workout', label: 'Workout' },
  { key: 'custom', label: 'Custom' },
] as const;

// === PANTALLA PRINCIPAL ===

export default function BuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ routineId?: string; clone?: string; mode?: string }>();

  // Estado de la rutina
  const [routine, setRoutine] = useState<Routine>({
    id: generateId(),
    name: '',
    description: '',
    category: 'workout',
    mode: (params.mode === 'routine' ? 'routine' : 'timer') as Routine['mode'],
    blocks: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const exercisePickerCallback = useRef<((exercise: { id: string; name: string }) => void) | null>(null);

  // Cargar rutina existente si viene routineId
  useEffect(() => {
    async function load() {
      try {
        if (params.routineId) {
          const existing = await getRoutine(params.routineId);
          if (existing) {
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
      } catch (err: any) {
        if (__DEV__) console.error('[builder] Error al cargar rutina:', err);
        Alert.alert('Error', err?.message ?? 'No se pudo cargar la rutina.');
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
    } catch (err: any) {
      const msg = err?.message ?? 'Error desconocido';
      if (__DEV__) console.error('[builder] Error al guardar:', err);
      Alert.alert('Error al guardar', msg);
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
    } catch (err: any) {
      const msg = err?.message ?? 'Error desconocido';
      if (__DEV__) console.error('[builder] Error al guardar antes de probar:', err);
      Alert.alert('Error al guardar', msg);
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

  const isEditing = params.routineId && params.clone !== 'true';

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* === HEADER === */}
        <ScreenHeader title="Constructor" onBack={handleBack} />

        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* === NOMBRE === */}
          <View style={styles.nameSection}>
            <EliteText variant="caption" style={styles.nameLabel}>NOMBRE DE LA RUTINA</EliteText>
            <RoutineNameInput
              value={routine.name}
              onChangeText={name => updateRoutine(prev => ({ ...prev, name }))}
            />
            <View style={styles.nameAccent} />
          </View>

          {/* === MODO: Timer vs Rutina === */}
          <View style={styles.modeContainer}>
            <View style={styles.modeToggle}>
              <Pressable
                onPress={() => updateRoutine(prev => ({ ...prev, mode: 'timer' }))}
                style={[styles.modePill, routine.mode === 'timer' && styles.modePillTimerActive]}
              >
                <Ionicons
                  name="timer-outline"
                  size={16}
                  color={routine.mode === 'timer' ? Colors.textOnGreen : Colors.textSecondary}
                />
                <EliteText variant="caption" style={[
                  styles.modeText,
                  routine.mode === 'timer' && styles.modeTextTimerActive,
                ]}>
                  Timer
                </EliteText>
              </Pressable>
              <Pressable
                onPress={() => updateRoutine(prev => ({ ...prev, mode: 'routine' }))}
                style={[styles.modePill, routine.mode === 'routine' && styles.modePillRoutineActive]}
              >
                <Ionicons
                  name="barbell-outline"
                  size={16}
                  color={routine.mode === 'routine' ? TEXT_COLORS.primary : Colors.textSecondary}
                />
                <EliteText variant="caption" style={[
                  styles.modeText,
                  routine.mode === 'routine' && styles.modeTextRoutineActive,
                ]}>
                  Rutina
                </EliteText>
              </Pressable>
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
          <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.blocksZone}>
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

            <AddBlockButton
              parentId={null}
              onAdd={addRootBlock}
              label="Agregar bloque"
            />
          </Animated.View>

          {/* Padding inferior para scroll sobre footer */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* === BOTTOM ACTION BAR === */}
        <View style={styles.bottomBar}>
          {/* PROBAR */}
          <Pressable
            onPress={handleTest}
            disabled={!stats || stats.totalSteps === 0}
            style={({ pressed }) => [styles.bottomBtn, styles.bottomBtnOutline, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="play" size={18} color={Colors.textSecondary} />
            <EliteText variant="caption" style={styles.bottomBtnOutlineText}>PROBAR</EliteText>
          </Pressable>

          {/* GUARDAR (protagonista) */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [pressed && { opacity: 0.8 }, saving && { opacity: 0.5 }]}
          >
            <LinearGradient
              colors={['#c5f540', '#7ab800']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveBtn}
            >
              <Ionicons name="checkmark" size={20} color={Colors.textOnGreen} />
              <EliteText variant="caption" style={styles.saveBtnText}>
                {saving ? 'GUARDANDO...' : 'GUARDAR'}
              </EliteText>
            </LinearGradient>
          </Pressable>

          {/* PREVIEW */}
          <Pressable
            onPress={() => setPreviewVisible(true)}
            disabled={!stats || stats.totalSteps === 0}
            style={({ pressed }) => [styles.bottomBtn, styles.bottomBtnOutline, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="eye-outline" size={18} color={Colors.textSecondary} />
            <EliteText variant="caption" style={styles.bottomBtnOutlineText}>PREVIEW</EliteText>
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
                            ? Colors.textSecondary
                            : step.type === 'work' ? BlockColors.exercise
                            : step.type === 'rest' ? BlockColors.rest
                            : BlockColors.transition,
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
    </View>
  );
}

// === COMPONENTE DE NOMBRE ===

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
      placeholder="Mi rutina"
      placeholderTextColor={Colors.textSecondary + '60'}
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
    letterSpacing: 2,
    color: Colors.neonGreen,
  },

  // --- Nombre ---
  nameSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  nameLabel: {
    color: Colors.textSecondary,
    letterSpacing: 2,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    marginBottom: Spacing.xs,
  },
  nameInput: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.display,
    color: Colors.textPrimary,
    paddingVertical: 4,
    borderWidth: 0,
  },
  nameAccent: {
    width: 48,
    height: 3,
    backgroundColor: Colors.neonGreen,
    borderRadius: 2,
    marginTop: 4,
  },

  // --- Modo toggle ---
  modeContainer: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.pill,
    padding: 3,
  },
  modePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  modePillTimerActive: {
    backgroundColor: Colors.neonGreen,
  },
  modePillRoutineActive: {
    backgroundColor: CATEGORY_COLORS.mind,
  },
  modeText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },
  modeTextTimerActive: {
    color: Colors.textOnGreen,
  },
  modeTextRoutineActive: {
    color: TEXT_COLORS.primary,
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
    backgroundColor: Colors.surfaceLight,
  },
  categoryPillActive: {
    backgroundColor: Colors.neonGreen,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
  },
  categoryTextActive: {
    color: Colors.textOnGreen,
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

  // --- Bottom Action Bar ---
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.black,
    borderTopWidth: 0.5,
    borderTopColor: Colors.surfaceLight,
  },
  bottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bottomBtnOutline: {
    borderWidth: 1,
    borderColor: Colors.disabled,
    borderRadius: Radius.pill,
  },
  bottomBtnOutlineText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    letterSpacing: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    shadowColor: Colors.neonGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnText: {
    color: Colors.textOnGreen,
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.md,
    letterSpacing: 1,
  },

  // --- Preview modal ---
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  previewContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
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
    borderRadius: Radius.xs,
  },
  previewLabel: {
    flex: 1,
    fontSize: FontSizes.md,
  },
  previewTime: {
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontSize: FontSizes.sm,
  },
  previewMore: {
    textAlign: 'center',
    paddingVertical: Spacing.md,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});
