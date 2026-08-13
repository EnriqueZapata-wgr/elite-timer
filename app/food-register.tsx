/**
 * Food Register — Selección de tipo de comida antes de registrar.
 *
 * Flujo: elegir tipo (Desayuno/Snack AM/Comida/Snack PM/Cena)
 * → navegar a food-scan o food-text con mealType como param.
 * Si llega con mealType param, salta directo a las opciones de registro.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, Text, Pressable, Modal, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { SwipeToDeleteRow } from '@/src/components/ui/SwipeToDeleteRow';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { saveFoodLog, deleteFoodLogChecked } from '@/src/services/food-log-service';
import { warn as logWarn } from '@/src/lib/logger';
import { useAuth } from '@/src/contexts/auth-context';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { PILLAR_GRADIENTS, ATP_BRAND } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { DEFAULT_MEAL_TIMES, getMealTimes, setMealTimes, getCurrentMeal, formatMealWindow, MEAL_IDS, type MealId, type MealTimes } from '@/src/services/meal-times-service';
import { defaultMealTypeByHour } from '@/src/services/meal-times-core';
import { useNutritionMode } from '@/src/hooks/useNutritionMode';
import { maybeGeneratePostMealInsight } from '@/src/services/argos-nutrition-insights';

// id/name/icon/color estáticos; la ventana horaria (time) viene de la config del usuario.
const MEAL_TYPES = [
  { id: 'breakfast', name: 'Desayuno',  icon: 'sunny-outline' as const,      color: '#fbbf24' },
  { id: 'snack_am',  name: 'Snack AM',  icon: 'cafe-outline' as const,       color: '#a8e02a' },
  { id: 'lunch',     name: 'Comida',    icon: 'restaurant-outline' as const, color: '#38bdf8' },
  { id: 'snack_pm',  name: 'Snack PM',  icon: 'nutrition-outline' as const,  color: '#a8e02a' },
  { id: 'dinner',    name: 'Cena',      icon: 'moon-outline' as const,       color: '#c084fc' },
];

export default function FoodRegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: string }>();
  const { user } = useAuth();
  const analytics = useAnalytics();
  // MB-31B3: la pantalla migró a tokens (Screen themed) y sigue el tema global.
  // El lima como TEXTO no pasa el contraste en claro (regla 1 de la guía).
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  // MB-28A P1: el modo llega también aquí. SIMPLE registra y ya (proteína como
  // único número); COMPLETO ve calorías y macros en badges, frecuentes y logs.
  const { mode: nutritionMode } = useNutritionMode();
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [frequents, setFrequents] = useState<any[]>([]);
  // P2 MB-28A: feedback inline del registro a un toque (sin Alert que tapar).
  const [justLogged, setJustLogged] = useState<string | null>(null);
  // P2 MB-28A: la comida adivinada para los frecuentes de la vista principal.
  const [guessedMeal, setGuessedMeal] = useState<string | null>(null);
  // Horarios de comida configurables + sync DB + timezone real (#14, decisión Enrique).
  const [mealTimes, setMealTimesState] = useState<MealTimes>(DEFAULT_MEAL_TIMES);
  const [timezone, setTimezone] = useState<string>('America/Mexico_City');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<MealTimes>(DEFAULT_MEAL_TIMES);

  // Si llega con mealType, ir directo a opciones de ese tipo
  const directMealType = params.mealType ? MEAL_TYPES.find(m => m.id === params.mealType) : null;

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    const today = getLocalToday();
    supabase.from('food_logs').select('id, meal_type, description, calories, protein_g')
      .eq('user_id', user.id).eq('date', today)
      .order('meal_time', { ascending: true })
      .then(({ data, error }) => {
        // MB-8 Track B (G7): un 400 no es "día sin registros".
        if (error) logWarn('[food-register] today logs failed:', error.message);
        else setTodayLogs(data ?? []);
      });

    // P2 MB-28A: frecuentes SIEMPRE, también en la vista principal — repetir
    // lo de siempre es un toque, no un formulario. El tipo se adivina: ventana
    // del usuario y, fuera de ventana, la hora del reloj (defaultMealTypeByHour,
    // el MISMO helper que food-scan y food-text; se corrige tocando otra card).
    getMealTimes(user.id).then(({ mealTimes: mt, timezone: tz }) => {
      setMealTimesState(mt); setTimezone(tz);
      const guessed = directMealType?.id ?? getCurrentMeal(mt, tz) ?? defaultMealTypeByHour();
      setGuessedMeal(guessed);
      supabase.from('user_frequent_foods').select('*')
        .eq('user_id', user.id).eq('meal_type', guessed)
        .order('times_used', { ascending: false }).limit(directMealType ? 10 : 4)
        .then(({ data, error }) => { if (!error) setFrequents(data ?? []); });
    });
  }, [user?.id, directMealType?.id]));

  // Agregar frecuente rápido
  async function addFrequentQuick(food: any) {
    if (!user?.id) return;
    haptic.medium();
    const today = getLocalToday();
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    // Track A (MB-8): guardado unificado + chequeo real de error (antes el
    // try/catch no atrapaba 4xx y mostraba "Registrado" en falso — G1).
    const result = await saveFoodLog({
      userId: user.id,
      date: today,
      mealTime: now,
      mealType: food.meal_type,
      description: food.food_name,
      source: 'frequent',
      calories: food.calories,
      proteinG: food.protein_g,
      carbsG: food.carbs_g,
      fatG: food.fat_g,
      extras: { items: food.items },
    });
    if (!result.ok) {
      Alert.alert('Error al registrar', 'Intenta de nuevo.');
      return;
    }
    // Actualizar times_used (best-effort, con log si falla)
    const { error: freqErr } = await supabase.from('user_frequent_foods')
      .update({ times_used: (food.times_used || 0) + 1, last_used_at: new Date().toISOString() })
      .eq('id', food.id);
    if (freqErr) logWarn('[food-register] times_used update failed:', freqErr.message);

    // T5 HARDENING: funnel core — comida registrada desde frecuentes.
    analytics.track(ATP_EVENTS.FOOD_LOGGED, { source: 'frequent', meal_type: food.meal_type });
    // T6 NUTRICIÓN: insight post-meal de ARGOS (opt-in + throttle, no bloquea)
    void maybeGeneratePostMealInsight(user.id, food.food_name);
    haptic.success();
    // P2 MB-28A: sin Alert que tapar — el check inline y la lista que se
    // refresca SON la confirmación (un toque = registrado, cero diálogos).
    setJustLogged(food.id);
    setTimeout(() => setJustLogged(null), 2000);
    // Refrescar logs
    const { data, error: refreshErr } = await supabase.from('food_logs').select('id, meal_type, description, calories, protein_g')
      .eq('user_id', user.id).eq('date', today)
      .order('meal_time', { ascending: true });
    if (refreshErr) logWarn('[food-register] refresh logs failed:', refreshErr.message);
    else setTodayLogs(data ?? []);
  }

  // P2 MB-28A: la card de frecuente, compartida por la vista principal y la
  // vista por tipo — mismo dibujo, mismo camino de guardado (addFrequentQuick
  // → saveFoodLog → food_logs; ninguna ruta paralela).
  const renderFrequent = (food: any, idx: number, baseDelay: number) => (
    <Animated.View key={food.id} entering={FadeInUp.delay(baseDelay + idx * 40).springify()}>
      <AnimatedPressable onPress={() => addFrequentQuick(food)} style={[s.frequentCard, { backgroundColor: t.hundido }]}>
        <View style={{ flex: 1 }}>
          <EliteText style={[s.frequentName, { color: t.texto }]} numberOfLines={1}>{food.food_name}</EliteText>
          <Text style={s.frequentMeta}>
            {/* P1: en SIMPLE la proteína es el único número. */}
            {nutritionMode === 'complete' && food.calories ? `${Math.round(food.calories)} kcal · ` : ''}
            {food.protein_g ? `${Math.round(food.protein_g)}g prot` : ''}
            {food.times_used > 1 ? ` · ${food.times_used}x` : ''}
          </Text>
        </View>
        {justLogged === food.id ? (
          <Ionicons name="checkmark-circle" size={22} color="#a8e02a" />
        ) : (
          <Ionicons name="add-circle-outline" size={22} color="#a8e02a" />
        )}
      </AnimatedPressable>
    </Animated.View>
  );

  async function handleDeleteLog(logId: string, desc: string) {
    haptic.heavy();
    Alert.alert(
      'Eliminar registro',
      `¿Eliminar "${desc}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // MB-8 Track B (G2): borrado verificado — 0 filas o error ≠ éxito.
            const del = await deleteFoodLogChecked(logId);
            if (!del.ok) {
              Alert.alert('No se pudo eliminar', 'Intenta de nuevo.');
              return;
            }
            haptic.success();
            const today = getLocalToday();
            const { data, error } = await supabase.from('food_logs').select('id, meal_type, description, calories, protein_g')
              .eq('user_id', user!.id).eq('date', today).order('meal_time', { ascending: true });
            if (error) logWarn('[food-register] refresh logs failed:', error.message);
            else setTodayLogs(data ?? []);
          },
        },
      ]
    );
  }

  function openEditor() {
    haptic.light();
    setEditDraft(mealTimes);
    setEditorOpen(true);
  }

  async function saveMealTimes() {
    if (!user?.id) { setEditorOpen(false); return; }
    haptic.medium();
    await setMealTimes(user.id, editDraft, timezone);
    setMealTimesState(editDraft);
    setEditorOpen(false);
  }

  const updateDraft = (id: MealId, field: 'start' | 'end', v: string) =>
    setEditDraft((p) => ({ ...p, [id]: { ...p[id], [field]: v } }));

  // En qué comida estamos ahora (timezone real) — para el indicador "AHORA".
  const currentMeal = getCurrentMeal(mealTimes, timezone);

  const goToScan = (mealType: string) => {
    haptic.medium();
    router.push({ pathname: '/food-scan', params: { mode: 'food', mealType } });
  };

  const goToManual = (mealType: string) => {
    haptic.light();
    router.push({ pathname: '/food-text', params: { mealType } });
  };

  // Si tiene mealType directo, mostrar las opciones de registro
  if (directMealType) {
    const logsForType = todayLogs.filter(l => l.meal_type === directMealType.id);

    return (
      <Screen keyboard themed>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <PillarHeader pillar="nutrition" title={directMealType.name} />
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Opciones de registro — E.1 (MB-8): CTA heroico = degradado, no lime plano */}
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <GradientCTA
              label="ESCANEAR CON CÁMARA"
              icon="camera-outline"
              pillar="nutrition"
              onPress={() => goToScan(directMealType.id)}
              style={{ marginBottom: Spacing.sm }}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <AnimatedPressable onPress={() => goToManual(directMealType.id)} style={[s.actionBtnGhost, { backgroundColor: t.hundido }]}>
              <Ionicons name="create-outline" size={20} color="#38bdf8" />
              <EliteText style={s.actionBtnGhostText}>Registrar manual</EliteText>
            </AnimatedPressable>
          </Animated.View>

          {/* Frecuentes */}
          {frequents.length > 0 && (
            <View style={{ marginTop: Spacing.lg }}>
              <SectionTitle>FRECUENTES</SectionTitle>
              {frequents.map((food: any, idx: number) => renderFrequent(food, idx, 150))}
            </View>
          )}

          {/* Registros de hoy para este tipo */}
          {logsForType.length > 0 && (
            <View style={{ marginTop: Spacing.lg }}>
              <SectionTitle>REGISTROS DE HOY</SectionTitle>
              {logsForType.map((log: any) => (
                <SwipeToDeleteRow
                  key={log.id}
                  onConfirmDelete={() => handleDeleteLog(log.id, log.description || 'este alimento')}
                >
                  <Pressable
                    onLongPress={() => handleDeleteLog(log.id, log.description || 'este alimento')}
                  >
                    <View style={s.logRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#a8e02a" />
                      <View style={{ flex: 1 }}>
                        <EliteText style={[s.logDesc, { color: t.texto }]} numberOfLines={1}>{log.description}</EliteText>
                      </View>
                      <EliteText style={s.logKcal}>
                        {/* P1: en SIMPLE la proteína es el único número. */}
                        {nutritionMode === 'complete' && log.calories ? `${log.calories} kcal · ` : ''}
                        {log.protein_g ? `${log.protein_g}g prot` : ''}
                      </EliteText>
                    </View>
                  </Pressable>
                </SwipeToDeleteRow>
              ))}
              <Text style={{ color: t.sinDatos, fontSize: 9, textAlign: 'center', marginTop: 6 }}>
                Desliza ← para eliminar
              </Text>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </Screen>
    );
  }

  // Vista principal: selección de tipo de comida
  return (
    <Screen keyboard themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <PillarHeader pillar="nutrition" title="Registrar" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(50).springify()} style={s.questionRow}>
          <EliteText style={[s.question, { color: t.texto }]}>¿Qué comida registras?</EliteText>
          <Pressable onPress={openEditor} hitSlop={8} style={s.editTimesBtn}>
            <Ionicons name="time-outline" size={14} color="#a8e02a" />
            <EliteText style={[s.editTimesText, { color: acento }]}>Horarios</EliteText>
          </Pressable>
        </Animated.View>

        {/* P2 MB-28A: lo frecuente AL FRENTE. Los guardados de la comida de
            ahora (tipo adivinado por hora, corregible tocando otra card) se
            registran con UN toque desde aquí, sin pasar por la vista de tipo. */}
        {frequents.length > 0 && guessedMeal && (
          <View style={{ marginBottom: Spacing.md }}>
            <SectionTitle>
              {`FRECUENTES · ${(MEAL_TYPES.find(m => m.id === guessedMeal)?.name ?? '').toUpperCase()}`}
            </SectionTitle>
            {frequents.map((food: any, idx: number) => renderFrequent(food, idx, 60))}
          </View>
        )}

        {MEAL_TYPES.map((meal, idx) => {
          const logsForMeal = todayLogs.filter(l => l.meal_type === meal.id);
          const totalKcal = logsForMeal.reduce((s: number, l: any) => s + (l.calories || 0), 0);
          const totalProt = Math.round(logsForMeal.reduce((s: number, l: any) => s + (l.protein_g || 0), 0));
          const hasLogs = logsForMeal.length > 0;

          return (
            <Animated.View key={meal.id} entering={FadeInUp.delay(80 + idx * 40).springify()}>
              <AnimatedPressable
                onPress={() => {
                  haptic.light();
                  router.push({ pathname: '/food-register', params: { mealType: meal.id } });
                }}
                style={s.mealCardWrap}
              >
                <GradientCard
                  gradient={{ start: `${meal.color}12`, end: `${meal.color}04` }}
                  accentColor={meal.color}
                  accentPosition="left"
                  padding={18}
                >
                  <View style={s.mealRow}>
                    <View style={[s.mealIcon, { backgroundColor: `${meal.color}15` }]}>
                      <Ionicons name={meal.icon} size={24} color={meal.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.mealNameRow}>
                        <EliteText style={[s.mealName, { color: t.texto }]}>{meal.name}</EliteText>
                        {meal.id === currentMeal && (
                          <View style={s.nowPill}><EliteText style={s.nowPillText}>AHORA</EliteText></View>
                        )}
                      </View>
                      <EliteText style={[s.mealTime, { color: t.textoSecundario }]}>{formatMealWindow(mealTimes[meal.id as MealId])}</EliteText>
                    </View>
                    {hasLogs ? (
                      <View style={s.mealBadge}>
                        {/* P1: SIMPLE muestra proteína, COMPLETO calorías. */}
                        <EliteText style={[s.mealBadgeText, { color: acento }]}>
                          {nutritionMode === 'complete' ? `${totalKcal} kcal` : `${totalProt}g prot`}
                        </EliteText>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                    )}
                  </View>
                </GradientCard>
              </AnimatedPressable>
            </Animated.View>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Editor de horarios de comida (#14) — sync DB + timezone real. */}
      <Modal visible={editorOpen} transparent animationType="fade" onRequestClose={() => setEditorOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setEditorOpen(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <EliteText style={s.modalTitle}>Tus horarios de comida</EliteText>
            <EliteText style={s.modalHint}>Formato 24h (HH:MM). Se sincronizan en todos tus dispositivos.</EliteText>
            {MEAL_IDS.map((id) => {
              const meal = MEAL_TYPES.find((m) => m.id === id)!;
              return (
                <View key={id} style={s.editRow}>
                  <EliteText style={s.editLabel}>{meal.name}</EliteText>
                  <View style={s.editTimes}>
                    {/* E.3 (MB-8): teclado numérico para teclear horas */}
                    <TextInput
                      style={s.editInput}
                      value={editDraft[id].start}
                      onChangeText={(t) => updateDraft(id, 'start', t)}
                      placeholder={DEFAULT_MEAL_TIMES[id].start}
                      placeholderTextColor="#444"
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                    <EliteText style={s.editDash}>–</EliteText>
                    <TextInput
                      style={s.editInput}
                      value={editDraft[id].end}
                      onChangeText={(t) => updateDraft(id, 'end', t)}
                      placeholder={DEFAULT_MEAL_TIMES[id].end}
                      placeholderTextColor="#444"
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              );
            })}
            <View style={s.modalBtns}>
              <Pressable onPress={() => setEditorOpen(false)} style={s.modalCancel}>
                <EliteText style={s.modalCancelText}>Cancelar</EliteText>
              </Pressable>
              <Pressable onPress={saveMealTimes} style={s.modalSave}>
                <EliteText style={s.modalSaveText}>Guardar</EliteText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  question: {
    fontSize: 22,
    fontFamily: Fonts.bold,
  },
  editTimesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(168,224,42,0.3)',
  },
  editTimesText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },

  // Editor de horarios (modal)
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: '#0d0d0d', borderRadius: Radius.card, padding: Spacing.lg, borderWidth: 1, borderColor: '#222' },
  modalTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, color: '#fff' },
  modalHint: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, color: '#666', marginTop: 4, marginBottom: Spacing.md },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.sm },
  editLabel: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold, color: '#fff', flex: 1 },
  editTimes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editDash: { color: '#666', fontFamily: Fonts.semiBold },
  editInput: {
    width: 64, textAlign: 'center', backgroundColor: '#000', borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 8, color: '#fff', fontFamily: Fonts.semiBold,
    borderWidth: 1, borderColor: '#222',
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: '#888', fontFamily: Fonts.semiBold },
  modalSave: { backgroundColor: '#a8e02a', borderRadius: Radius.sm, paddingVertical: 10, paddingHorizontal: 20 },
  modalSaveText: { color: '#000', fontFamily: Fonts.bold },

  // Meal type cards
  mealCardWrap: { marginBottom: Spacing.sm },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mealIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
  },
  nowPill: { backgroundColor: '#a8e02a', borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  nowPillText: { fontSize: 9, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  mealTime: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  mealBadge: {
    backgroundColor: 'rgba(168,224,42,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
  },

  // Action buttons (direct meal type view) — el primario es GradientCTA (E.1)
  actionBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  actionBtnGhostText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: '#38bdf8',
  },

  // Log rows
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logDesc: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
  },
  logKcal: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: 'rgba(255,255,255,0.5)',
  },

  // Frequent foods
  frequentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  frequentName: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
  },
  frequentMeta: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: '#666',
    marginTop: 2,
  },
});
