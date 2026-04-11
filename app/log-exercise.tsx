/**
 * Log Exercise — Pantalla de 3 pasos para registrar ejercicios de fuerza.
 *
 * Flujo:
 * 1. benchmark  → Lista de ejercicios benchmark (is_benchmark=true)
 * 2. variant    → Benchmark oficial + sus variantes, opción de agregar
 * 3. log        → Logger de sets con peso/reps/RIR y cálculo 1RM en vivo
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, TextInput, Alert,
  Modal, Pressable, Text, DeviceEventEmitter,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { getLocalToday } from '@/src/utils/date-helpers';
import { generateUUID } from '@/src/services/routine-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { TRAINING_METHODS, type TrainingMethodId } from '@/src/constants/training-methods';
import { Method35 } from '@/src/components/training/Method35';
import { EMOMAuto } from '@/src/components/training/EMOMAuto';
import { MyoReps } from '@/src/components/training/MyoReps';
import { awardBooleanElectron } from '@/src/services/electron-service';

// === TIPOS LOCALES ===

type Step = 'benchmark' | 'variant' | 'log';

interface ExerciseRow {
  id: string;
  name: string;
  name_es: string;
  is_benchmark: boolean;
  parent_exercise_id: string | null;
  muscle_groups: string[];
  equipment_list: string[];
  instructions: string | null;
}

interface PRRow {
  exercise_id: string;
  weight_kg: number;
  rep_range: number;
  estimated_1rm: number;
  achieved_at: string;
}

interface SetEntry {
  id: string;
  reps: string;
  weight: string;
  rir: string;
}

// === HELPERS ===

/** Epley 1RM: weight * (1 + reps / 30) */
function calc1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// === PANTALLA PRINCIPAL ===

