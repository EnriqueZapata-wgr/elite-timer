/**
 * OLA3 · Sensor TEXTO — el cuerpo de food-text, ya sin carcasa propia.
 *
 * Conserva entero: macros en vivo, estimación con IA cuando el buscador no
 * encuentra, calcQualityScore, los clamps anti-NaN (REG-3 / REG-4) y el
 * editor de revisión como salida.
 *
 * NOCHE-2: el autocompletado dejó de leer los 147 alimentos hardcodeados y
 * ahora consulta la biblioteca real (604 alimentos, 44 nutrientes por 100 g,
 * porciones caseras). Dos consecuencias visibles:
 *  - Se elige la cantidad en la unidad del alimento (3 tortillas, 1 taza,
 *    250 ml), no en gramos a ojo. La conversión vive en food-library-core.
 *  - Un nutriente sin dato NO se cuenta como cero: el total lo marca con ≥
 *    para no fabricar un déficit que no existe.
 *
 * Lo que perdió (ahora es de la carcasa): header, chips de tipo de comida y
 * el selector de hora HH:MM — que dejó de ser exclusivo de este sensor y hoy
 * lo comparten los tres.
 */
import { getLocalToday } from '@/src/utils/date-helpers';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { warn as logWarn } from '@/src/lib/logger';
import { buscarAlimentos } from '@/src/services/food-library-service';
import {
  escalarPerfil, sumarPerfiles, resolverGramos, porcionDefault,
  type Cantidad, type FoodItem,
} from '@/src/services/food-library-core';
import { PortionSelector } from './PortionSelector';
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
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { argosRateLimitMessage } from '@/src/services/argos-stream-core';
import type { SensorPanelProps } from './types';

const BLUE = CATEGORY_COLORS.nutrition;

/** Íconos por categoría de la biblioteca. Las 14 categorías del esquema. */
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  proteina: 'fish-outline',
  lacteo: 'cafe-outline',
  grano: 'grid-outline',
  leguminosa: 'ellipse-outline',
  verdura: 'leaf-outline',
  fruta: 'nutrition-outline',
  grasa: 'water-outline',
  bebida: 'beer-outline',
  platillo: 'restaurant-outline',
  snack: 'fast-food-outline',
  suplemento: 'flask-outline',
  condimento: 'color-filter-outline',
  endulzante: 'cube-outline',
  otro: 'ellipsis-horizontal',
};

function iconoDe(categoria: string): keyof typeof Ionicons.glyphMap {
  return CATEGORY_ICONS[categoria] ?? 'ellipsis-horizontal';
}

/**
 * Ingrediente elegido. Se guarda la CANTIDAD tal como la dijo el usuario
 * (3 tortillas, 250 ml) y los gramos se derivan, nunca al revés: así el
 * selector puede volver a mostrar "3 tortillas" y no "90 g".
 */
interface SelectedIngredient {
  food: FoodItem;
  cantidad: Cantidad;
  id: string; // clave única para la lista
}

/** Los gramos que representa una cantidad, ya topados al rango seguro. */
function gramosDe(ing: SelectedIngredient): number {
  const g = resolverGramos(ing.food, ing.cantidad);
  if (g == null) return 0;
  // REG-4: 5 kg de un solo alimento es un dedo pegado al teclado, no una comida.
  if (g > MAX_GRAMS) {
    logWarn('food-log[texto]: gramos topados a MAX_GRAMS', { resuelto: g, clamped: MAX_GRAMS });
  }
  return clampGrams(g);
}

/** Cómo se lee la cantidad en el registro: "1 taza", "1 tortilla ×3", "250 ml". */
function describirCantidad(ing: SelectedIngredient): string {
  const c = ing.cantidad;
  if (c.tipo === 'porcion') return c.valor === 1 ? c.label : `${c.label} ×${c.valor}`;
  if (c.tipo === 'gramos') return `${Math.round(c.valor)} g`;
  return `${c.valor} ${c.unidad}`;
}

