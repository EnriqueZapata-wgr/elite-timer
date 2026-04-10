/**
 * Food Text — Registro de comida por texto con autocompletado.
 * Busca en la base de datos local, calcula macros en tiempo real,
 * y guarda directamente en food_logs vía Supabase.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useMemo, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, Pressable,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { searchFoods, calculateNutrients } from '@/src/data/food-database';
import type { FoodItem } from '@/src/data/food-database';
import { haptic } from '@/src/utils/haptics';
import { Colors, Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import {
  CATEGORY_COLORS, SURFACES, TEXT_COLORS, SEMANTIC, withOpacity,
} from '@/src/constants/brand';

// === CONSTANTES ===

const BLUE = CATEGORY_COLORS.nutrition;

/** Íconos por categoría de alimento */
const CATEGORY_ICONS: Record<FoodItem['category'], keyof typeof Ionicons.glyphMap> = {
  proteina: 'fish-outline',
  vegetal: 'leaf-outline',
  fruta: 'nutrition-outline',
  grano: 'grid-outline',
  grasa: 'water-outline',
  lacteo: 'cafe-outline',
  procesado: 'fast-food-outline',
  bebida: 'beer-outline',
};

/** Tipos de comida con detección automática por hora */
const MEAL_TYPES = [
  { key: 'breakfast', label: 'Desayuno' },
  { key: 'lunch', label: 'Almuerzo' },
  { key: 'dinner', label: 'Cena' },
  { key: 'snack', label: 'Snack' },
] as const;

/** Ingrediente seleccionado con cantidad editable */
interface SelectedIngredient {
  food: FoodItem;
  grams: number;
  id: string; // clave única para la lista
}

// === UTILIDADES ===

/** Detecta tipo de comida por hora actual */
function autoMealType(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 15 && h < 18) return 'snack';
  return 'dinner';
}

/** Hora actual formateada */
function currentTime(): { hh: string; mm: string } {
  const now = new Date();
  return {
    hh: now.getHours().toString().padStart(2, '0'),
    mm: now.getMinutes().toString().padStart(2, '0'),
  };
}

/** Calcula quality_score simple basado en ingredientes */
function calcQualityScore(ingredients: SelectedIngredient[], totalProtein: number): number {
  if (ingredients.length === 0) return 0;
  const processedCount = ingredients.filter(i => i.food.isProcessed).length;
  const processedRatio = processedCount / ingredients.length;

  let score = 60; // Base
  if (processedRatio > 0.5) score = 40;
  if (totalProtein > 30) score += 20;
  return Math.min(score, 100);
}

// === COMPONENTE PRINCIPAL ===

