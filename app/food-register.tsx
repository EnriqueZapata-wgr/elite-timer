/**
 * Food Register — Selección de tipo de comida antes de registrar.
 *
 * Flujo: elegir tipo (Desayuno/Snack AM/Comida/Snack PM/Cena)
 * → navegar a food-scan o food-text con mealType como param.
 * Si llega con mealType param, salta directo a las opciones de registro.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, DeviceEventEmitter, Text, Pressable, Modal, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { GradientCard } from '@/src/components/ui/GradientCard';
import { SectionTitle } from '@/src/components/ui/SectionTitle';
import { SwipeToDeleteRow } from '@/src/components/ui/SwipeToDeleteRow';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/auth-context';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { PILLAR_GRADIENTS } from '@/src/constants/brand';
import { DEFAULT_MEAL_TIMES, getMealTimes, setMealTimes, getCurrentMeal, formatMealWindow, MEAL_IDS, type MealId, type MealTimes } from '@/src/services/meal-times-service';

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
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [frequents, setFrequents] = useState<any[]>([]);
  // Horarios de comida configurables + sync DB + timezone real (#14, decisión Enrique).
  const [mealTimes, setMealTimesState] = useState<MealTimes>(DEFAULT_MEAL_TIMES);
  const [timezone, setTimezone] = useState<string>('America/Mexico_City');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<MealTimes>(DEFAULT_MEAL_TIMES);

  // Si llega con mealType, ir directo a opciones de ese tipo
  const directMealType = params.mealType ? MEAL_TYPES.find(m => m.id === params.mealType) : null;

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    getMealTimes(user.id).then(({ mealTimes: mt, timezone: tz }) => { setMealTimesState(mt); setTimezone(tz); });
    const today = getLocalToday();
    supabase.from('food_logs').select('id, meal_type, description, calories, protein_g')
      .eq('user_id', user.id).eq('date', today)
      .order('meal_time', { ascending: true })
      .then(({ data }) => setTodayLogs(data ?? []));

    // Cargar frecuentes para el tipo de comida actual
    if (directMealType) {
      supabase.from('user_frequent_foods').select('*')
        .eq('user_id', user.id).eq('meal_type', directMealType.id)
        .order('times_used', { ascending: false }).limit(10)
        .then(({ data, error }) => { if (!error) setFrequents(data ?? []); });
    }
  }, [user?.id, directMealType?.id]));

  // Agregar frecuente rápido
  async function addFrequentQuick(food: any) {
    if (!user?.id) return;
    haptic.medium();
    const today = getLocalToday();
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    try {
      await supabase.from('food_logs').insert({
        user_id: user.id,
        date: today,
        meal_time: now,
        meal_type: food.meal_type,
        description: food.food_name,
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        notes: JSON.stringify({ source: 'frequent', items: food.items }),
      });
      // Actualizar times_used
      await supabase.from('user_frequent_foods')
        .update({ times_used: (food.times_used || 0) + 1, last_used_at: new Date().toISOString() })
        .eq('id', food.id);

      DeviceEventEmitter.emit('day_changed');
      haptic.success();
      Alert.alert('Registrado', `${food.food_name} agregado`);
      // Refrescar logs
      supabase.from('food_logs').select('id, meal_type, description, calories, protein_g')
        .eq('user_id', user.id).eq('date', today)
        .order('meal_time', { ascending: true })
        .then(({ data }) => setTodayLogs(data ?? []));
    } catch {
      Alert.alert('Error', 'No se pudo registrar');
    }
  }

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
            await supabase.from('food_logs').delete().eq('id', logId);
            DeviceEventEmitter.emit('day_changed');
            haptic.success();
            const today = getLocalToday();
            const { data } = await supabase.from('food_logs').select('id, meal_type, description, calories, protein_g')
              .eq('user_id', user!.id).eq('date', today).order('meal_time', { ascending: true });
            setTodayLogs(data ?? []);
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
    router.push({ pathname: '/food-scan', params: { mode: 'food', mealType } } as any);
  };

  const goToManual = (mealType: string) => {
    haptic.light();
    router.push({ pathname: '/food-text', params: { mealType } } as any);
  };

  // Si tiene mealType directo, mostrar las opciones de registro
  if (directMealType) {
    const logsForType = todayLogs.filter(l => l.meal_type === directMealType.id);

    return (
      <Screen>
        <PillarHeader pillar="nutrition" title={directMealType.name} />
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Opciones de registro */}
          <Animated.View entering={FadeInUp.delay(50).springify()}>
            <AnimatedPressable onPress={() => goToScan(directMealType.id)} style={s.actionBtn}>
              <Ionicons name="camera-outline" size={22} color="#000" />
              <EliteText style={s.actionBtnText}>Escanear con cámara</EliteText>
            </AnimatedPressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <AnimatedPressable onPress={() => goToManual(directMealType.id)} style={s.actionBtnGhost}>
              <Ionicons name="create-outline" size={20} color="#38bdf8" />
              <EliteText style={s.actionBtnGhostText}>Registrar manual</EliteText>
            </AnimatedPressable>
          </Animated.View>

          {/* Frecuentes */}
          {frequents.length > 0 && (
            <View style={{ marginTop: Spacing.lg }}>
              <SectionTitle>FRECUENTES</SectionTitle>
              {frequents.map((food: any, idx: number) => (
                <Animated.View key={food.id} entering={FadeInUp.delay(150 + idx * 40).springify()}>
                  <AnimatedPressable onPress={() => addFrequentQuick(food)} style={s.frequentCard}>
                    <View style={{ flex: 1 }}>
                      <EliteText style={s.frequentName} numberOfLines={1}>{food.food_name}</EliteText>
                      <Text style={s.frequentMeta}>
                        {food.calories ? `${Math.round(food.calories)} kcal` : ''}
                        {food.protein_g ? ` · ${Math.round(food.protein_g)}g prot` : ''}
                        {food.times_used > 1 ? ` · ${food.times_used}x` : ''}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color="#a8e02a" />
                  </AnimatedPressable>
                </Animated.View>
              ))}
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
                        <EliteText style={s.logDesc} numberOfLines={1}>{log.description}</EliteText>
                      </View>
                      <EliteText style={s.logKcal}>
                        {log.calories ? `${log.calories} kcal` : ''}
                        {log.protein_g ? ` · ${log.protein_g}g prot` : ''}
                      </EliteText>
                    </View>
                  </Pressable>
                </SwipeToDeleteRow>
              ))}
              <Text style={{ color: '#444', fontSize: 9, textAlign: 'center', marginTop: 6 }}>
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
    <Screen>
      <PillarHeader pillar="nutrition" title="Registrar" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(50).springify()} style={s.questionRow}>
          <EliteText style={s.question}>¿Qué comida registras?</EliteText>
          <Pressable onPress={openEditor} hitSlop={8} style={s.editTimesBtn}>
            <Ionicons name="time-outline" size={14} color="#a8e02a" />
            <EliteText style={s.editTimesText}>Horarios</EliteText>
          </Pressable>
        </Animated.View>

        {MEAL_TYPES.map((meal, idx) => {
          const logsForMeal = todayLogs.filter(l => l.meal_type === meal.id);
          const totalKcal = logsForMeal.reduce((s: number, l: any) => s + (l.calories || 0), 0);
          const hasLogs = logsForMeal.length > 0;

          return (
            <Animated.View key={meal.id} entering={FadeInUp.delay(80 + idx * 40).springify()}>
              <AnimatedPressable
                onPress={() => {
                  haptic.light();
                  router.push({ pathname: '/food-register', params: { mealType: meal.id } } as any);
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
                        <EliteText style={s.mealName}>{meal.name}</EliteText>
                        {meal.id === currentMeal && (
                          <View style={s.nowPill}><EliteText style={s.nowPillText}>AHORA</EliteText></View>
                        )}
                      </View>
                      <EliteText style={s.mealTime}>{formatMealWindow(mealTimes[meal.id as MealId])}</EliteText>
                    </View>
                    {hasLogs ? (
                      <View style={s.mealBadge}>
                        <EliteText style={s.mealBadgeText}>{totalKcal} kcal</EliteText>
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
                    <TextInput
                      style={s.editInput}
                      value={editDraft[id].start}
                      onChangeText={(t) => updateDraft(id, 'start', t)}
                      placeholder={DEFAULT_MEAL_TIMES[id].start}
                      placeholderTextColor="#444"
                      maxLength={5}
                    />
                    <EliteText style={s.editDash}>–</EliteText>
                    <TextInput
                      style={s.editInput}
                      value={editDraft[id].end}
                      onChangeText={(t) => updateDraft(id, 'end', t)}
                      placeholder={DEFAULT_MEAL_TIMES[id].end}
                      placeholderTextColor="#444"
                      maxLength={5}
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
    color: '#fff',
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
  editTimesText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold, color: '#a8e02a' },

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
    color: '#fff',
  },
  nowPill: { backgroundColor: '#a8e02a', borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  nowPillText: { fontSize: 9, fontFamily: Fonts.bold, color: '#000', letterSpacing: 1 },
  mealTime: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.4)',
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
    color: '#a8e02a',
  },

  // Action buttons (direct meal type view)
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#a8e02a',
    paddingVertical: 16,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  actionBtnText: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  actionBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#0a0a0a',
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
    color: '#fff',
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
    backgroundColor: '#0a0a0a',
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  frequentName: {
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: '#fff',
  },
  frequentMeta: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    color: '#666',
    marginTop: 2,
  },
});
