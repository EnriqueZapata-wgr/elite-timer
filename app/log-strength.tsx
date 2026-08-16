/**
 * Log Strength — registro RETRO de fuerza en 3 pasos (Ola 2 Fitness PR2,
 * ANEXO_B_FITNESS §3; ex /log-exercise, adelgazado).
 *
 * Flujo:
 * 1. benchmark  → Lista de ejercicios benchmark (is_benchmark=true)
 * 2. variant    → Benchmark oficial + sus variantes, opción de agregar
 * 3. log        → Logger de sets con peso/reps/RIR y cálculo 1RM en vivo
 *
 * Qué perdió a propósito: los method-runners (3-5 / EMOM / Myo-reps + voz).
 * Entrenar EN VIVO es del runner /session; aquí solo se registra lo hecho.
 * Dueño de escritura: saveWorkoutSession() — un solo escritor de fuerza
 * (workout_sessions + exercise_logs + PRs + señal Edad ATP).
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, StyleSheet, TextInput, Alert,
  Modal, Pressable, Text, DeviceEventEmitter,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { InfoButton } from '@/src/components/InfoButton';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { useAuth } from '@/src/contexts/auth-context';
import { generateUUID } from '@/src/services/routine-service';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import {
  ATP_BRAND, TEXT, TEXT_COLORS, BORDER, ELEVATION, SEMANTIC, CATEGORY_COLORS, withOpacity,
} from '@/src/constants/brand';
import { ThemeReady, useAppTheme } from '@/src/contexts/theme-context';
import { saveWorkoutSession } from '@/src/services/fitness/workout-session-service';
import type { SessionSet } from '@/src/services/fitness/workout-session-core';
import { awardBooleanElectron } from '@/src/services/electron-service';

// === TIPOS LOCALES ===

/**
 * FIX-215: techo de la carga. supabase no configura timeout de fetch, así que
 * sin esto "Cargando..." no tenía salida. Mismo número que /session.
 */
const TECHO_CARGA_MS = 12000;

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
  /** Traza al catálogo matriceado (MB-3) — permite derivar la prescripción EMOM. */
  matrix_slug?: string | null;
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