export default function LogExerciseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string }>();
  const { user } = useAuth();

  // --- Estado de flujo ---
  const [step, setStep] = useState<Step>('benchmark');
  const [benchmarks, setBenchmarks] = useState<ExerciseRow[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<ExerciseRow | null>(null);
  const [variants, setVariants] = useState<ExerciseRow[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ExerciseRow | null>(null);
  const [prs, setPrs] = useState<Record<string, PRRow>>({});
  const [loading, setLoading] = useState(true);

  // --- Estado del logger ---
  const [sets, setSets] = useState<SetEntry[]>([
    { id: generateUUID(), reps: '', weight: '', rir: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<TrainingMethodId>('standard');

  // --- Modal de agregar variante ---
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantEquipment, setNewVariantEquipment] = useState('');

  // === CARGA INICIAL ===

  useEffect(() => {
    loadBenchmarks();
  }, []);

  // Si viene con exerciseId, auto-navegar al paso correcto
  useEffect(() => {
    if (!params.exerciseId || benchmarks.length === 0) return;
    autoNavigate(params.exerciseId);
  }, [params.exerciseId, benchmarks]);

  async function loadBenchmarks() {
    setLoading(true);
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('is_benchmark', true)
      .order('name_es');
    if (data) setBenchmarks(data as ExerciseRow[]);

    // Cargar PRs del usuario
    if (user) {
      const { data: prData } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', user.id);
      if (prData) {
        const map: Record<string, PRRow> = {};
        for (const pr of prData as PRRow[]) {
          // Guardar el PR con mayor 1RM estimado por ejercicio
          if (!map[pr.exercise_id] || pr.estimated_1rm > map[pr.exercise_id].estimated_1rm) {
            map[pr.exercise_id] = pr;
          }
        }
        setPrs(map);
      }
    }
    setLoading(false);
  }

  async function autoNavigate(exerciseId: string) {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', exerciseId)
      .maybeSingle();
    if (!data) return;
    const ex = data as ExerciseRow;

    if (ex.is_benchmark) {
      // Es benchmark -> ir a variantes
      setSelectedBenchmark(ex);
      await loadVariants(ex.id);
      setStep('variant');
      haptic.medium();
    } else if (ex.parent_exercise_id) {
      // Es variante -> buscar su benchmark padre y ir a log
      const { data: parent } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', ex.parent_exercise_id)
        .maybeSingle();
      if (parent) setSelectedBenchmark(parent as ExerciseRow);
      setSelectedVariant(ex);
      setStep('log');
      haptic.medium();
    }
  }

  async function loadVariants(benchmarkId: string) {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('parent_exercise_id', benchmarkId)
      .order('name_es');
    setVariants((data as ExerciseRow[]) || []);
  }

  // === ACCIONES DE NAVEGACIÓN ===

  function selectBenchmark(bm: ExerciseRow) {
    haptic.medium();
    setSelectedBenchmark(bm);
    loadVariants(bm.id);
    setStep('variant');
  }

  function selectVariant(v: ExerciseRow) {
    haptic.medium();
    setSelectedVariant(v);
    setSets([{ id: generateUUID(), reps: '', weight: '', rir: '' }]);
    setStep('log');
  }

  function selectBenchmarkAsVariant() {
    // Loguear el benchmark mismo como "oficial"
    if (!selectedBenchmark) return;
    haptic.medium();
    setSelectedVariant(selectedBenchmark);
    setSets([{ id: generateUUID(), reps: '', weight: '', rir: '' }]);
    setStep('log');
  }

  function goBack() {
    haptic.medium();
    if (step === 'log') {
      setSelectedVariant(null);
      setStep('variant');
    } else if (step === 'variant') {
      setSelectedBenchmark(null);
      setVariants([]);
      setStep('benchmark');
    }
  }

  // === SETS ===

  function addSet() {
    haptic.light();
    setSets(prev => [...prev, { id: generateUUID(), reps: '', weight: '', rir: '' }]);
  }

  function removeSet(index: number) {
    haptic.light();
    setSets(prev => prev.filter((_, i) => i !== index));
  }

  function updateSet(index: number, field: keyof SetEntry, value: string) {
    setSets(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  // === GUARDAR ===

  async function handleSave() {
    if (!selectedVariant || !user) return;

    const validSets = sets.filter(s => {
      const reps = parseInt(s.reps, 10);
      return reps > 0;
    });

    if (validSets.length === 0) {
      Alert.alert('Error', 'Agrega al menos un set con repeticiones.');
      return;
    }

    try {
      setSaving(true);
      const today = getLocalToday();
      const now = new Date().toISOString();

      // Insertar exercise_logs
      const rows = validSets.map((s, i) => ({
        id: generateUUID(),
        user_id: user.id,
        exercise_id: selectedVariant.id,
        set_number: i + 1,
        reps: parseInt(s.reps, 10),
        weight_kg: s.weight ? parseFloat(s.weight) : null,
        rir: s.rir ? parseInt(s.rir, 10) : null,
        rpe: null,
        logged_at: now,
        date: today,
      }));

      const { error } = await supabase.from('exercise_logs').insert(rows);
      if (error) throw error;

      // Detección de PR
      await checkForPR(selectedVariant.id, validSets);

      haptic.success();
      DeviceEventEmitter.emit('day_changed');

      Alert.alert(
        'Guardado',
        `${validSets.length} set(s) de ${selectedVariant.name_es} registrados.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudieron guardar los sets.');
    } finally {
      setSaving(false);
    }
  }

  async function checkForPR(exerciseId: string, validSets: SetEntry[]) {
    if (!user) return;

    // Calcular el mejor 1RM de los sets nuevos
    let best1RM = 0;
    for (const s of validSets) {
      const w = parseFloat(s.weight);
      const r = parseInt(s.reps, 10);
      if (w > 0 && r > 0) {
        const rm = calc1RM(w, r);
        if (rm > best1RM) best1RM = rm;
      }
    }
    if (best1RM <= 0) return;

    // Comparar con PR existente
    const { data: existing } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
      .maybeSingle();

    if (!existing || best1RM > (existing as PRRow).estimated_1rm) {
      // Upsert nuevo PR
      const bestSet = validSets.reduce((best, s) => {
        const w = parseFloat(s.weight);
        const r = parseInt(s.reps, 10);
        const rm = (w > 0 && r > 0) ? calc1RM(w, r) : 0;
        const bw = parseFloat(best.weight);
        const br = parseInt(best.reps, 10);
        const brm = (bw > 0 && br > 0) ? calc1RM(bw, br) : 0;
        return rm > brm ? s : best;
      });
      const w = parseFloat(bestSet.weight);
      const r = parseInt(bestSet.reps, 10);

      await supabase.from('personal_records').upsert({
        user_id: user.id,
        exercise_id: exerciseId,
        weight_kg: w,
        rep_range: r,
        estimated_1rm: Math.round(best1RM * 10) / 10,
        achieved_at: new Date().toISOString(),
      }, { onConflict: 'user_id,exercise_id' });

      // Alerta de nuevo récord (se muestra antes del alert de guardado)
      setTimeout(() => {
        Alert.alert('🏆 ¡NUEVO RECORD!', `1RM estimado: ${best1RM.toFixed(1)} kg`);
      }, 500);
    }
  }

  // === MÉTODO COMPLETADO (3-5, EMOM, Myo Reps) ===

  async function handleMethodComplete(result: any) {
    haptic.success();

    if (!selectedVariant || !user) return;

    const today = getLocalToday();
    const now = new Date().toISOString();

    try {
      // Guardar sets según el método
      let rows: any[] = [];

      if (result.sets) {
        // Method 3-5 → array de { weight, reps, feedback }
        rows = result.sets.map((s: any, i: number) => ({
          id: generateUUID(),
          user_id: user.id,
          exercise_id: selectedVariant.id,
          set_number: i + 1,
          reps: s.reps,
          weight_kg: s.weight,
          rir: null,
          rpe: null,
          logged_at: now,
          date: today,
          metadata: { method: selectedMethod, feedback: s.feedback },
        }));
      } else if (result.rounds) {
        // EMOM Auto → rounds array + debt
        rows = result.rounds.map((reps: number, i: number) => ({
          id: generateUUID(),
          user_id: user.id,
          exercise_id: selectedVariant.id,
          set_number: i + 1,
          reps,
          weight_kg: null,
          rir: null,
          rpe: null,
          logged_at: now,
          date: today,
          metadata: { method: 'emom_auto', debt: result.debt, weightFeedback: result.weightFeedback },
        }));
      } else if (result.overloadSets) {
        // Myo Reps → activation + overloads
        const activation = {
          id: generateUUID(),
          user_id: user.id,
          exercise_id: selectedVariant.id,
          set_number: 1,
          reps: result.activationReps,
          weight_kg: null,
          rir: null,
          rpe: null,
          logged_at: now,
          date: today,
          metadata: { method: 'myo_reps', type: 'activation' },
        };
        const overloads = result.overloadSets.map((reps: number, i: number) => ({
          id: generateUUID(),
          user_id: user.id,
          exercise_id: selectedVariant.id,
          set_number: i + 2,
          reps,
          weight_kg: null,
          rir: null,
          rpe: null,
          logged_at: now,
          date: today,
          metadata: { method: 'myo_reps', type: 'overload', failedAt: result.failedAt },
        }));
        rows = [activation, ...overloads];
      }

      if (rows.length > 0) {
        const { error } = await supabase.from('exercise_logs').insert(rows);
        if (error) throw error;
      }

      // Award electron
      await awardBooleanElectron(user.id, 'strength');
      DeviceEventEmitter.emit('electrons_changed');
      DeviceEventEmitter.emit('day_changed');

      // Mostrar feedback de peso
      const feedback = result.weightFeedback || result.sets?.[result.sets.length - 1]?.feedback;
      if (feedback) {
        Alert.alert('Ajuste de peso', feedback, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        router.back();
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudieron guardar los datos del método.');
    }
  }

  // === AGREGAR VARIANTE ===

  async function handleAddVariant() {
    if (!selectedBenchmark || !newVariantName.trim()) return;

    const equipArr = newVariantEquipment.trim()
      ? newVariantEquipment.split(',').map(e => e.trim()).filter(Boolean)
      : selectedBenchmark.equipment_list;

    const { data, error } = await supabase.from('exercises').insert({
      id: generateUUID(),
      name: newVariantName.trim(),
      name_es: newVariantName.trim(),
      is_benchmark: false,
      parent_exercise_id: selectedBenchmark.id,
      muscle_groups: selectedBenchmark.muscle_groups,
      equipment_list: equipArr,
      instructions: null,
    }).select().single();

    if (error) {
      Alert.alert('Error', 'No se pudo crear la variante.');
      return;
    }

    haptic.success();
    setVariants(prev => [...prev, data as ExerciseRow]);
    setNewVariantName('');
    setNewVariantEquipment('');
    setVariantModalVisible(false);
  }

  // === EJERCICIO ACTIVO (para el logger) ===

  const activeExercise = selectedVariant || selectedBenchmark;
  const activePR = activeExercise ? prs[activeExercise.id] : null;

  // === RENDER ===

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Registrar"
        rightAction={
          (step === 'variant' || step === 'log') ? (
            <Pressable onPress={goBack} hitSlop={8} style={s.backStep}>
              <Ionicons name="arrow-back" size={16} color="#a8e02a" />
              <Text style={s.backStepText}>Cambiar</Text>
            </Pressable>
          ) : <View style={{ width: 44 }} />
        }
      />

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ========== PASO 1: BENCHMARKS ========== */}
        {step === 'benchmark' && (
          <Animated.View entering={FadeInUp.duration(300)}>
            <EliteText variant="label" style={s.stepLabel}>
              SELECCIONA UN EJERCICIO
            </EliteText>

            {loading ? (
              <EliteText variant="body" style={s.loadingText}>Cargando...</EliteText>
            ) : benchmarks.length === 0 ? (
              <EliteText variant="body" style={s.emptyText}>
                No hay ejercicios benchmark configurados.
              </EliteText>
            ) : (
              benchmarks.map((bm, i) => {
                const pr = prs[bm.id];
                return (
                  <AnimatedPressable
                    key={bm.id}
                    onPress={() => selectBenchmark(bm)}
                    style={s.benchmarkCard}
                  >
                    <View style={s.benchmarkRow}>
                      <View style={s.benchmarkInfo}>
                        <EliteText variant="subtitle" style={s.benchmarkName}>
                          {bm.name_es}
                        </EliteText>
                        <EliteText variant="caption" style={s.muscleText}>
                          {(bm.muscle_groups || []).join(' / ')}
                        </EliteText>
                      </View>
                      {pr && (
                        <View style={s.prBadge}>
                          <Ionicons name="trophy" size={14} color="#fbbf24" />
                          <Text style={s.prText}>{pr.estimated_1rm.toFixed(0)} kg</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={18} color="#555" />
                    </View>
                  </AnimatedPressable>
                );
              })
            )}
          </Animated.View>
        )}

        {/* ========== PASO 2: VARIANTES ========== */}
        {step === 'variant' && selectedBenchmark && (
          <Animated.View entering={FadeInUp.duration(300)}>
            <EliteText variant="label" style={s.stepLabel}>
              ELIGE VARIANTE
            </EliteText>

            {/* Benchmark oficial (estrella) */}
            <AnimatedPressable
              onPress={selectBenchmarkAsVariant}
              style={s.officialCard}
            >
              <View style={s.officialRow}>
                <Ionicons name="star" size={18} color="#fbbf24" />
                <View style={s.officialInfo}>
                  <View style={s.officialNameRow}>
                    <EliteText variant="subtitle" style={s.officialName}>
                      {selectedBenchmark.name_es}
                    </EliteText>
                    <View style={s.officialBadge}>
                      <Text style={s.officialBadgeText}>OFICIAL</Text>
                    </View>
                  </View>
                  <EliteText variant="caption" style={s.muscleText}>
                    {(selectedBenchmark.muscle_groups || []).join(' / ')}
                  </EliteText>
                </View>
                {prs[selectedBenchmark.id] && (
                  <View style={s.prBadge}>
                    <Ionicons name="trophy" size={14} color="#fbbf24" />
                    <Text style={s.prText}>
                      {prs[selectedBenchmark.id].estimated_1rm.toFixed(0)} kg
                    </Text>
                  </View>
                )}
              </View>
            </AnimatedPressable>

            {/* Variantes */}
            {variants.map(v => (
              <AnimatedPressable
                key={v.id}
                onPress={() => selectVariant(v)}
                style={s.variantCard}
              >
                <View style={s.variantRow}>
                  <View style={s.variantInfo}>
                    <EliteText variant="body" style={s.variantName}>
                      {v.name_es}
                    </EliteText>
                    <EliteText variant="caption" style={s.equipmentText}>
                      {(v.equipment_list || []).join(', ')}
                    </EliteText>
                  </View>
                  {prs[v.id] && (
                    <View style={s.prBadge}>
                      <Ionicons name="trophy" size={14} color="#fbbf24" />
                      <Text style={s.prText}>
                        {prs[v.id].estimated_1rm.toFixed(0)} kg
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#555" />
                </View>
              </AnimatedPressable>
            ))}

            {/* Agregar variante */}
            <AnimatedPressable
              onPress={() => { haptic.light(); setVariantModalVisible(true); }}
              style={s.addVariantBtn}
            >
              <Ionicons name="add-circle-outline" size={20} color="#a8e02a" />
              <EliteText variant="body" style={s.addVariantText}>
                Agregar variante
              </EliteText>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* ========== PASO 3: LOG DE SETS ========== */}
        {step === 'log' && activeExercise && (
          <Animated.View entering={FadeInUp.duration(300)}>
            {/* Header del ejercicio */}
            <GradientCard style={s.exerciseHeader}>
              <View style={s.exerciseHeaderRow}>
                <Ionicons name="barbell-outline" size={22} color="#a8e02a" />
                <View style={s.exerciseHeaderInfo}>
                  <EliteText variant="subtitle">{activeExercise.name_es}</EliteText>
                  <EliteText variant="caption" style={s.muscleText}>
                    {(activeExercise.muscle_groups || []).join(' / ')}
                    {(activeExercise.equipment_list || []).length > 0 &&
                      ` \u00B7 ${activeExercise.equipment_list.join(', ')}`}
                  </EliteText>
                </View>
              </View>
              {activePR && (
                <View style={s.prHeaderRow}>
                  <Ionicons name="trophy" size={16} color="#fbbf24" />
                  <Text style={s.prHeaderText}>
                    PR: {activePR.weight_kg} kg x {activePR.rep_range} reps
                    ({activePR.estimated_1rm.toFixed(1)} kg 1RM)
                  </Text>
                </View>
              )}
            </GradientCard>

            {/* Selector de método */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: '#999', fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 8 }}>MÉTODO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {Object.values(TRAINING_METHODS).map(method => (
                    <Pressable
                      key={method.id}
                      onPress={() => {
                        setSelectedMethod(method.id as TrainingMethodId);
                        haptic.light();
                      }}
                    >
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: selectedMethod === method.id ? `${method.color}20` : '#1a1a1a',
                        borderWidth: 1,
                        borderColor: selectedMethod === method.id ? method.color : '#333',
                      }}>
                        <Ionicons name={method.icon as any} size={14} color={selectedMethod === method.id ? method.color : '#666'} />
                        <Text style={{ color: selectedMethod === method.id ? method.color : '#666', fontSize: 12, fontWeight: '600' }}>
                          {method.name}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* === MÉTODO ESTÁNDAR (set logger original) === */}
            {selectedMethod === 'standard' && (<>

            {/* Encabezados de columnas */}
            <View style={s.colHeaders}>
              <View style={s.colSet}><Text style={s.colLabel}>SET</Text></View>
              <View style={s.colWeight}><Text style={s.colLabel}>KG</Text></View>
              <View style={s.colReps}><Text style={s.colLabel}>REPS</Text></View>
              <View style={s.colRir}><Text style={s.colLabel}>RIR</Text></View>
              <View style={s.col1rm}><Text style={s.colLabel}>1RM</Text></View>
              <View style={{ width: 28 }} />
            </View>

            {/* Sets */}
            {sets.map((set, index) => {
              const w = parseFloat(set.weight);
              const r = parseInt(set.reps, 10);
              const live1RM = (w > 0 && r > 0) ? calc1RM(w, r) : 0;

              return (
                <Animated.View
                  key={set.id}
                  entering={FadeInUp.delay(index * 50).duration(250)}
                  style={s.setRow}
                >
                  {/* Número de set */}
                  <View style={s.colSet}>
                    <View style={[
                      s.setCircle,
                      (w > 0 && r > 0) && s.setCircleComplete,
                    ]}>
                      <Text style={[
                        s.setCircleText,
                        (w > 0 && r > 0) && s.setCircleTextComplete,
                      ]}>
                        {index + 1}
                      </Text>
                    </View>
                  </View>

                  {/* Peso */}
                  <View style={s.colWeight}>
                    <TextInput
                      style={s.input}
                      value={set.weight}
                      onChangeText={v => updateSet(index, 'weight', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#444"
                      maxLength={6}
                    />
                  </View>

                  {/* Reps */}
                  <View style={s.colReps}>
                    <TextInput
                      style={s.input}
                      value={set.reps}
                      onChangeText={v => updateSet(index, 'reps', v)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="#444"
                      maxLength={3}
                    />
                  </View>

                  {/* RIR */}
                  <View style={s.colRir}>
                    <TextInput
                      style={[s.input, s.rirInput]}
                      value={set.rir}
                      onChangeText={v => updateSet(index, 'rir', v)}
                      keyboardType="number-pad"
                      placeholder="-"
                      placeholderTextColor="#444"
                      maxLength={2}
                    />
                  </View>

                  {/* 1RM en vivo */}
                  <View style={s.col1rm}>
                    <Text style={s.live1rmText}>
                      {live1RM > 0 ? live1RM.toFixed(0) : '-'}
                    </Text>
                  </View>

                  {/* Eliminar */}
                  <View style={{ width: 28, alignItems: 'center' }}>
                    {sets.length > 1 && (
                      <Pressable onPress={() => removeSet(index)} hitSlop={8}>
                        <Ionicons name="close-circle" size={18} color="#ef4444" />
                      </Pressable>
                    )}
                  </View>
                </Animated.View>
              );
            })}

            {/* Agregar set */}
            <AnimatedPressable onPress={addSet} style={s.addSetBtn}>
              <Ionicons name="add-circle-outline" size={20} color="#a8e02a" />
              <EliteText variant="body" style={s.addSetText}>
                Agregar set
              </EliteText>
            </AnimatedPressable>

            {/* Botón guardar */}
            <AnimatedPressable
              onPress={handleSave}
              disabled={saving}
              style={[s.saveBtn, saving && { opacity: 0.5 }]}
            >
              <Ionicons
                name={saving ? 'hourglass-outline' : 'checkmark-circle'}
                size={22}
                color="#000"
              />
              <Text style={s.saveBtnText}>
                {saving ? 'GUARDANDO...' : 'GUARDAR'}
              </Text>
            </AnimatedPressable>

            </>)}

            {/* === MÉTODO 3-5 === */}
            {selectedMethod === 'method_3_5' && (
              <Method35
                exerciseName={activeExercise.name_es}
                userLevel="intermediate"
                lastWeight={activePR?.weight_kg}
                onComplete={(sets) => handleMethodComplete({ sets })}
              />
            )}

            {/* === EMOM AUTO === */}
            {selectedMethod === 'emom_auto' && (
              <EMOMAuto
                exerciseName={activeExercise.name_es}
                userLevel="intermediate"
                onComplete={handleMethodComplete}
              />
            )}

            {/* === MYO REPS === */}
            {selectedMethod === 'myo_reps' && (
              <MyoReps
                exerciseName={activeExercise.name_es}
                onComplete={handleMethodComplete}
              />
            )}

          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ========== MODAL: AGREGAR VARIANTE ========== */}
      <Modal
        visible={variantModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVariantModalVisible(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setVariantModalVisible(false)}
        >
          <Pressable style={s.modalContent} onPress={() => {}}>
            <EliteText variant="subtitle" style={s.modalTitle}>
              Nueva variante
            </EliteText>
            {selectedBenchmark && (
              <EliteText variant="caption" style={s.modalSubtitle}>
                Variante de {selectedBenchmark.name_es}
              </EliteText>
            )}

            <Text style={s.modalLabel}>Nombre</Text>
            <TextInput
              style={s.modalInput}
              value={newVariantName}
              onChangeText={setNewVariantName}
              placeholder="Ej: Press banca inclinado con mancuernas"
              placeholderTextColor="#555"
              autoFocus
            />

            <Text style={s.modalLabel}>Equipamiento (separado por comas)</Text>
            <TextInput
              style={s.modalInput}
              value={newVariantEquipment}
              onChangeText={setNewVariantEquipment}
              placeholder="Ej: mancuernas, banco inclinado"
              placeholderTextColor="#555"
            />

            <View style={s.modalActions}>
              <Pressable
                onPress={() => setVariantModalVisible(false)}
                style={s.modalCancel}
              >
                <Text style={s.modalCancelText}>Cancelar</Text>
              </Pressable>
              <AnimatedPressable
                onPress={handleAddVariant}
                disabled={!newVariantName.trim()}
                style={[s.modalSave, !newVariantName.trim() && { opacity: 0.4 }]}
              >
                <Text style={s.modalSaveText}>Agregar</Text>
              </AnimatedPressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },

  // --- Navegación entre pasos ---
  backStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  backStepText: {
    color: '#a8e02a',
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },

  // --- Comunes ---
  stepLabel: {
    color: '#a8e02a',
    letterSpacing: 2,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  loadingText: {
    color: '#666',
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  muscleText: {
    color: '#888',
    marginTop: 2,
  },
  equipmentText: {
    color: '#666',
    marginTop: 2,
  },

  // --- Paso 1: Benchmarks ---
  benchmarkCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  benchmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benchmarkInfo: { flex: 1 },
  benchmarkName: {
    fontSize: FontSizes.md,
  },

  // --- PR badge ---
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fbbf2415',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  prText: {
    color: '#fbbf24',
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
  },

  // --- Paso 2: Variantes ---
  officialCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#fbbf2440',
  },
  officialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  officialInfo: { flex: 1 },
  officialNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  officialName: {
    fontSize: FontSizes.md,
  },
  officialBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  officialBadgeText: {
    color: '#000',
    fontFamily: Fonts.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
  variantCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  variantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  variantInfo: { flex: 1 },
  variantName: {
    fontFamily: Fonts.semiBold,
  },
  addVariantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: Radius.card,
    borderStyle: 'dashed',
  },
  addVariantText: {
    color: '#a8e02a',
    fontFamily: Fonts.semiBold,
  },

  // --- Paso 3: Logger ---
  exerciseHeader: {
    marginBottom: Spacing.md,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exerciseHeaderInfo: { flex: 1 },
  prHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  prHeaderText: {
    color: '#fbbf24',
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },

  // --- Columnas de sets ---
  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  colLabel: {
    color: '#555',
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    textAlign: 'center',
  },
  colSet: { width: 36, alignItems: 'center' },
  colWeight: { flex: 2, alignItems: 'center' },
  colReps: { flex: 1.5, alignItems: 'center' },
  colRir: { width: 44, alignItems: 'center' },
  col1rm: { width: 48, alignItems: 'center' },

  // --- Set row ---
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  setCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCircleComplete: {
    backgroundColor: '#a8e02a',
  },
  setCircleText: {
    color: '#888',
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
  },
  setCircleTextComplete: {
    color: '#000',
  },
  input: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    color: '#fff',
    backgroundColor: '#1a1a1a',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.xs,
    textAlign: 'center',
    width: '100%',
  },
  rirInput: {
    color: '#c084fc',
  },
  live1rmText: {
    color: '#a8e02a',
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: Radius.sm,
    borderStyle: 'dashed',
  },
  addSetText: {
    color: '#a8e02a',
    fontFamily: Fonts.semiBold,
  },

  // --- Save button ---
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#a8e02a',
    borderRadius: Radius.card,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  saveBtnText: {
    color: '#000',
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    letterSpacing: 2,
  },

  // --- Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000cc',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#888',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    color: '#888',
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  modalInput: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
    color: '#fff',
    backgroundColor: '#1a1a1a',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalCancelText: {
    color: '#888',
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  modalSave: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    backgroundColor: '#a8e02a',
  },
  modalSaveText: {
    color: '#000',
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },
});