/** La cantidad con la que se abre el selector: la porción default. */
function cantidadInicial(food: FoodItem): Cantidad {
  const p = porcionDefault(food);
  if ((food.portions ?? []).length > 0) return { tipo: 'porcion', valor: 1, label: p.label };
  return { tipo: 'gramos', valor: p.grams };
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
  const processedCount = ingredients.filter(i => i.food.is_processed).length;
  const cleanRatio = 1 - processedCount / ingredients.length;
  let score = 40 + Math.round(cleanRatio * 50); // 40-90: la limpieza manda
  if (totalProtein >= 25) score += 10;          // bono de adecuación proteica
  return Math.min(score, 100);
}

export function TextSensor({ mealType, mealTime, onTakeover, onSaved }: SensorPanelProps) {
  const { user } = useAuth();
  const analytics = useAnalytics();
  // Componente compartido → useSurfaceTokens (oscuro fuera de <ThemeReady>).
  const t = useSurfaceTokens();
  const kind = t.kind;
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const { mode: nutritionMode } = useNutritionMode();

  const [query, setQuery] = useState('');
  const [ingredients, setIngredients] = useState<SelectedIngredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [buscando, setBuscando] = useState(false);

  // La búsqueda ahora va a la base, así que se espera a que el usuario deje
  // de teclear. 250 ms es el punto donde ya no se siente el retraso y deja de
  // dispararse una consulta por letra.
  useEffect(() => {
    const termino = query.trim();
    if (termino.length < 2) {
      setSearchResults([]);
      setBuscando(false);
      return;
    }
    let vivo = true;
    setBuscando(true);
    const timer = setTimeout(async () => {
      const encontrados = await buscarAlimentos(termino);
      if (!vivo) return;
      setSearchResults(encontrados);
      setBuscando(false);
    }, 250);
    return () => { vivo = false; clearTimeout(timer); };
  }, [query]);

  // --- Perfil total calculado en tiempo real ---
  // sumarPerfiles preserva la diferencia entre 0 y sin dato: `parciales` trae
  // los nutrientes donde algún ingrediente no traía el dato, y la UI los marca
  // con ≥ en vez de presentar un número exacto que sería mentira.
  const { total, parciales } = useMemo(
    () => sumarPerfiles(ingredients.map((i) => escalarPerfil(i.food, gramosDe(i)))),
    [ingredients],
  );

  const totals = useMemo(() => ({
    calories: Math.round(total.kcal ?? 0),
    protein: Math.round((total.protein_g ?? 0) * 10) / 10,
    carbs: Math.round((total.carbs_g ?? 0) * 10) / 10,
    fat: Math.round((total.fat_g ?? 0) * 10) / 10,
    fiber: Math.round((total.fiber_g ?? 0) * 10) / 10,
  }), [total]);

  /** ¿Este nutriente quedó incompleto? Entonces el número es un mínimo. */
  const esParcial = useCallback(
    (k: (typeof parciales)[number]) => parciales.includes(k),
    [parciales],
  );

  const openReview = useCallback((v: boolean) => {
    setShowReview(v);
    onTakeover(v);
  }, [onTakeover]);

  const addIngredient = useCallback((food: FoodItem, gramsOverride?: number) => {
    haptic.light();
    // El alimento entra en SU porción default (1 tortilla, 1 taza). Solo la
    // estimación con IA llega en gramos, y ahí sí se topa (REG-3 / REG-4).
    const cantidad: Cantidad = gramsOverride != null
      ? { tipo: 'gramos', valor: clampGrams(gramsOverride) }
      : cantidadInicial(food);
    setIngredients(prev => [
      ...prev,
      { food, cantidad, id: `${food.slug || food.name_es}-${Date.now()}` },
    ]);
    setQuery(''); // Limpiar búsqueda al seleccionar
  }, []);

  const updateCantidad = useCallback((id: string, cantidad: Cantidad) => {
    setIngredients(prev => prev.map(i => (i.id === id ? { ...i, cantidad } : i)));
  }, []);

  const removeIngredient = useCallback((id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  }, []);

  // El estado de revisión que representa lo armado (compartido por el editor
  // en COMPLETO y por el guardado directo en SIMPLE — mismos números).
  const buildReviewState = useCallback((): ReviewState => ({
    description: ingredients.map(i => `${i.food.name_es} · ${describirCantidad(i)}`).join(', '),
    items: ingredients.map(i => {
      const p = escalarPerfil(i.food, gramosDe(i));
      return {
        name: i.food.name_es,
        // El editor de revisión trabaja en gramos: la unidad mínima, la misma
        // a la que ya se resolvió la porción que eligió el usuario.
        quantity: gramosDe(i),
        unit: 'g' as const,
        calories: p.kcal ?? 0,
        protein_g: p.protein_g ?? 0,
        carbs_g: p.carbs_g ?? 0,
        fat_g: p.fat_g ?? 0,
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
      const desc = reviewed.description
        || ingredients.map(i => `${i.food.name_es} (${gramosDe(i)} g)`).join(', ')
        || query.trim();

      // El puente con la biblioteca solo aplica cuando la comida ES un
      // alimento de la biblioteca. Con dos o más ingredientes el registro ya
      // no apunta a uno solo, y apuntarlo de todas formas mentiría sobre lo
      // que se comió y ensuciaría los frecuentes.
      const unico = ingredients.length === 1 && ingredients[0].food.slug
        ? ingredients[0]
        : null;
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
        ...(unico ? {
          foodSlug: unico.food.slug,
          quantityGrams: gramosDe(unico),
          portionLabel: unico.cantidad.tipo === 'porcion' ? unico.cantidad.label : null,
        } : {}),
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

  // NOCHE-4: FoodReviewEditor ya migró a tokens — el fondo de esta hoja sigue
  // los tokens del scope en vez de pintar negro fijo.
  if (showReview && ingredients.length > 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo, minHeight: 560 }} edges={['top']}>
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

      {/* La búsqueda vive en la base: mientras viaja, se dice. */}
      {buscando && searchResults.length === 0 && (
        <View style={s.buscandoRow}>
          <ActivityIndicator size="small" color={t.textoSecundario} />
          <EliteText style={[s.resultMeta, { color: t.textoSecundario }]}>Buscando en la biblioteca</EliteText>
        </View>
      )}

      {/* ═══ Resultados de la biblioteca ═══ */}
      {searchResults.length > 0 && (
        <Animated.View entering={FadeInUp.duration(300)} style={[s.resultsContainer, { backgroundColor: t.card, borderColor: t.borde }]}>
          {searchResults.map((food, idx) => {
            const p = porcionDefault(food);
            return (
              <AnimatedPressable
                key={food.slug || `${food.name_es}-${idx}`}
                onPress={() => addIngredient(food)}
                style={[s.resultItem, { borderBottomColor: t.borde }]}
              >
                <View style={[s.categoryDot, { backgroundColor: withOpacity(BLUE, 0.2) }]}>
                  <Ionicons name={iconoDe(food.category)} size={16} color={BLUE} />
                </View>
                <View style={s.resultInfo}>
                  <EliteText style={[s.resultName, { color: t.texto }]}>{food.name_es}</EliteText>
                  {/* Primero la porción con la que se va a registrar: es como
                      el usuario piensa la comida, no en gramos. */}
                  <EliteText style={[s.resultMeta, { color: t.textoSecundario }]}>
                    {`${p.label} · ${nutritionMode === 'complete' ? `${Math.round(food.kcal ?? 0)} kcal · ` : ''}${food.protein_g ?? 0} g de proteína por 100 g`}
                  </EliteText>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={BLUE} />
              </AnimatedPressable>
            );
          })}
        </Animated.View>
      )}

      {/* ═══ Estimar con IA cuando la biblioteca no tiene el alimento ═══ */}
      {!buscando && searchResults.length === 0 && query.trim().length > 2 && (
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
                    //
                    // El alimento estimado tiene la forma de la biblioteca
                    // pero SIN slug: no está en ella y no debe ensuciarla.
                    // Solo trae los cinco macros, así que sus micronutrientes
                    // quedan sin dato (no en cero) y el total los marca como
                    // parciales. Eso es exactamente lo que pasó: no sabemos.
                    const food: FoodItem = {
                      slug: '',
                      name_es: ing.name ?? query.trim(),
                      category: 'otro',
                      region: 'universal',
                      base_unit: 'g',
                      kcal: safeNum(ing.calories, 0),
                      protein_g: safeNum(ing.protein, 0),
                      carbs_g: safeNum(ing.carbs, 0),
                      fat_g: safeNum(ing.fat, 0),
                      fiber_g: safeNum(ing.fiber, 0),
                      is_processed: false,
                      tags: [],
                      portions: [],
                    };
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
              <EliteText style={[s.aiSearchSub, { color: t.textoTenue }]}>{`"${query.trim()}" · calcular macros`}</EliteText>
            </View>
          </AnimatedPressable>
        </Animated.View>
      )}

      {/* ═══ Ingredientes seleccionados ═══ */}
      {ingredients.length > 0 && (
        <Animated.View entering={FadeInUp.duration(300)}>
          <EliteText style={[s.sectionTitle, { color: t.texto }]}>Ingredientes</EliteText>
          {ingredients.map((ing) => {
            const nutrients = escalarPerfil(ing.food, gramosDe(ing));
            return (
              <Animated.View
                key={ing.id}
                entering={FadeInUp.duration(250)}
                style={[s.ingredientCard, { backgroundColor: t.hundido, borderColor: t.borde }]}
              >
                <View style={s.ingredientHeader}>
                  <View style={s.ingredientNameRow}>
                    <Ionicons name={iconoDe(ing.food.category)} size={16} color={BLUE} />
                    <EliteText style={[s.ingredientName, { color: t.texto }]}>{ing.food.name_es}</EliteText>
                  </View>
                  <Pressable onPress={() => removeIngredient(ing.id)} hitSlop={10}>
                    <Ionicons name="close-circle" size={22} color={t.error} />
                  </Pressable>
                </View>

                {/* El selector abre en la porción default del alimento y deja
                    cambiar a gramos, tazas o piezas. */}
                <PortionSelector
                  food={ing.food}
                  cantidad={ing.cantidad}
                  onChange={(c) => updateCantidad(ing.id, c)}
                  acento={acento}
                />

                {/* Mini macros del ingrediente. P1 MB-28A: en SIMPLE el único
                    número es la proteína (doctrina score+proteína). */}
                <View style={[s.ingredientMacros, { marginTop: 10 }]}>
                  {nutritionMode === 'complete' && (
                    <EliteText style={[s.macroMini, { color: t.textoSecundario }]}>{nutrients.kcal ?? 0} kcal</EliteText>
                  )}
                  <EliteText style={[s.macroMini, { color: t.info }]}>P {nutrients.protein_g ?? 0}</EliteText>
                  {nutritionMode === 'complete' && (
                    <>
                      <EliteText style={[s.macroMini, { color: SEMANTIC.warning }]}>C {nutrients.carbs_g ?? 0}</EliteText>
                      <EliteText style={[s.macroMini, { color: t.error }]}>G {nutrients.fat_g ?? 0}</EliteText>
                    </>
                  )}
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
              <MacroBox label="Calorías" value={`${esParcial('kcal') ? '≥ ' : ''}${totals.calories}`} unit="kcal" color={BLUE} />
            )}
            <MacroBox label="Proteína" value={`${esParcial('protein_g') ? '≥ ' : ''}${totals.protein}`} unit="g" color={t.info} />
            {nutritionMode === 'complete' && (
              <>
                <MacroBox label="Carbs" value={`${esParcial('carbs_g') ? '≥ ' : ''}${totals.carbs}`} unit="g" color={SEMANTIC.warning} />
                <MacroBox label="Grasa" value={`${esParcial('fat_g') ? '≥ ' : ''}${totals.fat}`} unit="g" color={t.error} />
                <MacroBox label="Fibra" value={`${esParcial('fiber_g') ? '≥ ' : ''}${totals.fiber}`} unit="g" color={SEMANTIC.success} />
              </>
            )}
          </View>
          {/* La regla de la biblioteca, visible: un dato que falta no es un
              cero. Decirlo aquí evita que el usuario lea un déficit falso. */}
          {(esParcial('kcal') || esParcial('protein_g') || esParcial('carbs_g')
            || esParcial('fat_g') || esParcial('fiber_g')) && (
            <EliteText style={[s.parcialNota, { color: t.textoTenue }]}>
              Los números con ≥ son el mínimo conocido: algún alimento no traía ese dato y no lo contamos como cero.
            </EliteText>
          )}
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
  const t = useSurfaceTokens();
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
  buscandoRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs,
  },
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
  // El input de gramos y su badge salieron con NOCHE-2: la cantidad ahora la
  // maneja PortionSelector, que además dice a cuántos gramos equivale.
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
  parcialNota: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 15,
  },
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
