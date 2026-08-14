/**
 * OLA3 · Sensor TEXTO — el cuerpo de food-text, ya sin carcasa propia.
 *
 * Conserva entero: autocompletado local sobre la base de alimentos, macros en
 * vivo, estimación con IA cuando el buscador no encuentra, calcQualityScore,
 * los clamps anti-NaN (REG-3 / REG-4) y el editor de revisión como salida.
 *
 * Lo que perdió (ahora es de la carcasa): header, chips de tipo de comida y
 * el selector de hora HH:MM — que dejó de ser exclusivo de este sensor y hoy
 * lo comparten los tres.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { warn as logWarn } from '@/src/lib/logger';
import { searchFoods, calculateNutrients } from '@/src/data/food-database';
import type { FoodItem } from '@/src/data/food-database';
import { analyzeFoodText as analyzeWithAI } from '@/src/services/nutrition-service';
import { saveFoodLog } from '@/src/services/food-log-service';
import { FoodReviewEditor, type ReviewState } from '@/src/components/nutrition/FoodReviewEditor';
import { updateFrequentFood } from '@/src/services/frequent-foods-service';
import { useNutritionMode } from '@/src/hooks/useNutritionMode';
import { maybeGeneratePostMealInsight } from '@/src/services/argos-nutrition-insights';
import { haptic } from '@/src/utils/haptics';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, TEXT_COLORS, SEMANTIC, withOpacity, ATP_BRAND } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { argosRateLimitMessage } from '@/src/services/argos-stream-core';
import type { SensorPanelProps } from './types';

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

/** Ingrediente seleccionado con cantidad editable */
interface SelectedIngredient {
  food: FoodItem;
  grams: number;
  id: string; // clave única para la lista
}

// REG-4: límites duros para gramos por ingrediente.
const MIN_GRAMS = 0;
const MAX_GRAMS = 5000;

