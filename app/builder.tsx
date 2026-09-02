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
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { StatsBar } from '@/src/components/builder/StatsBar';
import { BlockCard } from '@/src/components/builder/BlockCard';
import { AddBlockButton } from '@/src/components/builder/AddBlockButton';

import { flattenRoutine, calcRoutineStats } from '@/src/engine';
import type { Block, Routine, ExecutionStep } from '@/src/engine/types';
import { formatTime } from '@/src/engine/helpers';
import { saveRoutine, getRoutine } from '@/src/services/routine-service';
import { generateUUID as generateId } from '@/src/services/routine-service';
import { deepCopyBlock } from '@/src/utils/routine-storage';
import { MatrixExercisePicker } from '@/src/components/MatrixExercisePicker';
import { ensureExerciseId } from '@/src/services/fitness/workout-session-service';
import type { MatrixExercise } from '@/src/constants/exercise-matrix';
import { Spacing, Radius, Fonts, FontSizes, BlockColors } from '@/constants/theme';
import { ATP_BRAND, CATEGORY_COLORS, brandGradient } from '@/src/constants/brand';
import { textoSobreSeccion } from '@/src/constants/concept-colors';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { userErrorMessage } from '@/src/utils/user-error';

// === CATEGORÍAS (solo Workout y Custom según diseño) ===

const CATEGORIES = [
  { key: 'workout', label: 'Workout' },
  { key: 'custom', label: 'Custom' },
] as const;

// === PANTALLA PRINCIPAL ===

