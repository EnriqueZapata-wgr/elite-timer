/**
 * Nutrición — Dashboard diario de alimentación, hidratación y ayuno.
 */
import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import {
  getFoodLogs, logFood, getHydration, addWater, getActiveFast,
  startFast, endFast, getActivePlan, calculateDailyScore, getRecipes,
  type FoodLog, type HydrationLog, type FastingLog, type NutritionPlan, type DailyNutritionScore, type Recipe,
} from '@/src/services/nutrition-service';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { ATP_BRAND, SURFACES, TEXT_COLORS, CATEGORY_COLORS, SEMANTIC } from '@/src/constants/brand';

const BLUE = CATEGORY_COLORS.nutrition;

export default function NutritionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [foods, setFoods] = useState<FoodLog[]>([]);
  const [hydration, setHydration] = useState<HydrationLog | null>(null);
  const [fasting, setFasting] = useState<FastingLog | null>(null);
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [score, setScore] = useState<DailyNutritionScore | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [addingWater, setAddingWater] = useState(false);
  const [togglingFast, setTogglingFast] = useState(false);

  // Quick add food
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickDesc, setQuickDesc] = useState('');
  const [quickType, setQuickType] = useState('lunch');
  const [quickSaving, setQuickSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [f, h, fa, p, r] = await Promise.all([
        getFoodLogs().catch(() => []),
        getHydration().catch(() => null),
        getActiveFast().catch(() => null),
        getActivePlan().catch(() => null),
        getRecipes(5).catch(() => []),
      ]);
      setFoods(f);
      setHydration(h);
      setFasting(fa);
      setPlan(p);
      setRecipes(r);
      // Calculate score
      calculateDailyScore().then(setScore).catch(() => {});
    } catch { /* */ }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleAddWater = async (ml = 250) => {
    setAddingWater(true);
    try {
      const updated = await addWater(ml);
      setHydration(updated);
    } catch { /* */ }
    setAddingWater(false);
  };

  const handleToggleFast = async () => {
    setTogglingFast(true);
    try {
      if (fasting?.status === 'active') {
        await endFast();
        setFasting(null);
      } else {
        const f = await startFast(plan?.fasting_hours ?? 16);
        setFasting(f);
      }
    } catch { /* */ }
    setTogglingFast(false);
  };

  const handleQuickAdd = async () => {
    if (!quickDesc.trim()) return;
    setQuickSaving(true);
    try {
      await logFood({ meal_type: quickType, description: quickDesc.trim() });
      setQuickDesc('');
      setShowQuickAdd(false);
      loadData();
    } catch { /* */ }
    setQuickSaving(false);
  };

  const waterPct = hydration ? Math.min(100, Math.round((hydration.total_ml / hydration.target_ml) * 100)) : 0;
  const fastingHours = fasting?.fast_start
    ? Math.round(((Date.now() - new Date(fasting.fast_start).getTime()) / 3600000) * 10) / 10
    : 0;
  const fastingTarget = fasting?.target_hours ?? plan?.fasting_hours ?? 16;
  const fastingPct = Math.min(100, Math.round((fastingHours / fastingTarget) * 100));

  const scoreColor = (s: number | null) => !s ? TEXT_COLORS.muted : s >= 80 ? SEMANTIC.success : s >= 60 ? SEMANTIC.warning : SEMANTIC.error;

  if (loading) {
    return (
      <SafeAreaView style={st.screen}>
        <ActivityIndicator size="large" color={BLUE} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.screen}>
      <Pressable onPress={() => router.back()} style={st.backBtn}>
        <Ionicons name="chevron-back" size={28} color={BLUE} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <EliteText style={st.title}>NUTRICIÓN</EliteText>
        </Animated.View>

        {/* ══ Resumen del día ══ */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View style={st.summaryCard}>
            <View style={st.summaryRow}>
              <View style={st.summaryItem}>
                <EliteText style={[st.summaryValue, { color: scoreColor(score?.overall_score ?? null) }]}>
                  {score?.overall_score ?? '—'}
                </EliteText>
                <EliteText variant="caption" style={st.summaryLabel}>Score</EliteText>
              </View>
              <View style={st.summaryDivider} />
              <View style={st.summaryItem}>
                <EliteText style={[st.summaryValue, { color: TEXT_COLORS.primary }]}>
                  {score?.total_calories ?? 0}
                </EliteText>
                <EliteText variant="caption" style={st.summaryLabel}>kcal</EliteText>
              </View>
              <View style={st.summaryDivider} />
              <View style={st.summaryItem}>
                <EliteText style={[st.summaryValue, { color: BLUE }]}>
                  {score?.total_protein ?? 0}g
                </EliteText>
                <EliteText variant="caption" style={st.summaryLabel}>Proteína</EliteText>
              </View>
            </View>

            {/* Hidratación mini bar */}
            <View style={st.miniSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <EliteText variant="caption" style={{ color: BLUE, fontSize: 10 }}>💧 Hidratación</EliteText>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10 }}>
                  {hydration ? `${(hydration.total_ml / 1000).toFixed(1)} / ${(hydration.target_ml / 1000).toFixed(1)}L` : '0 / 2.5L'}
                </EliteText>
              </View>
              <View style={st.miniBar}>
                <View style={[st.miniBarFill, { width: `${waterPct}%`, backgroundColor: BLUE }]} />
              </View>
            </View>

            {/* Ayuno mini bar */}
            {(fasting?.status === 'active' || plan?.fasting_hours) && (
              <View style={st.miniSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <EliteText variant="caption" style={{ color: SEMANTIC.warning, fontSize: 10 }}>⏱️ Ayuno</EliteText>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10 }}>
                    {fasting?.status === 'active' ? `${fastingHours.toFixed(1)} / ${fastingTarget}h` : 'Inactivo'}
                  </EliteText>
                </View>
                <View style={st.miniBar}>
                  <View style={[st.miniBarFill, { width: `${fastingPct}%`, backgroundColor: fastingPct >= 100 ? SEMANTIC.success : SEMANTIC.warning }]} />
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ══ Acciones rápidas ══ */}
        <Animated.View entering={FadeInUp.delay(180).springify()}>
          <View style={st.quickActions}>
            <AnimatedPressable onPress={() => setShowQuickAdd(true)} style={st.quickBtn}>
              <Ionicons name="restaurant-outline" size={22} color={BLUE} />
              <EliteText variant="caption" style={[st.quickLabel, { color: BLUE }]}>Registrar comida</EliteText>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => handleAddWater(250)} disabled={addingWater} style={st.quickBtn}>
              <Ionicons name="water-outline" size={22} color={BLUE} />
              <EliteText variant="caption" style={[st.quickLabel, { color: BLUE }]}>+250ml</EliteText>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleToggleFast} disabled={togglingFast} style={st.quickBtn}>
              <Ionicons name={fasting?.status === 'active' ? 'stop-circle-outline' : 'timer-outline'} size={22} color={SEMANTIC.warning} />
              <EliteText variant="caption" style={[st.quickLabel, { color: SEMANTIC.warning }]}>
                {fasting?.status === 'active' ? 'Romper ayuno' : 'Iniciar ayuno'}
              </EliteText>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* ══ Quick add modal inline ══ */}
        {showQuickAdd && (
          <Animated.View entering={FadeInUp.springify()}>
            <View style={st.quickAddCard}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm }}>
                {[
                  { key: 'breakfast', label: '🌅 Desayuno' },
                  { key: 'lunch', label: '☀️ Comida' },
                  { key: 'dinner', label: '🌙 Cena' },
                  { key: 'snack', label: '🍎 Snack' },
                ].map(t => (
                  <Pressable key={t.key} onPress={() => setQuickType(t.key)}
                    style={[st.mealPill, quickType === t.key && { backgroundColor: BLUE + '25', borderColor: BLUE }]}>
                    <EliteText variant="caption" style={{ color: quickType === t.key ? BLUE : TEXT_COLORS.secondary, fontSize: 12 }}>
                      {t.label}
                    </EliteText>
                  </Pressable>
                ))}
              </View>
              <TextInput style={st.quickInput} value={quickDesc} onChangeText={setQuickDesc}
                placeholder="¿Qué comiste?" placeholderTextColor={TEXT_COLORS.muted} multiline />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm }}>
                <Pressable onPress={() => setShowQuickAdd(false)}>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted }}>Cancelar</EliteText>
                </Pressable>
                <Pressable onPress={handleQuickAdd} disabled={quickSaving}
                  style={{ backgroundColor: BLUE, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 }}>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold }}>
                    {quickSaving ? 'Guardando...' : 'Guardar'}
                  </EliteText>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ══ Comidas del día ══ */}
        <Animated.View entering={FadeInUp.delay(260).springify()}>
          <EliteText variant="caption" style={st.sectionLabel}>COMIDAS DE HOY</EliteText>
          {foods.length === 0 ? (
            <View style={st.emptyCard}>
              <Ionicons name="restaurant-outline" size={28} color={TEXT_COLORS.muted} />
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted }}>Sin registros hoy</EliteText>
            </View>
          ) : (
            foods.map((food, idx) => {
              const ai = food.ai_analysis;
              const mealEmoji = food.meal_type === 'breakfast' ? '🌅' : food.meal_type === 'lunch' ? '☀️' : food.meal_type === 'dinner' ? '🌙' : '🍎';
              return (
                <View key={food.id} style={st.foodCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <EliteText style={{ fontSize: 20 }}>{mealEmoji}</EliteText>
                    <View style={{ flex: 1 }}>
                      <EliteText variant="body" style={{ color: TEXT_COLORS.primary, fontSize: 14 }}>{food.description}</EliteText>
                      {food.meal_time && (
                        <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10 }}>{food.meal_time}</EliteText>
                      )}
                    </View>
                    {ai?.score != null && (
                      <View style={[st.scorePill, { backgroundColor: scoreColor(ai.score) + '20' }]}>
                        <EliteText variant="caption" style={{ color: scoreColor(ai.score), fontFamily: Fonts.bold, fontSize: 12 }}>
                          {ai.score}
                        </EliteText>
                      </View>
                    )}
                  </View>
                  {ai?.feedback && (
                    <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 11, marginTop: 4 }}>
                      {ai.feedback}
                    </EliteText>
                  )}
                  {ai?.red_flags?.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                      {ai.red_flags.map((f: string, i: number) => (
                        <View key={i} style={{ backgroundColor: SEMANTIC.error + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 9 }}>{f}</EliteText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </Animated.View>

        {/* ══ Plan activo ══ */}
        {plan && (
          <Animated.View entering={FadeInUp.delay(340).springify()}>
            <EliteText variant="caption" style={st.sectionLabel}>MI PLAN</EliteText>
            <View style={st.planCard}>
              <EliteText variant="body" style={{ color: BLUE, fontFamily: Fonts.bold }}>{plan.name}</EliteText>
              {plan.diet_type && (
                <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, marginTop: 2 }}>
                  {plan.diet_type.replace('_', ' ')}
                  {plan.fasting_hours ? ` · ${plan.fasting_hours}h ayuno` : ''}
                </EliteText>
              )}
              {plan.foods_to_avoid?.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: Spacing.sm }}>
                  {plan.foods_to_avoid.map((f: string, i: number) => (
                    <View key={i} style={{ backgroundColor: SEMANTIC.error + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                      <EliteText variant="caption" style={{ color: SEMANTIC.error, fontSize: 9 }}>✕ {f}</EliteText>
                    </View>
                  ))}
                </View>
              )}
              {plan.foods_to_prioritize?.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {plan.foods_to_prioritize.map((f: string, i: number) => (
                    <View key={i} style={{ backgroundColor: SEMANTIC.success + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                      <EliteText variant="caption" style={{ color: SEMANTIC.success, fontSize: 9 }}>✓ {f}</EliteText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* ══ Recetas ══ */}
        {recipes.length > 0 && (
          <Animated.View entering={FadeInUp.delay(420).springify()}>
            <EliteText variant="caption" style={st.sectionLabel}>RECETAS SUGERIDAS</EliteText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {recipes.map(r => (
                <View key={r.id} style={st.recipeCard}>
                  <EliteText variant="body" style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: 13 }}>{r.name}</EliteText>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10, marginTop: 2 }}>
                    {r.calories} kcal · {r.protein_g}g prot · {r.prep_time_min ?? 0}min
                  </EliteText>
                  {r.tags?.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {(r.tags as string[]).slice(0, 2).map((t, i) => (
                        <View key={i} style={{ backgroundColor: BLUE + '15', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                          <EliteText variant="caption" style={{ color: BLUE, fontSize: 8 }}>{t.replace('_', ' ')}</EliteText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <View style={{ height: Spacing.xxl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.black },
  backBtn: { position: 'absolute', top: Spacing.xxl, left: Spacing.md, zIndex: 10, padding: Spacing.sm },
  content: { paddingTop: Spacing.xxl + Spacing.lg, paddingHorizontal: Spacing.md },
  title: { fontSize: 32, fontFamily: Fonts.extraBold, color: BLUE, letterSpacing: 4, marginBottom: Spacing.lg },

  // Summary
  summaryCard: {
    backgroundColor: BLUE + '08', borderRadius: 16, borderWidth: 1, borderColor: BLUE + '20',
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 28, fontFamily: Fonts.extraBold },
  summaryLabel: { color: TEXT_COLORS.secondary, fontSize: 10, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: BLUE + '20' },
  miniSection: { marginTop: Spacing.sm },
  miniBar: { height: 4, backgroundColor: SURFACES.cardLight, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  miniBarFill: { height: '100%', borderRadius: 2 },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  quickBtn: {
    flex: 1, alignItems: 'center', gap: 4, backgroundColor: SURFACES.card,
    borderRadius: 12, borderWidth: 0.5, borderColor: SURFACES.border, padding: Spacing.md,
  },
  quickLabel: { fontSize: 11, fontFamily: Fonts.semiBold },

  // Quick add
  quickAddCard: {
    backgroundColor: SURFACES.card, borderRadius: 12, borderWidth: 0.5, borderColor: BLUE + '30',
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  mealPill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: SURFACES.cardLight, borderWidth: 1, borderColor: 'transparent',
  },
  quickInput: {
    backgroundColor: SURFACES.cardLight, borderRadius: 8, padding: Spacing.sm,
    color: TEXT_COLORS.primary, fontSize: 14, minHeight: 50,
  },

  // Section
  sectionLabel: { color: BLUE, letterSpacing: 2, fontFamily: Fonts.bold, fontSize: 11, marginTop: Spacing.lg, marginBottom: Spacing.sm },

  // Foods
  emptyCard: {
    backgroundColor: SURFACES.card, borderRadius: 12, borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm,
  },
  foodCard: {
    backgroundColor: SURFACES.card, borderRadius: 12, borderWidth: 0.5, borderColor: SURFACES.border,
    borderLeftWidth: 3, borderLeftColor: BLUE, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  scorePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  // Plan
  planCard: {
    backgroundColor: SURFACES.card, borderRadius: 12, borderWidth: 0.5, borderColor: BLUE + '30',
    borderLeftWidth: 3, borderLeftColor: BLUE, padding: Spacing.md,
  },

  // Recipes
  recipeCard: {
    width: 180, backgroundColor: SURFACES.card, borderRadius: 12, borderWidth: 0.5, borderColor: SURFACES.border,
    padding: Spacing.md,
  },
});