export default function FoodTextScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // --- Estado de búsqueda ---
  const [query, setQuery] = useState('');
  const [ingredients, setIngredients] = useState<SelectedIngredient[]>([]);
  const [mealType, setMealType] = useState(autoMealType);
  const [timeHH, setTimeHH] = useState(currentTime().hh);
  const [timeMM, setTimeMM] = useState(currentTime().mm);
  const [saving, setSaving] = useState(false);

  // --- Resultados de búsqueda ---
  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchFoods(query.trim());
  }, [query]);

  // --- Macros totales calculados en tiempo real ---
  const totals = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0;
    for (const ing of ingredients) {
      const n = calculateNutrients(ing.food, ing.grams);
      calories += n.calories;
      protein += n.protein;
      carbs += n.carbs;
      fat += n.fat;
      fiber += n.fiber;
    }
    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
    };
  }, [ingredients]);

  // --- Agregar ingrediente desde autocompletado ---
  const addIngredient = useCallback((food: FoodItem) => {
    haptic.light();
    setIngredients(prev => [
      ...prev,
      { food, grams: food.servingGrams, id: `${food.name}-${Date.now()}` },
    ]);
    setQuery(''); // Limpiar búsqueda al seleccionar
  }, []);

  // --- Actualizar cantidad de un ingrediente ---
  const updateGrams = useCallback((id: string, text: string) => {
    const grams = parseInt(text, 10);
    if (isNaN(grams) && text !== '') return;
    setIngredients(prev =>
      prev.map(i => i.id === id ? { ...i, grams: isNaN(grams) ? 0 : grams } : i)
    );
  }, []);

  // --- Eliminar ingrediente ---
  const removeIngredient = useCallback((id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  }, []);

  // --- Guardar en Supabase ---
  const handleSave = useCallback(async () => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para guardar');
      return;
    }

    setSaving(true);
    try {
      const today = getLocalToday();
      const mealTime = `${timeHH.padStart(2, '0')}:${timeMM.padStart(2, '0')}:00`;

      haptic.success();
      if (ingredients.length > 0) {
        // Caso 1: Con ingredientes seleccionados → macros calculados
        const description = ingredients.map(i => `${i.food.name} (${i.grams}g)`).join(', ');
        const qualityScore = calcQualityScore(ingredients, totals.protein);

        // Usamos solo las columnas que existen en la migración 027.
        // fiber_g, quality_score, source se guardan en notes como JSON
        // para no perder datos si esas columnas no existen en la DB.
        const extras = JSON.stringify({ fiber_g: totals.fiber, quality_score: qualityScore, source: 'manual_text' });
        const { error } = await supabase.from('food_logs').insert({
          user_id: user.id,
          date: today,
          meal_time: mealTime,
          meal_type: mealType,
          description,
          calories: totals.calories,
          protein_g: totals.protein,
          carbs_g: totals.carbs,
          fat_g: totals.fat,
          notes: extras,
        });

        if (error) throw error;
      } else if (query.trim()) {
        // Caso 2: Texto libre sin autocompletado → solo descripción
        const { error } = await supabase.from('food_logs').insert({
          user_id: user.id,
          date: today,
          meal_time: mealTime,
          meal_type: mealType,
          description: query.trim(),
          notes: JSON.stringify({ source: 'manual_text' }),
        });

        if (error) throw error;
      } else {
        Alert.alert('Sin datos', 'Escribe algo o selecciona ingredientes');
        setSaving(false);
        return;
      }

      router.back();
    } catch (err: any) {
      Alert.alert('Error al guardar', err.message || 'Intenta de nuevo');
    } finally {
      setSaving(false);
    }
  }, [user, ingredients, query, mealType, timeHH, timeMM, totals, router]);

  // --- Verificar si el usuario escribió texto libre sin seleccionar resultados ---
  const isFreeTextOnly = query.trim().length > 0 && ingredients.length === 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.headerRow}>
        <PillarHeader pillar="nutrition" title="REGISTRO MANUAL" />
        <Pressable onPress={() => router.back()} style={s.closeBtn} hitSlop={12}>
          <Ionicons name="close" size={24} color={TEXT_COLORS.secondary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={s.flex1}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ Barra de búsqueda ═══ */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <View style={s.searchContainer}>
              <Ionicons name="search-outline" size={20} color={TEXT_COLORS.secondary} style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar alimento..."
                placeholderTextColor={TEXT_COLORS.muted}
                value={query}
                onChangeText={setQuery}
                autoFocus
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={TEXT_COLORS.secondary} />
                </Pressable>
              )}
            </View>
          </Animated.View>

          {/* ═══ Resultados de autocompletado ═══ */}
          {searchResults.length > 0 && (
            <Animated.View entering={FadeInUp.duration(300)} style={s.resultsContainer}>
              {searchResults.map((food, idx) => (
                <AnimatedPressable
                  key={`${food.name}-${idx}`}
                  onPress={() => addIngredient(food)}
                  style={s.resultItem}
                >
                  <View style={[s.categoryDot, { backgroundColor: withOpacity(BLUE, 0.2) }]}>
                    <Ionicons
                      name={CATEGORY_ICONS[food.category]}
                      size={16}
                      color={BLUE}
                    />
                  </View>
                  <View style={s.resultInfo}>
                    <EliteText style={s.resultName}>{food.name}</EliteText>
                    <EliteText style={s.resultMeta}>
                      {food.per100g.calories} kcal · {food.per100g.protein}g prot / 100g
                    </EliteText>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={BLUE} />
                </AnimatedPressable>
              ))}
            </Animated.View>
          )}

          {/* ═══ Aviso de texto libre ═══ */}
          {isFreeTextOnly && searchResults.length === 0 && (
            <Animated.View entering={FadeInUp.duration(300)} style={s.freeTextWarning}>
              <Ionicons name="information-circle-outline" size={18} color={SEMANTIC.warning} />
              <EliteText style={s.freeTextWarningText}>
                Sin datos nutricionales exactos — se guardará como texto
              </EliteText>
            </Animated.View>
          )}

          {/* ═══ Ingredientes seleccionados ═══ */}
          {ingredients.length > 0 && (
            <Animated.View entering={FadeInUp.duration(300)}>
              <EliteText style={s.sectionTitle}>Ingredientes</EliteText>
              {ingredients.map((ing) => {
                const nutrients = calculateNutrients(ing.food, ing.grams);
                return (
                  <Animated.View
                    key={ing.id}
                    entering={FadeInUp.duration(250)}
                    style={s.ingredientCard}
                  >
                    <View style={s.ingredientHeader}>
                      <View style={s.ingredientNameRow}>
                        <Ionicons
                          name={CATEGORY_ICONS[ing.food.category]}
                          size={16}
                          color={BLUE}
                        />
                        <EliteText style={s.ingredientName}>{ing.food.name}</EliteText>
                      </View>
                      <Pressable onPress={() => removeIngredient(ing.id)} hitSlop={10}>
                        <Ionicons name="close-circle" size={22} color={SEMANTIC.error} />
                      </Pressable>
                    </View>

                    <View style={s.ingredientBody}>
                      {/* Input de cantidad */}
                      <View style={s.gramsInputRow}>
                        <TextInput
                          style={s.gramsInput}
                          value={ing.grams > 0 ? ing.grams.toString() : ''}
                          onChangeText={(t) => updateGrams(ing.id, t)}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                        />
                        <EliteText style={s.gramsLabel}>g</EliteText>
                      </View>

                      {/* Mini macros del ingrediente */}
                      <View style={s.ingredientMacros}>
                        <EliteText style={s.macroMini}>{nutrients.calories} kcal</EliteText>
                        <EliteText style={[s.macroMini, { color: SEMANTIC.info }]}>
                          P {nutrients.protein}
                        </EliteText>
                        <EliteText style={[s.macroMini, { color: SEMANTIC.warning }]}>
                          C {nutrients.carbs}
                        </EliteText>
                        <EliteText style={[s.macroMini, { color: SEMANTIC.error }]}>
                          G {nutrients.fat}
                        </EliteText>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </Animated.View>
          )}

          {/* ═══ Resumen de macros totales ═══ */}
          {ingredients.length > 0 && (
            <Animated.View entering={FadeInUp.delay(100).duration(400)} style={s.totalsCard}>
              <EliteText style={s.totalsTitle}>Total</EliteText>
              <View style={s.totalsRow}>
                <MacroBox label="Calorías" value={`${totals.calories}`} unit="kcal" color={BLUE} />
                <MacroBox label="Proteína" value={`${totals.protein}`} unit="g" color={SEMANTIC.info} />
                <MacroBox label="Carbs" value={`${totals.carbs}`} unit="g" color={SEMANTIC.warning} />
                <MacroBox label="Grasa" value={`${totals.fat}`} unit="g" color={SEMANTIC.error} />
                <MacroBox label="Fibra" value={`${totals.fiber}`} unit="g" color={SEMANTIC.success} />
              </View>
            </Animated.View>
          )}

          {/* ═══ Tipo de comida ═══ */}
          <Animated.View entering={FadeInUp.delay(150).duration(400)}>
            <EliteText style={s.sectionTitle}>Tipo de comida</EliteText>
            <View style={s.pillsRow}>
              {MEAL_TYPES.map(mt => {
                const active = mealType === mt.key;
                return (
                  <AnimatedPressable
                    key={mt.key}
                    onPress={() => setMealType(mt.key)}
                    style={[
                      s.pill,
                      active && { backgroundColor: withOpacity(BLUE, 0.2), borderColor: BLUE },
                    ]}
                  >
                    <EliteText style={[s.pillText, active && { color: BLUE }]}>
                      {mt.label}
                    </EliteText>
                  </AnimatedPressable>
                );
              })}
            </View>
          </Animated.View>

          {/* ═══ Selector de hora ═══ */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)}>
            <EliteText style={s.sectionTitle}>Hora</EliteText>
            <View style={s.timeRow}>
              <TextInput
                style={s.timeInput}
                value={timeHH}
                onChangeText={(t) => {
                  const clean = t.replace(/[^0-9]/g, '').slice(0, 2);
                  const num = parseInt(clean, 10);
                  if (clean === '' || (num >= 0 && num <= 23)) setTimeHH(clean);
                }}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
              <EliteText style={s.timeSeparator}>:</EliteText>
              <TextInput
                style={s.timeInput}
                value={timeMM}
                onChangeText={(t) => {
                  const clean = t.replace(/[^0-9]/g, '').slice(0, 2);
                  const num = parseInt(clean, 10);
                  if (clean === '' || (num >= 0 && num <= 59)) setTimeMM(clean);
                }}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
            </View>
          </Animated.View>

          {/* ═══ Botón guardar ═══ */}
          <Animated.View entering={FadeInUp.delay(250).duration(400)} style={s.saveSection}>
            <AnimatedPressable
              onPress={handleSave}
              disabled={saving || (!query.trim() && ingredients.length === 0)}
              style={[
                s.saveBtn,
                (saving || (!query.trim() && ingredients.length === 0)) && s.saveBtnDisabled,
              ]}
            >
              {saving ? (
                <EliteText style={s.saveBtnText}>Guardando...</EliteText>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color={TEXT_COLORS.onAccent} />
                  <EliteText style={s.saveBtnText}>
                    {ingredients.length > 0 ? 'Guardar comida' : 'Guardar como texto'}
                  </EliteText>
                </>
              )}
            </AnimatedPressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// === COMPONENTE AUXILIAR: Caja de macro ===

function MacroBox({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string;
}) {
  return (
    <View style={s.macroBox}>
      <EliteText style={[s.macroValue, { color }]}>{value}</EliteText>
      <EliteText style={s.macroUnit}>{unit}</EliteText>
      <EliteText style={s.macroLabel}>{label}</EliteText>
    </View>
  );
}

// === ESTILOS ===

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex1: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACES.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // --- Búsqueda ---
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: SURFACES.disabled,
    paddingHorizontal: Spacing.sm + 4,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
  },

  // --- Resultados de autocompletado ---
  resultsContainer: {
    backgroundColor: SURFACES.card,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm + 4,
    borderBottomWidth: 0.5,
    borderBottomColor: SURFACES.border,
  },
  categoryDot: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  resultMeta: {
    color: TEXT_COLORS.secondary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },

  // --- Aviso de texto libre ---
  freeTextWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withOpacity(SEMANTIC.warning, 0.1),
    borderRadius: Radius.card,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm + 4,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  freeTextWarningText: {
    flex: 1,
    color: SEMANTIC.warning,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
  },

  // --- Ingredientes seleccionados ---
  sectionTitle: {
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  ingredientCard: {
    backgroundColor: SURFACES.card,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.sm,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingredientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  ingredientName: {
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
  },
  ingredientBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  gramsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: SURFACES.disabled,
    paddingHorizontal: Spacing.sm,
  },
  gramsInput: {
    width: 60,
    height: 36,
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  gramsLabel: {
    color: TEXT_COLORS.secondary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    marginLeft: 2,
  },
  ingredientMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  macroMini: {
    color: TEXT_COLORS.secondary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
  },

  // --- Totales ---
  totalsCard: {
    backgroundColor: SURFACES.card,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: SURFACES.border,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  totalsTitle: {
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroBox: {
    alignItems: 'center',
  },
  macroValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
  },
  macroUnit: {
    color: TEXT_COLORS.secondary,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    marginTop: -2,
  },
  macroLabel: {
    color: TEXT_COLORS.muted,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },

  // --- Pills de tipo de comida ---
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: SURFACES.border,
    backgroundColor: SURFACES.card,
  },
  pillText: {
    color: TEXT_COLORS.secondary,
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
  },

  // --- Selector de hora ---
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timeInput: {
    width: 56,
    height: 44,
    backgroundColor: SURFACES.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: SURFACES.disabled,
    color: TEXT_COLORS.primary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    textAlign: 'center',
  },
  timeSeparator: {
    color: TEXT_COLORS.secondary,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
  },

  // --- Botón guardar ---
  saveSection: {
    marginTop: Spacing.lg,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    borderRadius: Radius.card,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    color: TEXT_COLORS.onAccent,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
  },
});