export default function BuilderScreen() {
  // Barrido D: la última pantalla grande sin tema. Color duro de punta a
  // punta, así que en modo claro se veía negra entera. Los colores de bloque
  // (BlockColors) y el lima de relleno se quedan: son semántica del producto,
  // no superficie. Lo que cambia es el lienzo, el texto y los bordes.
  const { kind, tokens: t } = useAppTheme();
  // El lima nunca va como TEXTO en claro (contraste 1.34). El teal calibrado
  // es su reemplazo, misma jerarquía.
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
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
  const exercisePickerCallback = useRef<((exercise: { id: string | null; name: string; matrix_slug?: string | null }) => void) | null>(null);

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
        Alert.alert('Error', userErrorMessage(err, 'No se pudo cargar la rutina.'));
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

  const openExercisePicker = useCallback((onSelect: (exercise: { id: string | null; name: string; matrix_slug?: string | null }) => void) => {
    exercisePickerCallback.current = onSelect;
    setExercisePickerVisible(true);
  }, []);

  // MB-5 2.1: el picker ahora entrega ejercicios de exercise_matrix. Se
  // resuelve/crea la fila espejo en `exercises` (FK clásica del engine) y el
  // bloque guarda ADEMÁS matrix_slug — la traza que hereda clip, métodos ATP
  // y benchmark de edad. Sin red, la traza basta (id queda null).
  const handleExerciseSelected = useCallback(async (ex: MatrixExercise) => {
    const cb = exercisePickerCallback.current;
    exercisePickerCallback.current = null;
    setExercisePickerVisible(false);
    if (!cb) return;
    const id = await ensureExerciseId(ex.slug, ex.nombre);
    cb({ id, name: ex.nombre, matrix_slug: ex.slug });
    setHasChanges(true);
  }, []);

  // --- Guardar ---

  const handleSave = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      // Ola 2 PR3: /session arbitra por CONTENIDO (routineUsesClipRunner
      // vive dentro del runner) — matriz corre con clip, puro tiempo corre
      // el modo timer absorbido. Un solo destino, cero ramas aquí.
      router.push({
        pathname: '/session',
        params: { routine: JSON.stringify(routine), name: routine.name },
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
  // C-1 (MB-12): la guardia vive en el evento de navegación (beforeRemove) —
  // el botón físico de Android y el swipe-back de iOS esquivaban el onBack
  // del header. Todos los caminos de salida pasan por aquí.

  const navigation = useNavigation();
  useEffect(() => {
    const unsub = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (!hasChanges) return;
      e.preventDefault();
      Alert.alert(
        'Cambios sin guardar',
        '¿Quieres salir sin guardar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: () => (navigation as any).dispatch(e.data.action) },
        ],
      );
    });
    return unsub;
  }, [navigation, hasChanges]);

  const handleBack = useCallback(() => {
    // La confirmación la pone beforeRemove si hay cambios.
    router.back();
  }, [router]);

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
    <>
    <ThemeReady>
    <View style={[styles.screen, { backgroundColor: t.fondo }]}>
      {/* 31-ago-2026 (21.3): la barra global del root es 'light' (blanca);
          sobre el lienzo claro la hora quedaba invisible. Viaja con el fondo. */}
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
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
            <EliteText variant="caption" style={[styles.nameLabel, { color: t.textoSecundario }]}>NOMBRE DE LA RUTINA</EliteText>
            <RoutineNameInput
              value={routine.name}
              onChangeText={name => updateRoutine(prev => ({ ...prev, name }))}
            />
            {/* 4EP MEDIO-3: el input no tiene borde ni fondo, así que esta
                barra es lo único que dice "aquí se escribe". En lima sobre
                acero claro daba 1.20 y desaparecía. Pasa por el calibre. */}
            <View style={[styles.nameAccent, { backgroundColor: acento }]} />
          </View>

          {/* === MODO: Timer vs Rutina === */}
          <View style={styles.modeContainer}>
            {/* 4EP GRAVE-2: la pista iba a t.hundido, que en oscuro es
                #0A0A0A y sobre el fondo negro da 1.06: el control dejaba de
                verse como forma. t.flotante es el #232323 que tenía antes,
                así que el oscuro queda idéntico, y en claro sube sobre el
                acero en vez de hundirse en él. */}
            <View style={[styles.modeToggle, { backgroundColor: t.flotante }]}>
              <Pressable
                onPress={() => updateRoutine(prev => ({ ...prev, mode: 'timer' }))}
                style={[styles.modePill, routine.mode === 'timer' && { backgroundColor: ATP_BRAND.lime }]}
              >
                <Ionicons
                  name="timer-outline"
                  size={16}
                  color={routine.mode === 'timer' ? t.textoSobreLima : t.textoSecundario}
                />
                <EliteText variant="caption" style={[
                  styles.modeText,
                  { color: routine.mode === 'timer' ? t.textoSobreLima : t.textoSecundario },
                ]}>
                  Timer
                </EliteText>
              </Pressable>
              <Pressable
                onPress={() => updateRoutine(prev => ({ ...prev, mode: 'routine' }))}
                style={[styles.modePill, routine.mode === 'routine' && { backgroundColor: CATEGORY_COLORS.mind }]}
              >
                <Ionicons
                  name="barbell-outline"
                  size={16}
                  color={routine.mode === 'routine' ? textoSobreSeccion('mente') : t.textoSecundario}
                />
                <EliteText variant="caption" style={[
                  styles.modeText,
                  // 31-ago-2026: iba blanco "en los dos modos", pero medido
                  // da 3.76 sobre #7F77DD: bajo AA en los dos. La regla 3 del
                  // manual ya lo decide: sobre relleno de sección va negro
                  // (5.59), salvo ayuno. El relleno es el mismo en los dos
                  // temas, así que el contraste tampoco depende del tema.
                  { color: routine.mode === 'routine' ? textoSobreSeccion('mente') : t.textoSecundario },
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
                  { backgroundColor: routine.category === cat.key ? ATP_BRAND.lime : t.flotante },
                ]}
              >
                <EliteText
                  variant="caption"
                  style={[
                    styles.categoryText,
                    { color: routine.category === cat.key ? t.textoSobreLima : t.textoSecundario },
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
                <Ionicons name="layers-outline" size={48} color={t.textoSecundario} />
                <EliteText variant="body" style={[styles.emptyText, { color: t.textoSecundario }]}>
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
                        matrix_slug: exercise.matrix_slug ?? null,
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

        {/* === BOTTOM ACTION BAR ===
            MB-5 Bloque 3: spring scale (AnimatedPressable) en vez de opacity
            apilada en pressed; GUARDAR con el degradado de marca. */}
        <View style={[styles.bottomBar, { backgroundColor: t.fondo, borderTopColor: t.borde }]}>
          {/* PROBAR */}
          <AnimatedPressable
            onPress={handleTest}
            disabled={!stats || stats.totalSteps === 0}
            style={[styles.bottomBtn, styles.bottomBtnOutline, { borderColor: t.bordeMarcado }]}
          >
            <Ionicons name="play" size={18} color={t.textoSecundario} />
            <EliteText variant="caption" style={[styles.bottomBtnOutlineText, { color: t.textoSecundario }]}>PROBAR</EliteText>
          </AnimatedPressable>

          {/* GUARDAR (protagonista) */}
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving}
            style={saving ? { opacity: 0.7 } : undefined}
          >
            <LinearGradient
              colors={brandGradient()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.saveBtn, { shadowColor: ATP_BRAND.lime }]}
            >
              <Ionicons name="checkmark" size={20} color={t.textoSobreLima} />
              <EliteText variant="caption" style={[styles.saveBtnText, { color: t.textoSobreLima }]}>
                {saving ? 'GUARDANDO...' : 'GUARDAR'}
              </EliteText>
            </LinearGradient>
          </AnimatedPressable>

          {/* PREVIEW */}
          <AnimatedPressable
            onPress={() => setPreviewVisible(true)}
            disabled={!stats || stats.totalSteps === 0}
            style={[styles.bottomBtn, styles.bottomBtnOutline, { borderColor: t.bordeMarcado }]}
          >
            <Ionicons name="eye-outline" size={18} color={t.textoSecundario} />
            <EliteText variant="caption" style={[styles.bottomBtnOutlineText, { color: t.textoSecundario }]}>PREVIEW</EliteText>
          </AnimatedPressable>
        </View>

        {/* === MODAL PREVIEW === */}
        <Modal
          visible={previewVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPreviewVisible(false)}
        >
          <View style={styles.previewOverlay}>
            <View style={[styles.previewContainer, { backgroundColor: t.flotante }]}>
              <View style={styles.previewHeader}>
                <EliteText variant="label" style={[styles.previewTitle, { color: acento }]}>
                  PREVIEW ({previewSteps.length} steps)
                </EliteText>
                <Pressable onPress={() => setPreviewVisible(false)}>
                  <Ionicons name="close" size={24} color={t.textoSecundario} />
                </Pressable>
              </View>
              <ScrollView style={styles.previewScroll}>
                {previewSteps.map((step, i) => (
                  <View key={i} style={[styles.previewStep, { borderBottomColor: t.borde }]}>
                    <EliteText variant="caption" style={[styles.previewIndex, { color: t.textoSecundario }]}>
                      {step.stepIndex + 1}
                    </EliteText>
                    <View
                      style={[
                        styles.previewDot,
                        {
                          backgroundColor: step.isRestBetween
                            ? t.textoSecundario
                            : step.type === 'work' ? BlockColors.exercise
                            : step.type === 'rest' ? BlockColors.rest
                            : BlockColors.transition,
                        },
                      ]}
                    />
                    <EliteText variant="body" style={[styles.previewLabel, { color: t.texto }]} numberOfLines={1}>
                      {step.isRestBetween ? `⟳ ${step.label}` : step.label}
                    </EliteText>
                    <EliteText variant="caption" style={[styles.previewTime, { color: t.textoSecundario }]}>
                      {formatTime(step.durationSeconds)}
                    </EliteText>
                  </View>
                ))}
                {stats && stats.totalSteps > 15 && (
                  <EliteText variant="caption" style={[styles.previewMore, { color: t.textoSecundario }]}>
                    ... y {stats.totalSteps - 15} steps más
                  </EliteText>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </View>
    </ThemeReady>
    {/* 4EP MEDIO-1: el picker de ejercicios sigue en oscuro duro y NO se
        migra hoy (es otra pantalla, con su propio barrido). Va FUERA del
        ThemeReady a propósito: adentro, su EmptyState resolvía tokens claros
        y pintaba texto #0F1518 sobre su fondo negro, contraste 1.14, texto
        invisible. Fuera, se comporta igual que antes de este cambio. Cuando
        el picker se migre, esto entra al scope y este comentario se va. */}
    <MatrixExercisePicker
      visible={exercisePickerVisible}
      onClose={() => {
        exercisePickerCallback.current = null;
        setExercisePickerVisible(false);
      }}
      onSelect={handleExerciseSelected}
    />
    </>
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
  // useAppTheme entrega el tema real siempre (el que depende de <ThemeReady>
  // es useSurfaceTokens). Se usa éste justamente para no depender de dónde
  // cuelgue el componente.
  const t = useAppTheme().tokens;
  return (
    <TextInput
      style={[styles.nameInput, { color: t.texto }]}
      value={value}
      onChangeText={onChangeText}
      placeholder="Mi rutina"
      // 4EP MEDIO-2: textoTenue da 3.19 sobre CARD, pero este input va sobre
      // el fondo desnudo, donde cae a 2.85 y no llega ni al umbral de texto
      // grande. En claro sube a textoSecundario (5.84); en oscuro se queda
      // tenue, que es lo que había.
      placeholderTextColor={t.kind === 'dark' ? t.textoTenue : t.textoSecundario}
      maxLength={50}
    />
  );
}

// === ESTILOS ===

const styles = StyleSheet.create({
  // El color de cada superficie entra por token en el JSX. Aquí solo vive lo
  // que no cambia con el tema: medidas, tipografía y forma.
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },

  // Barrido D: header, backButton y headerTitle se fueron. Estaban muertos
  // desde que la pantalla pasó a ScreenHeader, y arrastraban color duro.

  // --- Nombre ---
  nameSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  nameLabel: {
    letterSpacing: 2,
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    marginBottom: Spacing.xs,
  },
  nameInput: {
    fontFamily: Fonts.extraBold,
    fontSize: FontSizes.display,
    paddingVertical: 4,
    borderWidth: 0,
  },
  nameAccent: {
    width: 48,
    height: 3,
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
  modeText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
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
  },
  categoryText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
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
    textAlign: 'center',
  },

  // --- Bottom Action Bar ---
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 0.5,
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
    borderRadius: Radius.pill,
  },
  bottomBtnOutlineText: {
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnText: {
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
  },
  previewIndex: {
    width: 28,
    textAlign: 'right',
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
    fontVariant: ['tabular-nums'],
    fontSize: FontSizes.sm,
  },
  previewMore: {
    textAlign: 'center',
    paddingVertical: Spacing.md,
    fontStyle: 'italic',
  },
});