/** Convierte un valor a número finito; si no, usa fallback (REG-3). */
function safeNum(value: any, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Limpia los gramos al rango [MIN_GRAMS, MAX_GRAMS] (REG-4). */
function clampGrams(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.max(MIN_GRAMS, Math.min(value, MAX_GRAMS));
}

/**
 * REG-3: parsea la porción que devuelve la IA. Si no es un número finito
 * (ej. "al gusto", "1 puño"), cae a 100g y registra un warning para que
 * el usuario pueda editar después — pero NUNCA persistimos NaN.
 */
function parseAIPortion(portion: unknown): number {
  if (typeof portion !== 'string' || portion.trim().length === 0) return 100;
  const cleaned = portion.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  if (!Number.isFinite(parsed)) {
    logWarn('food-log[texto]: porción de IA no numérica, default 100g', { portion });
    return 100;
  }
  return clampGrams(parsed);
}

/**
 * Calcula quality_score (0-100) del registro manual.
 * Doctrina ATP (MB-8 Track D.0): la calidad la manda la LIMPIEZA de la comida
 * (proporción de ingredientes sin procesar), no un macro. La proteína da solo
 * un bono chico de adecuación — nunca compensa una comida procesada.
 */
function calcQualityScore(ingredients: SelectedIngredient[], totalProtein: number): number {
  if (ingredients.length === 0) return 0;
  const processedCount = ingredients.filter(i => i.food.isProcessed).length;
  const cleanRatio = 1 - processedCount / ingredients.length;
  let score = 40 + Math.round(cleanRatio * 50); // 40-90: la limpieza manda
  if (totalProtein >= 25) score += 10;          // bono de adecuación proteica
  return Math.min(score, 100);
}

export function TextSensor({ mealType, mealTime, onTakeover, onSaved }: SensorPanelProps) {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const { kind, tokens: t } = useAppTheme();
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const { mode: nutritionMode } = useNutritionMode();

  const [query, setQuery] = useState('');
  const [ingredients, setIngredients] = useState<SelectedIngredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

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

  const openReview = useCallback((v: boolean) => {
    setShowReview(v);
    onTakeover(v);
  }, [onTakeover]);

  const addIngredient = useCallback((food: FoodItem, gramsOverride?: number) => {
    haptic.light();
    // REG-3/REG-4: gramos siempre finitos y dentro de rango.
    const grams = clampGrams(gramsOverride ?? food.servingGrams ?? 100);
    setIngredients(prev => [
      ...prev,
      { food, grams, id: `${food.name}-${Date.now()}` },
    ]);
    setQuery(''); // Limpiar búsqueda al seleccionar
  }, []);

  const updateGrams = useCallback((id: string, text: string) => {
    const parsed = parseInt(text, 10);
    if (isNaN(parsed) && text !== '') return;
    // REG-4: clamp 0–5000g. Si el usuario teclea un valor mayor, lo topamos
    // (no rechazamos toda la entrada) y registramos un warning.
    const next = isNaN(parsed) ? 0 : clampGrams(parsed);
    if (!isNaN(parsed) && parsed > MAX_GRAMS) {
      logWarn('food-log[texto]: gramos topados a MAX_GRAMS', { input: parsed, clamped: MAX_GRAMS });
    }
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, grams: next } : i));
  }, []);

  const removeIngredient = useCallback((id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  }, []);

  // El estado de revisión que representa lo armado (compartido por el editor
  // en COMPLETO y por el guardado directo en SIMPLE — mismos números).
  const buildReviewState = useCallback((): ReviewState => ({
    description: ingredients.map(i => `${i.food.name}`).join(', '),
    items: ingredients.map(i => {
      const n = calculateNutrients(i.food, i.grams);
      return {
        name: i.food.name,
        quantity: i.grams,
        unit: 'g' as const,
        calories: n.calories,
        protein_g: n.protein,
        carbs_g: n.carbs,
        fat_g: n.fat,
      };
    }),
    totals: {
      calories: totals.calories,
      protein_g: totals.protein,
      carbs_g: totals.carbs,
      fat_g: totals.fat,
    },
  }), [ingredients, totals]);

  // Guardar en Supabase (después de revisión o directo)
  const persistSave = useCallback(async (reviewed: ReviewState) => {
    openReview(false);
    setSaving(true);
    try {
      const today = getLocalToday();
      const desc = reviewed.description || ingredients.map(i => `${i.food.name} (${i.grams}g)`).join(', ') || query.trim();
      // REG-cabos: barrera final antes de la DB. Aunque reviewed.totals viene
      // ya saneado, blindamos cada total con safeNum por si algún path nuevo
      // de edición deja un NaN colgado.
      const safeCalories = safeNum(reviewed.totals.calories, 0);
      const safeProtein = safeNum(reviewed.totals.protein_g, 0);
      const safeCarbs = safeNum(reviewed.totals.carbs_g, 0);
      const safeFat = safeNum(reviewed.totals.fat_g, 0);
      const hasMacros = safeCalories > 0 || safeProtein > 0;
      const qualityScore = ingredients.length > 0 ? calcQualityScore(ingredients, safeProtein) : 0;

      // Track A (MB-8): guardado unificado — source/was_edited a columnas reales.
      const result = await saveFoodLog({
        userId: user!.id,
        date: today,
        mealTime: `${mealTime}:00`,
        mealType,
        description: desc,
        source: 'manual_text',
        wasEdited: true,
        calories: hasMacros ? Math.round(safeCalories * 10) / 10 : null,
        proteinG: hasMacros ? Math.round(safeProtein * 10) / 10 : null,
        carbsG: hasMacros ? Math.round(safeCarbs * 10) / 10 : null,
        fatG: hasMacros ? Math.round(safeFat * 10) / 10 : null,
        extras: { fiber_g: safeNum(totals.fiber, 0), quality_score: qualityScore },
      });
      if (!result.ok) throw new Error(result.message);
      // D-2 (MB-12): el buzz de éxito va DESPUÉS del guardado confirmado.
      haptic.success();

      // Actualizar frecuentes (background, no bloquear UI)
      if (user?.id && hasMacros) {
        updateFrequentFood(user.id, mealType, {
          description: desc,
          calories: safeCalories,
          protein_g: safeProtein,
          carbs_g: safeCarbs,
          fat_g: safeFat,
          items: reviewed.items,
        });
      }

      // 'day_changed' lo emite saveFoodLog (regla #6).
      analytics.track(ATP_EVENTS.FOOD_LOGGED, { source: 'text', meal_type: mealType });
      // Insight post-meal de ARGOS (opt-in + throttle, no bloquea).
      if (user?.id) void maybeGeneratePostMealInsight(user.id, desc);
      // OLA3: no se cierra la pantalla. La lista de hoy vive abajo y se
      // refresca sola: registrar dos cosas seguidas ya no cuesta dos viajes.
      setIngredients([]);
      setQuery('');
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
      onSaved();
    } catch (err: any) {
      // MB-SEC-1 §6: detalle al log, copy genérico a pantalla.
      logWarn('[food-log:texto] no se pudo guardar:', err?.message);
      Alert.alert('Error al guardar', 'Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [user, ingredients, query, mealType, mealTime, totals, analytics, onSaved, openReview]);

  // --- Guardar: COMPLETO revisa antes; SIMPLE registra y ya (P1 MB-28A) ---
  const handleSave = useCallback(() => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para guardar');
      return;
    }
    if (ingredients.length === 0 && !query.trim()) {
      Alert.alert('Sin datos', 'Escribe algo o selecciona ingredientes');
      return;
    }

    if (ingredients.length > 0) {
      if (nutritionMode === 'complete') {
        // COMPLETO: el editor de revisión es el paso siguiente del guardado.
        openReview(true);
      } else {
        // SIMPLE: guarda tal cual con los mismos números calculados.
        void persistSave(buildReviewState());
      }
      return;
    }

    // Texto libre sin ingredientes → guardar directo
    void persistSave({
      description: query.trim(),
      items: [],
      totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    });
  }, [user, ingredients, query, nutritionMode, buildReviewState, persistSave, openReview]);

  // MB-31B3: FoodReviewEditor NO está tematizado (pinta su propio #000) — la
  // rama de revisión se queda oscura.
  if (showReview && ingredients.length > 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000', minHeight: 560 }} edges={['top']}>
        <FoodReviewEditor
          initialState={buildReviewState()}
          onSave={persistSave}
          onCancel={() => openReview(false)}
        />
      </SafeAreaView>
    );
  }

  const canSave = !saving && (!!query.trim() || ingredients.length > 0);

  return (
    <View>
      {/* ═══ Barra de búsqueda ═══ */}
      <Animated.View entering={FadeInUp.delay(100).duration(400)}>
        <View style={[s.searchContainer, { backgroundColor: t.card, borderColor: t.bordeMarcado }]}>
          <Ionicons name="search-outline" size={20} color={t.textoSecundario} style={s.searchIcon} />
          <TextInput
            style={[s.searchInput, { color: t.texto }]}
            placeholder="Buscar alimento..."
            placeholderTextColor={t.textoTenue}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={t.textoSecundario} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {justSaved && (
        <Animated.View entering={FadeInUp.duration(250)} style={s.savedPill}>
          <Ionicons name="checkmark-circle" size={16} color={ATP_BRAND.lime} />
          <EliteText style={{ color: ATP_BRAND.lime, fontSize: FontSizes.sm, fontFamily: Fonts.semiBold }}>
            Registrado
          </EliteText>
        </Animated.View>
      )}

      {/* ═══ Resultados de autocompletado ═══ */}
      {searchResults.length > 0 && (
        <Animated.View entering={FadeInUp.duration(300)} style={[s.resultsContainer, { backgroundColor: t.card, borderColor: t.borde }]}>
          {searchResults.map((food, idx) => (
            <AnimatedPressable
              key={`${food.name}-${idx}`}
              onPress={() => addIngredient(food)}
              style={[s.resultItem, { borderBottomColor: t.borde }]}
            >
              <View style={[s.categoryDot, { backgroundColor: withOpacity(BLUE, 0.2) }]}>
                <Ionicons name={CATEGORY_ICONS[food.category]} size={16} color={BLUE} />
              </View>
              <View style={s.resultInfo}>
                <EliteText style={[s.resultName, { color: t.texto }]}>{food.name}</EliteText>
                <EliteText style={[s.resultMeta, { color: t.textoSecundario }]}>
                  {food.per100g.calories} kcal · {food.per100g.protein}g prot / 100g
                </EliteText>
              </View>
              <Ionicons name="add-circle-outline" size={22} color={BLUE} />
            </AnimatedPressable>
          ))}
        </Animated.View>
      )}

      {/* ═══ Estimar con IA cuando no hay resultados ═══ */}
      {searchResults.length === 0 && query.trim().length > 2 && (
        <Animated.View entering={FadeInUp.duration(300)}>
          <AnimatedPressable
            onPress={async () => {
              haptic.medium();
              setAiLoading(true);
              try {
                const result = await analyzeWithAI(query.trim());
                if (result?.ingredients?.length > 0) {
                  for (const ing of result.ingredients) {
                    // REG-3: blindar TODOS los campos numéricos de la IA.
                    const food = {
                      name: ing.name ?? query.trim(),
                      category: 'procesado',
                      per100g: {
                        calories: safeNum(ing.calories, 0),
                        protein: safeNum(ing.protein, 0),
                        carbs: safeNum(ing.carbs, 0),
                        fat: safeNum(ing.fat, 0),
                        fiber: safeNum(ing.fiber, 0),
                      },
                      servingSize: ing.portion ?? '100g',
                      servingGrams: 100,
                      isProcessed: false,
                      tags: [] as string[],
                    } as FoodItem;
                    addIngredient(food, parseAIPortion(ing.portion));
                  }
                } else {
                  Alert.alert('Sin resultado', 'No se pudo estimar. Intenta con otra descripción.');
                }
              } catch (err: any) {
                // D-4 (MB-12): el rate limit NO es una falla de red.
                if (err?.name === 'ArgosRateLimitError') {
                  Alert.alert('Límite de ARGOS', argosRateLimitMessage(err?.payload));
                } else {
                  Alert.alert('Error', 'No se pudo conectar con IA. Intenta de nuevo.');
                }
              } finally {
                setAiLoading(false);
              }
            }}
            disabled={aiLoading}
            style={s.aiSearchBtn}
          >
            {aiLoading ? (
              <ActivityIndicator color={ATP_BRAND.lime} size="small" />
            ) : (
              <Ionicons name="sparkles-outline" size={20} color={ATP_BRAND.lime} />
            )}
            <View style={{ flex: 1 }}>
              <EliteText style={[s.aiSearchTitle, { color: acento }]}>Estimar con IA</EliteText>
              <EliteText style={s.aiSearchSub}>{`"${query.trim()}" · calcular macros`}</EliteText>
            </View>
          </AnimatedPressable>
        </Animated.View>
      )}

      {/* ═══ Ingredientes seleccionados ═══ */}
      {ingredients.length > 0 && (
        <Animated.View entering={FadeInUp.duration(300)}>
          <EliteText style={[s.sectionTitle, { color: t.texto }]}>Ingredientes</EliteText>
          {ingredients.map((ing) => {
            const nutrients = calculateNutrients(ing.food, ing.grams);
            return (
              <Animated.View
                key={ing.id}
                entering={FadeInUp.duration(250)}
                style={[s.ingredientCard, { backgroundColor: t.hundido, borderColor: t.borde }]}
              >
                <View style={s.ingredientHeader}>
                  <View style={s.ingredientNameRow}>
                    <Ionicons name={CATEGORY_ICONS[ing.food.category]} size={16} color={BLUE} />
                    <EliteText style={[s.ingredientName, { color: t.texto }]}>{ing.food.name}</EliteText>
                  </View>
                  <Pressable onPress={() => removeIngredient(ing.id)} hitSlop={10}>
                    <Ionicons name="close-circle" size={22} color={t.error} />
                  </Pressable>
                </View>

                <View style={s.ingredientBody}>
                  {/* Input de cantidad — más grande y visible */}
                  <View style={s.gramsInputRow}>
                    <TextInput
                      style={[s.gramsInput, { backgroundColor: t.flotante, color: acento }]}
                      value={ing.grams > 0 ? ing.grams.toString() : ''}
                      onChangeText={(v) => updateGrams(ing.id, v)}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                    />
                    <View style={s.gramsUnitBadge}>
                      <EliteText style={[s.gramsLabel, { color: acento }]}>g</EliteText>
                    </View>
                  </View>

                  {/* Mini macros del ingrediente. P1 MB-28A: en SIMPLE el único
                      número es la proteína (doctrina score+proteína). */}
                  <View style={s.ingredientMacros}>
                    {nutritionMode === 'complete' && (
                      <EliteText style={[s.macroMini, { color: t.textoSecundario }]}>{nutrients.calories} kcal</EliteText>
                    )}
                    <EliteText style={[s.macroMini, { color: t.info }]}>P {nutrients.protein}</EliteText>
                    {nutritionMode === 'complete' && (
                      <>
                        <EliteText style={[s.macroMini, { color: SEMANTIC.warning }]}>C {nutrients.carbs}</EliteText>
                        <EliteText style={[s.macroMini, { color: t.error }]}>G {nutrients.fat}</EliteText>
                      </>
                    )}
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>
      )}

      {/* ═══ Resumen de macros totales ═══ */}
      {ingredients.length > 0 && (
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={[s.totalsCard, { backgroundColor: t.card, borderColor: t.borde }]}>
          <EliteText style={[s.totalsTitle, { color: t.texto }]}>Total</EliteText>
          <View style={s.totalsRow}>
            {nutritionMode === 'complete' && (
              <MacroBox label="Calorías" value={`${totals.calories}`} unit="kcal" color={BLUE} />
            )}
            <MacroBox label="Proteína" value={`${totals.protein}`} unit="g" color={t.info} />
            {nutritionMode === 'complete' && (
              <>
                <MacroBox label="Carbs" value={`${totals.carbs}`} unit="g" color={SEMANTIC.warning} />
                <MacroBox label="Grasa" value={`${totals.fat}`} unit="g" color={t.error} />
                <MacroBox label="Fibra" value={`${totals.fiber}`} unit="g" color={SEMANTIC.success} />
              </>
            )}
          </View>
        </Animated.View>
      )}

      {/* ═══ Botón guardar ═══ */}
      <Animated.View entering={FadeInUp.delay(250).duration(400)} style={s.saveSection}>
        <AnimatedPressable
          onPress={handleSave}
          disabled={!canSave}
          style={[s.saveBtn, !canSave && { backgroundColor: t.flotante }]}
        >
          {saving ? (
            <EliteText style={s.saveBtnText}>Guardando...</EliteText>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color={canSave ? TEXT_COLORS.onAccent : t.textoTenue} />
              <EliteText style={[s.saveBtnText, !canSave && { color: t.textoTenue }]}>
                {ingredients.length > 0 ? 'Guardar comida' : 'Guardar como texto'}
              </EliteText>
            </>
          )}
        </AnimatedPressable>
        {/* P1 MB-28A: en SIMPLE ajustar es opt-in; en COMPLETO el editor ya es
            el paso siguiente del botón Guardar. */}
        {nutritionMode === 'simple' && ingredients.length > 0 && (
          <Pressable onPress={() => openReview(true)} disabled={saving}
            style={{ alignSelf: 'center', paddingVertical: Spacing.sm, marginTop: Spacing.xs }}>
            <EliteText style={{ color: t.textoTenue, fontSize: FontSizes.md }}>
              Revisar y ajustar antes de guardar
            </EliteText>
          </Pressable>
        )}
      </Animated.View>
      {/* B-5 (MB-12): las macros son estimación de IA */}
      <MedicalDisclaimer feature="nutrition" />
    </View>
  );
}

function MacroBox({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string;
}) {
  const { tokens: t } = useAppTheme();
  return (
    <View style={s.macroBox}>
      <EliteText style={[s.macroValue, { color }]}>{value}</EliteText>
      <EliteText style={[s.macroUnit, { color: t.textoSecundario }]}>{unit}</EliteText>
      <EliteText style={[s.macroLabel, { color: t.textoTenue }]}>{label}</EliteText>
    </View>
  );
}

const s = StyleSheet.create({
  // --- Búsqueda ---
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 4,
    marginBottom: Spacing.sm,
  },
  searchIcon: { marginRight: Spacing.xs },
  searchInput: {
    flex: 1,
    height: 48,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.md,
  },
  savedPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(168,224,42,0.10)', borderRadius: Radius.pill,
    paddingVertical: 8, marginBottom: Spacing.sm,
  },

  // --- Resultados de autocompletado ---
  resultsContainer: {
    borderRadius: Radius.card,
    borderWidth: 0.5,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm + 4,
    borderBottomWidth: 0.5,
  },
  categoryDot: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  resultInfo: { flex: 1 },
  resultName: { fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  resultMeta: { fontFamily: Fonts.regular, fontSize: FontSizes.sm, marginTop: 2 },

  // --- AI search ---
  aiSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(168,224,42,0.08)',
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  aiSearchTitle: { fontFamily: Fonts.bold, fontSize: FontSizes.md },
  aiSearchSub: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },

  // --- Ingredientes seleccionados ---
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  ingredientCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
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
  ingredientName: { fontFamily: Fonts.bold, fontSize: 15 },
  ingredientBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  gramsInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gramsInput: {
    width: 80,
    height: 50,
    fontFamily: Fonts.bold,
    fontSize: 22,
    textAlign: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  gramsUnitBadge: {
    backgroundColor: 'rgba(168,224,42,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168,224,42,0.25)',
  },
  gramsLabel: { fontFamily: Fonts.bold, fontSize: 14 },
  ingredientMacros: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  macroMini: { fontFamily: Fonts.regular, fontSize: FontSizes.xs },

  // --- Totales ---
  totalsCard: {
    borderRadius: Radius.card,
    borderWidth: 0.5,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  totalsTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroBox: { alignItems: 'center' },
  macroValue: { fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  macroUnit: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: -2 },
  macroLabel: { fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 2 },

  // --- Botón guardar ---
  saveSection: { marginTop: Spacing.lg },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    borderRadius: Radius.card,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  saveBtnText: {
    color: TEXT_COLORS.onAccent,
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
  },
});