export default function LogStrengthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string }>();
  const { user } = useAuth();
  // MB-31B3: la pantalla migró a tokens y sigue el tema global.
  const { kind, tokens: tk } = useAppTheme();
  // Regla 1 de la guía: lima como TEXTO no sobrevive el claro → teal calibrado.
  const acento = kind === 'dark' ? ATP_BRAND.lime : tk.tealTexto;
  const secTxt = { color: tk.textoSecundario };

  // --- Estado de flujo ---
  const [step, setStep] = useState<Step>('benchmark');
  const [benchmarks, setBenchmarks] = useState<ExerciseRow[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<ExerciseRow | null>(null);
  const [variants, setVariants] = useState<ExerciseRow[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ExerciseRow | null>(null);
  const [prs, setPrs] = useState<Record<string, PRRow>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // --- Búsqueda de ejercicios ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // --- Estado del logger ---
  const [sets, setSets] = useState<SetEntry[]>([
    { id: generateUUID(), reps: '', weight: '', rir: '' },
  ]);
  const [saving, setSaving] = useState(false);
  // Ola 2 PR2: la "sesión de registro" abre al montar — saveWorkoutSession
  // recibe un rango honesto (tiempo en pantalla, no un entreno inventado).
  const startedAtRef = useRef(new Date());

  /** FIX-215: salida honesta. Si no hay a dónde regresar, va al hub. */
  const salir = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/fitness-hub');
  };

  // --- Modal de agregar variante ---
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantEquipment, setNewVariantEquipment] = useState('');

  // === CARGA INICIAL ===

  useEffect(() => {
    loadBenchmarks();
  }, []);

  // FIX-215: techo de la carga. supabase no configura timeout de fetch, así que
  // una petición que nunca responde deja el await colgado para siempre y ni el
  // try/finally salva: no hay excepción que atrapar. Pasado el techo, la
  // pantalla pasa a error, que sí tiene reintento y salida.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setLoadError('Los ejercicios tardaron demasiado en cargar.');
      setLoading(false);
    }, TECHO_CARGA_MS);
    return () => clearTimeout(t);
  }, [loading]);

  // Si viene con exerciseId, auto-navegar al paso correcto
  useEffect(() => {
    if (!params.exerciseId || benchmarks.length === 0) return;
    autoNavigate(params.exerciseId);
  }, [params.exerciseId, benchmarks]);

  async function loadBenchmarks() {
    setLoading(true);
    setLoadError(null);
    // FIX-215: todo el cuerpo va en try/finally. Antes los await estaban
    // pelones: PostgREST devuelve el error en la respuesta y eso sí se
    // manejaba, pero una excepción de red (offline, DNS, TLS) rechazaba la
    // función y setLoading(false) nunca corría. La pantalla se quedaba en
    // "Cargando..." en gris #555 sobre negro, que es la captura en negro.
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('is_benchmark', true)
        .order('name_es');
      if (error) {
        logWarn('loadBenchmarks error:', error.message);
        setLoadError('No se pudieron cargar los ejercicios.');
        setBenchmarks([]);
        return;
      }
      setBenchmarks((data as ExerciseRow[]) ?? []);
      // Si el techo de carga ya había marcado error y la respuesta llega tarde,
      // gana el dato: sería absurdo enseñar un error con la lista en la mano.
      setLoadError(null);

      // Cargar PRs del usuario
      if (user) {
        const { data: prData, error: prError } = await supabase
          .from('personal_records')
          .select('*')
          .eq('user_id', user.id);
        if (prError) {
          logWarn('loadBenchmarks PR query error:', prError.message);
        } else if (prData) {
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
    } catch (e) {
      logWarn('loadBenchmarks reventó:', e);
      setLoadError('No pudimos conectarnos para traer los ejercicios.');
      setBenchmarks([]);
    } finally {
      setLoading(false);
    }
  }

  async function searchExercises(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) { setSearchResults([]); setSearchError(null); return; }
    setSearching(true);
    setSearchError(null);
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .or(`name.ilike.%${query}%,name_es.ilike.%${query}%`)
      .order('name_es')
      .limit(20);
    if (error) {
      logWarn('searchExercises error:', error.message);
      setSearchResults([]);
      setSearchError('No se pudo buscar: revisa tu conexión.');
    } else {
      setSearchResults((data as ExerciseRow[]) || []);
    }
    setSearching(false);
  }

  function selectSearchResult(ex: ExerciseRow) {
    haptic.medium();
    if (ex.is_benchmark) {
      setSelectedBenchmark(ex);
      loadVariants(ex.id);
      setStep('variant');
    } else {
      // Es variante o standalone — ir directo a log
      setSelectedVariant(ex);
      setSets([{ id: generateUUID(), reps: '', weight: '', rir: '' }]);
      setStep('log');
    }
    setSearchQuery('');
    setSearchResults([]);
  }

  async function handleCreateCustomExercise() {
    if (!searchQuery.trim()) return;
    const name = searchQuery.trim();
    const { data, error } = await supabase.from('exercises').insert({
      id: generateUUID(),
      name,
      name_es: name,
      is_benchmark: false,
      parent_exercise_id: null,
      muscle_groups: [],
      equipment_list: [],
      instructions: null,
    }).select().single();
    if (error) {
      Alert.alert('Error', 'No se pudo crear el ejercicio.');
      return;
    }
    haptic.success();
    selectSearchResult(data as ExerciseRow);
  }

  async function autoNavigate(exerciseId: string) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', exerciseId)
      .maybeSingle();
    if (error) {
      logWarn('autoNavigate error:', error.message);
      Alert.alert('No se pudo cargar el ejercicio', 'Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
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
      const { data: parent, error: parentError } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', ex.parent_exercise_id)
        .maybeSingle();
      if (parentError) logWarn('autoNavigate parent lookup error:', parentError.message);
      if (parent) setSelectedBenchmark(parent as ExerciseRow);
      setSelectedVariant(ex);
      setStep('log');
      haptic.medium();
    }
  }

  async function loadVariants(benchmarkId: string) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('parent_exercise_id', benchmarkId)
      .order('name_es');
    if (error) {
      logWarn('loadVariants error:', error.message);
      Alert.alert('No se pudieron cargar las variantes', 'Revisa tu conexión e inténtalo de nuevo.');
      setVariants([]);
      return;
    }
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
      // REG-1: si el set fue eliminado entre el render y este callback,
      // el index queda fuera de rango. Devolver prev sin mutar evita
      // dejar `undefined` en el array (que crashearía el siguiente .map).
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  // === GUARDAR ===

  // Ola 2 PR2: el dueño de la escritura es saveWorkoutSession() — UN solo
  // escritor de fuerza (workout_sessions + exercise_logs + upsert de PRs +
  // señal Edad ATP). Esta pantalla solo traduce sus inputs a SessionSet[];
  // el RIR y la FK del ejercicio elegido viajan en el set (campos aditivos
  // del core). Ejercicios sin matrix_slug van con slug sintético y
  // fueraDeMatriz (el writer no inventa trazas al catálogo).
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
      const ex = selectedVariant;
      const sesionSets: SessionSet[] = validSets.map((s, i) => {
        // REG-10: peso parseado debe ser finito y razonable; NaN no debe
        // llegar a la DB (columna numérica). Si el input no es válido,
        // guardamos null (set sin peso registrado).
        const wParsed = s.weight ? parseFloat(s.weight) : NaN;
        const weightKg = Number.isFinite(wParsed) && wParsed >= 0 && wParsed <= 1000 ? wParsed : null;
        const rirParsed = s.rir ? parseInt(s.rir, 10) : NaN;
        return {
          slug: ex.matrix_slug ?? `exercise:${ex.id}`,
          nombre: ex.name_es,
          setNumber: i + 1,
          reps: parseInt(s.reps, 10),
          weightKg,
          esIsometrico: false,
          metodo: 'Estándar',
          exerciseId: ex.id,
          fueraDeMatriz: !ex.matrix_slug,
          rir: Number.isFinite(rirParsed) ? rirParsed : null,
        };
      });

      const res = await saveWorkoutSession({
        userId: user.id,
        sets: sesionSets,
        startedAt: startedAtRef.current,
        endedAt: new Date(),
        source: 'manual',
        routineName: `Registro · ${ex.name_es}`,
      });
      if (!res.ok) {
        Alert.alert('Error', res.error ?? 'No se pudieron guardar los sets.');
        return;
      }

      haptic.success();
      // MB-3 3B: award EAGER de strength (como cardio en log-cardio) — antes el
      // electrón llegaba diferido vía reconcile del siguiente compileDay y la
      // card de HOY no palomeaba al instante. exercise_logs ya respalda el
      // verificado, así que el award es idempotente y consistente.
      try {
        await awardBooleanElectron(user.id, 'strength');
      } catch { /* fail-soft: el reconcile lo recoge */ }
      DeviceEventEmitter.emit('electrons_changed');
      DeviceEventEmitter.emit('day_changed');

      // El PR lo detectó el writer (mismo Epley de siempre) — se celebra antes
      // del alert de guardado, como en el flujo viejo.
      const mejorPR = res.prs?.[0];
      if (mejorPR) {
        setTimeout(() => {
          Alert.alert('🏆 ¡NUEVO RÉCORD!', `1RM estimado: ${mejorPR.new1RM.toFixed(1)} kg`);
        }, 500);
      }

      Alert.alert(
        'Guardado',
        `${validSets.length} set(s) de ${ex.name_es} registrados.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert('Error', 'No se pudieron guardar los sets.');
    } finally {
      setSaving(false);
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
    <ThemeReady>
    <View style={[s.screen, { backgroundColor: tk.fondo }]}>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <ScreenHeader
        title="Registrar"
        // FIX-215: sin onBack, BackButton cae en router.back(), que en un deep
        // link sin historial no hace nada y deja al usuario encerrado.
        onBack={salir}
        rightAction={
          (step === 'variant' || step === 'log') ? (
            <AnimatedPressable onPress={goBack} hitSlop={8} style={s.backStep}>
              <Ionicons name="arrow-back" size={16} color={ATP_BRAND.lime} />
              <Text style={[s.backStepText, { color: acento }]}>Cambiar</Text>
            </AnimatedPressable>
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
            <EliteText variant="label" style={[s.stepLabel, { color: acento }]}>
              SELECCIONA UN EJERCICIO
            </EliteText>

            {/* Buscador */}
            <View style={{ marginBottom: Spacing.md }}>
              <TextInput
                style={[s.input, { color: tk.texto, backgroundColor: tk.flotante, textAlign: 'left', paddingHorizontal: Spacing.md }]}
                value={searchQuery}
                onChangeText={searchExercises}
                placeholder="Buscar ejercicio..."
                placeholderTextColor={tk.textoTenue}
                returnKeyType="search"
              />
              {searchResults.length > 0 && (
                <View style={{ marginTop: Spacing.xs }}>
                  {searchResults.map(ex => (
                    <AnimatedPressable key={ex.id} onPress={() => selectSearchResult(ex)} style={[s.benchmarkCard, { backgroundColor: tk.hundido }]}>
                      <View style={s.benchmarkRow}>
                        <View style={s.benchmarkInfo}>
                          <EliteText variant="subtitle" style={s.benchmarkName}>{ex.name_es}</EliteText>
                          <EliteText variant="caption" style={[s.muscleText, secTxt]}>
                            {(ex.muscle_groups || []).join(' / ')}
                            {ex.is_benchmark ? '' : ' · Variante'}
                          </EliteText>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={tk.textoTenue} />
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>
              )}
              {searchError && (
                <EliteText variant="caption" style={[s.emptyText, { color: tk.textoTenue, marginTop: Spacing.sm }]}>
                  {searchError}
                </EliteText>
              )}
              {!searchError && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
                <AnimatedPressable onPress={handleCreateCustomExercise} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.md, marginTop: Spacing.xs }}>
                  <Ionicons name="add-circle-outline" size={20} color={ATP_BRAND.lime} />
                  <Text style={{ color: acento, fontSize: 14 }}>Crear &quot;{searchQuery.trim()}&quot;</Text>
                </AnimatedPressable>
              )}
            </View>

            {loading ? (
              <EliteText variant="body" style={[s.loadingText, { color: tk.textoTenue }]}>Cargando...</EliteText>
            ) : loadError ? (
              // FIX-215: el error se leía en textoTenue (#555 sobre negro, ~2.2:1)
              // y sin ícono. Ahora usa el estado compartido, con el coral de error.
              <EmptyState
                icon="cloud-offline-outline"
                title="No pudimos traer los ejercicios"
                subtitle={`${loadError} Revisa tu conexión e inténtalo otra vez.`}
                actionLabel="Reintentar"
                onAction={loadBenchmarks}
                color={tk.error}
              />
            ) : benchmarks.length === 0 ? (
              // Vacío honesto y distinto del error: aquí sí leímos, y no hay nada.
              <EmptyState
                icon="fitness-outline"
                title="Todavía no hay ejercicios que registrar"
                subtitle="No encontramos ejercicios de referencia. Búscalo arriba o créalo, y aquí queda tu registro."
                actionLabel="Ir a Fitness"
                onAction={() => router.replace('/fitness-hub')}
                color={acento}
              />
            ) : (
              benchmarks.map((bm, i) => {
                const pr = prs[bm.id];
                return (
                  <AnimatedPressable
                    key={bm.id}
                    onPress={() => selectBenchmark(bm)}
                    style={[s.benchmarkCard, { backgroundColor: tk.hundido }]}
                  >
                    <View style={s.benchmarkRow}>
                      <View style={s.benchmarkInfo}>
                        <EliteText variant="subtitle" style={s.benchmarkName}>
                          {bm.name_es}
                        </EliteText>
                        <EliteText variant="caption" style={[s.muscleText, secTxt]}>
                          {(bm.muscle_groups || []).join(' / ')}
                        </EliteText>
                      </View>
                      {pr && (
                        <View style={s.prBadge}>
                          <Ionicons name="trophy" size={14} color={SEMANTIC.acceptable} />
                          <Text style={s.prText}>{pr.estimated_1rm.toFixed(0)} kg</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={tk.textoTenue} />
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
            <EliteText variant="label" style={[s.stepLabel, { color: acento }]}>
              ELIGE VARIANTE
            </EliteText>

            {/* Benchmark oficial (estrella) */}
            <AnimatedPressable
              onPress={selectBenchmarkAsVariant}
              style={[s.officialCard, { backgroundColor: tk.hundido }]}
            >
              <View style={s.officialRow}>
                <Ionicons name="star" size={18} color={SEMANTIC.acceptable} />
                <View style={s.officialInfo}>
                  <View style={s.officialNameRow}>
                    <EliteText variant="subtitle" style={s.officialName}>
                      {selectedBenchmark.name_es}
                    </EliteText>
                    <View style={s.officialBadge}>
                      <Text style={s.officialBadgeText}>OFICIAL</Text>
                    </View>
                  </View>
                  <EliteText variant="caption" style={[s.muscleText, secTxt]}>
                    {(selectedBenchmark.muscle_groups || []).join(' / ')}
                  </EliteText>
                </View>
                {prs[selectedBenchmark.id] && (
                  <View style={s.prBadge}>
                    <Ionicons name="trophy" size={14} color={SEMANTIC.acceptable} />
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
                style={[s.variantCard, { backgroundColor: tk.hundido }]}
              >
                <View style={s.variantRow}>
                  <View style={s.variantInfo}>
                    <EliteText variant="body" style={s.variantName}>
                      {v.name_es}
                    </EliteText>
                    <EliteText variant="caption" style={[s.equipmentText, { color: tk.textoTenue }]}>
                      {(v.equipment_list || []).join(', ')}
                    </EliteText>
                  </View>
                  {prs[v.id] && (
                    <View style={s.prBadge}>
                      <Ionicons name="trophy" size={14} color={SEMANTIC.acceptable} />
                      <Text style={s.prText}>
                        {prs[v.id].estimated_1rm.toFixed(0)} kg
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={tk.textoTenue} />
                </View>
              </AnimatedPressable>
            ))}

            {/* Agregar variante */}
            <AnimatedPressable
              onPress={() => { haptic.light(); setVariantModalVisible(true); }}
              style={s.addVariantBtn}
            >
              <Ionicons name="add-circle-outline" size={20} color={ATP_BRAND.lime} />
              <EliteText variant="body" style={[s.addVariantText, { color: acento }]}>
                Agregar variante
              </EliteText>
            </AnimatedPressable>
          </Animated.View>
        )}

        {/* ========== PASO 3: LOG DE SETS ========== */}
        {step === 'log' && activeExercise && (
          <Animated.View entering={FadeInUp.duration(300)}>
            {/* Header del ejercicio \u2014 GradientCard plano: sigue OSCURO (componente
                compartido sin tematizar), as\u00ED que su texto se queda claro fijo. */}
            <GradientCard style={s.exerciseHeader}>
              <View style={s.exerciseHeaderRow}>
                <Ionicons name="barbell-outline" size={22} color={ATP_BRAND.lime} />
                <View style={s.exerciseHeaderInfo}>
                  <EliteText variant="subtitle" style={{ color: TEXT_COLORS.primary }}>{activeExercise.name_es}</EliteText>
                  <EliteText variant="caption" style={[s.muscleText, { color: TEXT.secondary }]}>
                    {(activeExercise.muscle_groups || []).join(' / ')}
                    {(activeExercise.equipment_list || []).length > 0 &&
                      ` \u00B7 ${activeExercise.equipment_list.join(', ')}`}
                  </EliteText>
                </View>
              </View>
              {activePR && (
                <View style={s.prHeaderRow}>
                  <Ionicons name="trophy" size={16} color={SEMANTIC.acceptable} />
                  <Text style={s.prHeaderText}>
                    PR: {activePR.weight_kg} kg x {activePR.rep_range} reps
                    ({activePR.estimated_1rm.toFixed(1)} kg 1RM)
                  </Text>
                </View>
              )}
            </GradientCard>

            {/* Encabezados de columnas */}
            <View style={s.colHeaders}>
              <View style={s.colSet}><Text style={[s.colLabel, { color: tk.textoTenue }]}>SERIE</Text></View>
              <View style={s.colWeight}><Text style={[s.colLabel, { color: tk.textoTenue }]}>KG</Text></View>
              <View style={s.colReps}><Text style={[s.colLabel, { color: tk.textoTenue }]}>REPS</Text></View>
              <View style={[s.colRir, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }]}>
                <Text style={[s.colLabel, { color: tk.textoTenue }]}>RIR</Text>
                <InfoButton title="RIR" explanation="Reps in Reserve: repeticiones que podrías hacer antes del fallo. RIR 2 = podrías hacer 2 más." color={tk.textoSecundario} size={11} />
              </View>
              <View style={s.col1rm}><Text style={[s.colLabel, { color: tk.textoTenue }]}>1RM</Text></View>
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
                  style={[s.setRow, { backgroundColor: tk.hundido }]}
                >
                  {/* Número de set */}
                  <View style={s.colSet}>
                    <View style={[
                      s.setCircle,
                      { backgroundColor: tk.flotante },
                      (w > 0 && r > 0) && s.setCircleComplete,
                    ]}>
                      <Text style={[
                        s.setCircleText,
                        secTxt,
                        (w > 0 && r > 0) && s.setCircleTextComplete,
                      ]}>
                        {index + 1}
                      </Text>
                    </View>
                  </View>

                  {/* Peso */}
                  <View style={s.colWeight}>
                    <TextInput
                      style={[s.input, { color: tk.texto, backgroundColor: tk.flotante }]}
                      value={set.weight}
                      onChangeText={v => updateSet(index, 'weight', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={tk.sinDatos}
                      maxLength={6}
                    />
                  </View>

                  {/* Reps */}
                  <View style={s.colReps}>
                    <TextInput
                      style={[s.input, { color: tk.texto, backgroundColor: tk.flotante }]}
                      value={set.reps}
                      onChangeText={v => updateSet(index, 'reps', v)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={tk.sinDatos}
                      maxLength={3}
                    />
                  </View>

                  {/* RIR */}
                  <View style={s.colRir}>
                    <TextInput
                      style={[s.input, { backgroundColor: tk.flotante }, s.rirInput]}
                      value={set.rir}
                      onChangeText={v => updateSet(index, 'rir', v)}
                      keyboardType="number-pad"
                      placeholder="-"
                      placeholderTextColor={tk.sinDatos}
                      maxLength={2}
                    />
                  </View>

                  {/* 1RM en vivo */}
                  <View style={s.col1rm}>
                    <Text style={[s.live1rmText, { color: acento }]}>
                      {live1RM > 0 ? live1RM.toFixed(0) : '-'}
                    </Text>
                  </View>

                  {/* Eliminar */}
                  <View style={{ width: 28, alignItems: 'center' }}>
                    {sets.length > 1 && (
                      <AnimatedPressable onPress={() => removeSet(index)} hitSlop={8}>
                        <Ionicons name="close-circle" size={18} color={SEMANTIC.error} />
                      </AnimatedPressable>
                    )}
                  </View>
                </Animated.View>
              );
            })}

            {/* Agregar set */}
            <AnimatedPressable onPress={addSet} style={s.addSetBtn}>
              <Ionicons name="add-circle-outline" size={20} color={ATP_BRAND.lime} />
              <EliteText variant="body" style={[s.addSetText, { color: acento }]}>
                Agregar serie
              </EliteText>
            </AnimatedPressable>

            {/* Botón guardar */}
            <AnimatedPressable
              onPress={handleSave}
              disabled={saving}
              // MB-4.1 · Bloque B: disabled a ~0.7 (no 0.5 casi-invisible). El
              // estado ya se explica solo: label "GUARDANDO..." + reloj de arena.
              style={[s.saveBtn, saving && { opacity: 0.7 }]}
            >
              <Ionicons
                name={saving ? 'hourglass-outline' : 'checkmark-circle'}
                size={22}
                color={TEXT_COLORS.onAccent}
              />
              <Text style={s.saveBtnText}>
                {saving ? 'GUARDANDO...' : 'GUARDAR'}
              </Text>
            </AnimatedPressable>

            {/* Ola 2 PR2: los method-runners (3-5 / EMOM / Myo-reps + voz) se
                fueron al runner — entrenar en vivo es de /session. Aquí solo
                se registra lo hecho. */}

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
          style={[s.modalOverlay, { backgroundColor: kind === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(15,21,24,0.35)' }]}
          onPress={() => setVariantModalVisible(false)}
        >
          <Pressable style={[s.modalContent, { backgroundColor: tk.card }]} onPress={() => {}}>
            <EliteText variant="subtitle" style={s.modalTitle}>
              Nueva variante
            </EliteText>
            {selectedBenchmark && (
              <EliteText variant="caption" style={[s.modalSubtitle, secTxt]}>
                Variante de {selectedBenchmark.name_es}
              </EliteText>
            )}

            <Text style={[s.modalLabel, secTxt]}>Nombre</Text>
            <TextInput
              style={[s.modalInput, { color: tk.texto, backgroundColor: tk.flotante }]}
              value={newVariantName}
              onChangeText={setNewVariantName}
              placeholder="Ej: Press banca inclinado con mancuernas"
              placeholderTextColor={tk.textoTenue}
              autoFocus
            />

            <Text style={[s.modalLabel, secTxt]}>Equipamiento (separado por comas)</Text>
            <TextInput
              style={[s.modalInput, { color: tk.texto, backgroundColor: tk.flotante }]}
              value={newVariantEquipment}
              onChangeText={setNewVariantEquipment}
              placeholder="Ej: mancuernas, banco inclinado"
              placeholderTextColor={tk.textoTenue}
            />

            <View style={s.modalActions}>
              <AnimatedPressable
                onPress={() => setVariantModalVisible(false)}
                style={s.modalCancel}
              >
                <Text style={[s.modalCancelText, secTxt]}>Cancelar</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleAddVariant}
                disabled={!newVariantName.trim()}
                // MB-4.1 · Bloque B: disabled a ~0.7 + badge explícito (por qué no
                // se puede) en vez de solo atenuar a 0.4 (patrón del design system).
                style={[s.modalSave, !newVariantName.trim() && { opacity: 0.7 }]}
              >
                <Text style={s.modalSaveText}>
                  {!newVariantName.trim() ? 'Falta el nombre' : 'Agregar'}
                </Text>
              </AnimatedPressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
    </ThemeReady>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
  screen: {
    flex: 1,
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
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },

  // --- Comunes ---
  stepLabel: {
    letterSpacing: 2,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  muscleText: {
    marginTop: 2,
  },
  equipmentText: {
    marginTop: 2,
  },

  // --- Paso 1: Benchmarks ---
  benchmarkCard: {
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
    backgroundColor: withOpacity(SEMANTIC.acceptable, 0.08),
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  prText: {
    color: SEMANTIC.acceptable,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
  },

  // --- Paso 2: Variantes ---
  officialCard: {
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: withOpacity(SEMANTIC.acceptable, 0.25),
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
    backgroundColor: SEMANTIC.acceptable,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  officialBadgeText: {
    color: TEXT_COLORS.onAccent,
    fontFamily: Fonts.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
  variantCard: {
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
    borderColor: BORDER.input,
    borderRadius: Radius.card,
    borderStyle: 'dashed',
  },
  addVariantText: {
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
    borderTopColor: ELEVATION[2].bg,
  },
  prHeaderText: {
    color: SEMANTIC.acceptable,
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
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  setCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setCircleComplete: {
    backgroundColor: ATP_BRAND.lime,
  },
  setCircleText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
  },
  setCircleTextComplete: {
    color: TEXT_COLORS.onAccent,
  },
  input: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.xs,
    textAlign: 'center',
    width: '100%',
  },
  rirInput: {
    color: CATEGORY_COLORS.mind,
  },
  live1rmText: {
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
    borderColor: BORDER.input,
    borderRadius: Radius.sm,
    borderStyle: 'dashed',
  },
  addSetText: {
    fontFamily: Fonts.semiBold,
  },

  // --- Save button ---
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: ATP_BRAND.lime,
    borderRadius: Radius.card,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  saveBtnText: {
    color: TEXT_COLORS.onAccent,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    letterSpacing: 2,
  },

  // --- Modal ---
  // El velo entra inline: en claro un negro al 80% apaga toda la pantalla.
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
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
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  modalInput: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
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
    borderColor: ELEVATION[3].border,
  },
  modalCancelText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  modalSave: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    backgroundColor: ATP_BRAND.lime,
  },
  modalSaveText: {
    color: TEXT_COLORS.onAccent,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.md,
  },
});
