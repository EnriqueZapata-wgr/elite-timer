/**
 * OLA3 · Sensor FOTO — el cuerpo de food-scan, ya sin carcasa propia.
 *
 * Conserva entero: cámara y galería, shrinkBase64ForAI (la palanca de costo),
 * score ring animado, hambre, ingredientes editables, reanalyzeFood, "guardar
 * sin analizar", el electrón food_photo y saveMealAsRecipe. El sub-modo
 * ETIQUETA (intent=etiqueta) también se queda entero: LABEL_CONTEXT,
 * cleanliness_score y las alertas de aditivos.
 *
 * Lo que salió de aquí: el modo SUPLEMENTO, que se mudó a /supplements como
 * hoja de captura (un solo dueño de user_supplements), y el tipo de comida,
 * que hoy es de la carcasa.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, Pressable, TextInput,
  Image, Alert, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeIn, FadeInUp, SlideInRight,
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withDelay, withSequence,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import { ScoreRing, getTagColor, scoreToColor } from '@/src/components/nutrition/scan-visuals';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import { warn as logWarn } from '@/src/lib/logger';
import {
  analyzeFoodPhoto, analyzeLabelPhoto, uploadFoodPhoto,
  analyzeFoodText, reanalyzeFood,
} from '@/src/services/nutrition-service';
import { saveFoodLog } from '@/src/services/food-log-service';
import { Spacing, Fonts, Radius, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SEMANTIC, ATP_BRAND } from '@/src/constants/brand';
import type { AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { FoodReviewEditor, parseAIToReview, type ReviewState } from '@/src/components/nutrition/FoodReviewEditor';
import { updateFrequentFood } from '@/src/services/frequent-foods-service';
import { saveMealAsRecipe, logItemsToIngredients } from '@/src/services/recipe-save-service';
import { maybeGeneratePostMealInsight } from '@/src/services/argos-nutrition-insights';
import { useNutritionMode } from '@/src/hooks/useNutritionMode';
import { useAuth } from '@/src/contexts/auth-context';
import { fireElectronAward } from '@/src/services/economy/electron-award-client';
import { getLocalToday } from '@/src/utils/date-helpers';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import type { SensorPanelProps } from './types';

// E-7 (MB-12): resize antes de mandar a la IA — la palanca de costo
// documentada sin aplicar (el base64 iba a resolución completa de cámara).
// Módulo nativo lazy (gotcha ExpoPrint): en binarios sin él, fallback al
// base64 del picker tal cual.
let ImageManipulator: any = null;
try { ImageManipulator = require('expo-image-manipulator'); } catch { /* */ }

async function shrinkBase64ForAI(uri: string, fallback: string | null): Promise<string | null> {
  if (!ImageManipulator?.manipulateAsync) return fallback;
  try {
    const m = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    return m?.base64 ?? fallback;
  } catch {
    return fallback;
  }
}

type Step = 'capture' | 'preview' | 'analyzing' | 'result';

const BLUE = CATEGORY_COLORS.nutrition;
const HUNGER_OPTIONS = [
  { key: 'hungry', emoji: '\u{1F60B}', label: 'Con hambre', value: 8 },
  { key: 'normal', emoji: '\u{1F610}', label: 'Normal', value: 5 },
  // E.3 (MB-8): antes 🤢 (nauseado) — no significa "sin hambre".
  { key: 'not_hungry', emoji: '\u{1F636}', label: 'Sin hambre', value: 2 },
  { key: 'craving', emoji: '\u{1F630}', label: 'Antojo', value: 7 },
];

const LABEL_CONTEXT = [
  { key: 'exercise', emoji: '\u{1F3C3}', label: 'Ejercicio/deporte' },
  { key: 'cooking', emoji: '\u{1F373}', label: 'Cocinar' },
  { key: 'daily_drink', emoji: '\u{1F964}', label: 'Bebida diaria' },
  { key: 'snack', emoji: '\u{1F36B}', label: 'Snack' },
  { key: 'kids', emoji: '\u{1F476}', label: 'Para niños' },
  { key: 'health', emoji: '\u{1F48A}', label: 'Salud específica' },
  { key: 'curiosity', emoji: '\u{1F937}', label: 'Solo curiosidad' },
];

function MacroPill({ label, value, unit, color, delay: d }: {
  label: string; value: string; unit: string; color: string; delay: number;
}) {
  // Componente compartido → useSurfaceTokens (oscuro fuera de <ThemeReady>).
  const t = useSurfaceTokens();
  const st = useMemo(() => makeSt(t), [t]);
  return (
    <Animated.View entering={FadeInUp.delay(d).springify().damping(16)} style={st.macroPill}>
      <EliteText style={{ fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, color, includeFontPadding: false }}>
        {value}
      </EliteText>
      <EliteText variant="caption" style={{ color: t.textoTenue, fontSize: FontSizes.xs, marginTop: -2 }}>
        {unit}
      </EliteText>
      <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: FontSizes.xs, marginTop: 2 }}>
        {label}
      </EliteText>
    </Animated.View>
  );
}

function GlassButton({ onPress, children, style }: {
  onPress: () => void; children: React.ReactNode; style?: any;
}) {
  // st no lleva color aquí, pero sale de makeSt(t) igual que en el resto.
  const t = useSurfaceTokens();
  const st = useMemo(() => makeSt(t), [t]);
  return (
    <AnimatedPressable onPress={onPress} style={[st.glassBtn, style]} scaleDown={0.95}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30,30,30,0.85)' }]} />
      )}
      <View style={st.glassBtnInner}>{children}</View>
    </AnimatedPressable>
  );
}

function LoadingDots({ color }: { color: string }) {
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);

  useEffect(() => {
    const bounce = (delay: number) => withRepeat(
      withDelay(delay, withSequence(
        withTiming(-6, { duration: 300, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
      )), -1,
    );
    d1.value = bounce(0);
    d2.value = bounce(150);
    d3.value = bounce(300);
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: d1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: d2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: d3.value }] }));

  const dot = { width: 6, height: 6, borderRadius: 3, backgroundColor: color };
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: Spacing.md }}>
      <Animated.View style={[dot, s1]} />
      <Animated.View style={[dot, s2]} />
      <Animated.View style={[dot, s3]} />
    </View>
  );
}

export function PhotoSensor({ mealType, mealTime, intent, onTakeover, onSaved, porGesto }: SensorPanelProps) {
  const { user } = useAuth();
  const analytics = useAnalytics();
  // NOCHE-4: componente compartido → useSurfaceTokens; st sale de makeSt(t)
  // porque el StyleSheet estático (fuera del componente) no puede leer tokens.
  const t = useSurfaceTokens();
  const kind = t.kind;
  const st = useMemo(() => makeSt(t), [t]);
  const esEtiqueta = intent === 'etiqueta';
  const accent = esEtiqueta ? SEMANTIC.warning : BLUE;
  const titulo = esEtiqueta ? 'Escanear Etiqueta' : 'Escanear Comida';
  // Track C (MB-8): en modo SIMPLE el guardado es "describir y listo";
  // el editor granular (gramajes, unidades, macros) es opt-in.
  const { mode: nutritionMode } = useNutritionMode();

  const [step, setStep] = useState<Step>('capture');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [hungerKey, setHungerKey] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [useCtx, setUseCtx] = useState<string | null>(null);

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showReview, setShowReview] = useState(false);
  // P2 (MB-28B): lo que acabas de registrar se puede guardar como receta.
  const [lastReview, setLastReview] = useState<ReviewState | null>(null);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [recipeSaved, setRecipeSaved] = useState(false);

  // Estados del modo comida editable
  const [textInput, setTextInput] = useState('');
  const [inputType, setInputType] = useState<'photo' | 'text'>('photo');
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [editedTotals, setEditedTotals] = useState<any>(null);
  const [wasEdited, setWasEdited] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [addingIngredient, setAddingIngredient] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');

  // Analyzing — anillo rotatorio
  const analyzeRotation = useSharedValue(0);
  const analyzeGlow = useSharedValue(0.3);
  const analyzeRotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${analyzeRotation.value}deg` }],
  }));

  useEffect(() => {
    if (step === 'analyzing') {
      analyzeRotation.value = withRepeat(
        withTiming(360, { duration: 2200, easing: Easing.linear }), -1,
      );
      analyzeGlow.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 1200 }), withTiming(0.3, { duration: 1200 })), -1,
      );
    }
  }, [step]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: analyzeGlow.value }));

  // La carcasa esconde su chrome mientras el sensor toma la pantalla.
  useEffect(() => {
    onTakeover(step !== 'capture' || showReview);
  }, [step, showReview, onTakeover]);

  // La cámara se abre por un GESTO, nunca por montar la pantalla.
  //
  // Tocar el chip Foto sí es pedir la cámara, y ese atajo se conserva. Lo que
  // se corta es el otro camino: llegar por deep link (/food-scan) o que un
  // barrido de rutas monte la pantalla abría la cámara del sistema sin que
  // nadie la pidiera. Aquí siempre queda el paso de captura con su obturador
  // y su botón de galería, así que sin el atajo no se pierde ninguna función:
  // solo se agrega un toque para quien no vino tocando el chip.
  useEffect(() => {
    if (porGesto) openCamera();
    // Solo al montar: cambiar de sensor desmonta y vuelve a montar el panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === CÁMARA / GALERÍA ===

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu cámara para escanear.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
    if (!res.canceled && res.assets[0]) {
      haptic.light();
      setPhotoUri(res.assets[0].uri);
      // E-7 (MB-12): resize a 1024px antes de enviar a la IA.
      setPhotoBase64(await shrinkBase64ForAI(res.assets[0].uri, res.assets[0].base64 ?? null));
      setInputType('photo');
      setStep('preview');
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6, base64: true, mediaTypes: ['images'],
    });
    if (!res.canceled && res.assets[0]) {
      haptic.light();
      setPhotoUri(res.assets[0].uri);
      setPhotoBase64(await shrinkBase64ForAI(res.assets[0].uri, res.assets[0].base64 ?? null));
      setInputType('photo');
      setStep('preview');
    }
  };

  // === ANÁLISIS ===

  const handleAnalyze = async () => {
    if (!esEtiqueta && inputType === 'text' && !textInput.trim()) return;
    if (esEtiqueta && !photoBase64) return;
    if (!esEtiqueta && inputType === 'photo' && !photoBase64) return;

    haptic.medium();
    setStep('analyzing');
    setError(null);
    try {
      let analysis: any;
      if (!esEtiqueta) {
        const hunger = hungerKey ? HUNGER_OPTIONS.find(h => h.key === hungerKey)?.label : undefined;
        if (inputType === 'text') {
          // Análisis por texto — sin foto
          const fullText = [textInput, hunger ? `Estado: ${hunger}` : ''].filter(Boolean).join('. ');
          analysis = await analyzeFoodText(fullText);
        } else {
          const desc = [description, hunger ? `Estado: ${hunger}` : ''].filter(Boolean).join('. ');
          analysis = await analyzeFoodPhoto(photoBase64!, desc || undefined);
        }
        // Poblar ingredientes y totales editables
        setIngredients(analysis.ingredients || []);
        setEditedTotals(analysis.totals || null);
      } else {
        const ctxLabel = useCtx ? LABEL_CONTEXT.find(c => c.key === useCtx)?.label : undefined;
        analysis = await analyzeLabelPhoto(photoBase64!, productName || undefined, ctxLabel);
      }
      haptic.success();
      setResult(analysis);
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Error al analizar');
      setStep('preview');
    }
  };

  // === GUARDAR ===

  // P2 (MB-28B): la mitad que faltaba de la promesa de Recetas — guardar la
  // comida recién registrada como receta reutilizable (dedupe por nombre en
  // el servicio; comer lo mismo tres veces no crea tres recetas).
  const handleSaveAsRecipe = async () => {
    if (!user?.id || !lastReview || savingRecipe || recipeSaved) return;
    setSavingRecipe(true);
    const res = await saveMealAsRecipe(user.id, {
      name: lastReview.description || getTitle(),
      calories: lastReview.totals.calories,
      proteinG: lastReview.totals.protein_g,
      carbsG: lastReview.totals.carbs_g,
      fatG: lastReview.totals.fat_g,
      mealType,
      ingredients: logItemsToIngredients(lastReview.items),
    });
    setSavingRecipe(false);
    if (res.status === 'created') {
      haptic.success();
      setRecipeSaved(true);
    } else if (res.status === 'duplicate') {
      setRecipeSaved(true);
      Alert.alert('Ya la tienes', `"${res.existingName}" ya está en tus recetas: no se creó un duplicado.`);
    } else {
      Alert.alert('No se pudo guardar', 'Revisa tu conexión e intenta de nuevo.');
    }
  };

  const handleSaveFood = () => {
    if (!result) return;
    // Track C (MB-8): SIMPLE guarda la estimación tal cual (nunca se bloquea
    // por un campo faltante); ajustar fino queda a un toque de distancia.
    if (nutritionMode === 'simple') {
      void handleConfirmSave(parseAIToReview(result));
      return;
    }
    setShowReview(true);
  };

  const handleConfirmSave = async (reviewed: ReviewState) => {
    setShowReview(false);
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photoBase64) {
        try { photoUrl = await uploadFoodPhoto(photoBase64); } catch { /* opcional */ }
      }
      const hungerVal = hungerKey ? HUNGER_OPTIONS.find(h => h.key === hungerKey)?.value : undefined;
      const desc = reviewed.description || result.food_identified || description || textInput || 'Sin descripción';
      // Track A (MB-8): guardado unificado — source/was_edited a columnas reales.
      const saveRes = await saveFoodLog({
        userId: user?.id,
        mealType,
        description: desc,
        photoUrl,
        mealTime,
        hungerLevel: hungerVal,
        source: inputType === 'text' ? 'scan_text' : 'scan_photo',
        wasEdited: true,
        aiAnalysis: {
          ...result,
          ingredients: reviewed.items,
          totals: reviewed.totals,
          input_type: inputType,
          was_edited: true,
        },
        calories: reviewed.totals.calories,
        proteinG: reviewed.totals.protein_g,
        carbsG: reviewed.totals.carbs_g,
        fatG: reviewed.totals.fat_g,
      });
      if (!saveRes.ok) throw new Error(saveRes.message);
      // Actualizar frecuentes (background)
      if (user?.id) {
        updateFrequentFood(user.id, mealType, {
          description: reviewed.description,
          calories: reviewed.totals.calories,
          protein_g: reviewed.totals.protein_g,
          carbs_g: reviewed.totals.carbs_g,
          fat_g: reviewed.totals.fat_g,
          items: reviewed.items,
        });
      }

      // E-7 (MB-12): el incentivo estaba INVERTIDO — quien hacía el flujo
      // completo con IA sacaba 0 e- y quien lo saltaba sacaba 8. El premio va
      // en ambos caminos (con foto; mismo cap server-side 4/día).
      if (user?.id && photoUrl) {
        fireElectronAward({
          habit_type: 'food_photo', evidence_tier: 'evidence', local_date: getLocalToday(),
          idempotency_key: `food_photo_${user.id}_${getLocalToday()}_${mealTime}`,
          metadata: { meal_type: mealType },
        });
      }
      // 'day_changed' lo emite saveFoodLog (regla #6).
      analytics.track(ATP_EVENTS.FOOD_LOGGED, { source: 'scan_reviewed', meal_type: mealType, has_photo: !!photoUrl });
      if (user?.id) void maybeGeneratePostMealInsight(user.id, desc);
      haptic.success();
      setLastReview(reviewed);
      setSaved(true);
      onSaved();
    } catch (err: any) {
      // MB-SEC-1 §6: detalle al log, copy genérico a pantalla (err.message de
      // Postgres/Storage puede filtrar tabla/columna/constraint).
      logWarn('[food-log:foto] no se pudo guardar:', err?.message);
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    }
    setSaving(false);
  };

  const handleSaveWithout = async () => {
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photoBase64) {
        try { photoUrl = await uploadFoodPhoto(photoBase64); } catch { /* */ }
      }
      const hungerVal = hungerKey ? HUNGER_OPTIONS.find(h => h.key === hungerKey)?.value : undefined;
      const desc = description || textInput || 'Sin descripción';
      const saveRes = await saveFoodLog({
        userId: user?.id,
        mealType, description: desc,
        photoUrl, mealTime, hungerLevel: hungerVal,
        source: 'scan_raw',
      });
      if (!saveRes.ok) throw new Error(saveRes.message);
      // Economía (fire-and-forget; no-op si flag OFF). Solo comida CON FOTO.
      if (user?.id && photoUrl) {
        fireElectronAward({
          habit_type: 'food_photo', evidence_tier: 'evidence', local_date: getLocalToday(),
          idempotency_key: `food_photo_${user.id}_${getLocalToday()}_${mealTime}`,
          metadata: { meal_type: mealType },
        });
      }
      // 'day_changed' lo emite saveFoodLog (regla #6).
      analytics.track(ATP_EVENTS.FOOD_LOGGED, { source: 'scan_raw', meal_type: mealType, has_photo: !!photoUrl });
      if (user?.id) void maybeGeneratePostMealInsight(user.id, desc);
      haptic.light();
      onSaved();
      resetAndScan();
    } catch (err: any) {
      logWarn('[food-log:foto] no se pudo guardar:', err?.message);
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    }
    setSaving(false);
  };

  // === HANDLERS INGREDIENTES EDITABLES ===

  const removeIngredient = (idx: number) => {
    haptic.light();
    const updated = ingredients.filter((_, i) => i !== idx);
    setIngredients(updated);
    setEditedTotals(recalcTotals(updated));
    setWasEdited(true);
  };

  const handleAddIngredient = () => {
    if (!newIngredientName.trim()) return;
    haptic.light();
    setIngredients(prev => [...prev, {
      name: newIngredientName.trim(),
      portion: '~1 porción',
      calories: 0, protein: 0, carbs: 0, fat: 0,
    }]);
    setNewIngredientName('');
    setAddingIngredient(false);
    setWasEdited(true);
  };

  function recalcTotals(ings: any[]) {
    return {
      calories: ings.reduce((s, i) => s + (i.calories || 0), 0),
      protein: ings.reduce((s, i) => s + (i.protein || 0), 0),
      carbs: ings.reduce((s, i) => s + (i.carbs || 0), 0),
      fat: ings.reduce((s, i) => s + (i.fat || 0), 0),
      fiber: ings.reduce((s, i) => s + (i.fiber || 0), 0),
    };
  }

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const newResult = await reanalyzeFood(ingredients, mealType);
      setResult(newResult);
      setIngredients(newResult.ingredients || []);
      setEditedTotals(newResult.totals || null);
      setWasEdited(false);
      haptic.success();
    } catch (e) {
      logWarn('[food-log:foto] recalculate failed', e);
      haptic.error();
      Alert.alert('No se pudo recalcular', 'Inténtalo de nuevo en un momento.');
    }
    setRecalculating(false);
  };

  // === HELPERS ===

  const getScore = (): number =>
    esEtiqueta ? result?.cleanliness_score ?? 0 : result?.score ?? 0;

  const getScoreLabel = (): string => {
    const s = getScore();
    if (esEtiqueta) return s >= 90 ? 'Producto limpio' : s >= 70 ? 'Aceptable' : s >= 50 ? 'Procesado' : s >= 30 ? 'Ultra-procesado' : 'Evitar';
    return s >= 90 ? 'Excelente' : s >= 70 ? 'Buena elección' : s >= 50 ? 'Aceptable' : s >= 30 ? 'Podría mejorar' : 'Fuera del plan';
  };

  const getTitle = (): string =>
    esEtiqueta ? result?.product_name ?? 'Producto' : result?.food_identified ?? 'Comida';

  const resetAndScan = () => {
    setResult(null); setPhotoUri(null); setPhotoBase64(null);
    setSaved(false); setDescription(''); setProductName(''); setUseCtx(null);
    setLastReview(null); setSavingRecipe(false); setRecipeSaved(false);
    setHungerKey(null); setStep('capture');
    setTextInput(''); setInputType('photo'); setIngredients([]);
    setEditedTotals(null); setWasEdited(false);
    setAddingIngredient(false); setNewIngredientName('');
    setTimeout(openCamera, 150);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    haptic.light();
    setInputType('text');
    setStep('preview');
  };

  // ═══ REVIEW EDITOR (antes de guardar) ═══

  if (showReview && result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.fondo, minHeight: 560 }}>
        <FoodReviewEditor
          initialState={parseAIToReview(result)}
          onSave={handleConfirmSave}
          onCancel={() => setShowReview(false)}
        />
      </SafeAreaView>
    );
  }

  // ═══ CAPTURE ═══

  if (step === 'capture') {
    return (
      <View style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
        <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
          <View style={[st.captureRing, { borderColor: accent + '18' }]}>
            <View style={[st.captureRingInner, { borderColor: accent + '35' }]}>
              <Ionicons name={esEtiqueta ? 'pricetag-outline' : 'camera-outline'} size={36} color={accent} />
            </View>
          </View>
          <EliteText style={{ fontSize: FontSizes.xl, fontFamily: Fonts.bold, color: t.texto, marginTop: Spacing.md }}>
            {titulo}
          </EliteText>
          <EliteText variant="caption" style={{ color: t.textoTenue, marginTop: 4, fontSize: FontSizes.md }}>
            {esEtiqueta ? 'Toma una foto para analizar con IA' : 'Foto o describe lo que comiste'}
          </EliteText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify().damping(18)}
          style={{ marginTop: Spacing.lg, alignItems: 'center', width: '100%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
            <Pressable onPress={openGallery} hitSlop={10}
              style={{
                width: 44, height: 44, borderRadius: Radius.lg, backgroundColor: t.card,
                borderWidth: 1, borderColor: t.borde, alignItems: 'center', justifyContent: 'center',
              }}>
              <Ionicons name="images-outline" size={20} color={t.textoSecundario} />
            </Pressable>

            <AnimatedPressable onPress={openCamera} scaleDown={0.92} style={[st.shutterOuter, { borderColor: accent }]}>
              <View style={[st.shutterInner, { backgroundColor: accent }]}>
                <Ionicons name="camera" size={28} color={t.textoSobreLima} />
              </View>
            </AnimatedPressable>

            {/* Spacer para centrar el shutter */}
            <View style={{ width: 44 }} />
          </View>

          {esEtiqueta && (
            <View style={st.captureSecRow}>
              <GlassButton onPress={openGallery}>
                <Ionicons name="images-outline" size={18} color={t.texto} />
                <EliteText style={{ color: t.texto, fontSize: FontSizes.md, fontFamily: Fonts.semiBold }}>
                  Galería
                </EliteText>
              </GlassButton>
            </View>
          )}
        </Animated.View>

        {/* Barra de texto tipo chat — el sensor foto también acepta describir */}
        {!esEtiqueta && (
          <Animated.View entering={FadeInDown.delay(350).springify().damping(18)}
            style={{ width: '100%', marginTop: Spacing.lg }}>
            <View style={st.textBarWrap}>
              <TextInput
                style={st.textBarInput}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Describe lo que comiste..."
                placeholderTextColor={t.textoTenue}
                returnKeyType="send"
                onSubmitEditing={handleTextSubmit}
                multiline={false}
              />
              <AnimatedPressable
                onPress={handleTextSubmit}
                scaleDown={0.9}
                style={[st.textBarSend, { backgroundColor: textInput.trim() ? accent : t.flotante }]}>
                <Ionicons name="arrow-up" size={18} color={textInput.trim() ? t.textoSobreLima : t.textoTenue} />
              </AnimatedPressable>
            </View>
          </Animated.View>
        )}
      </View>
    );
  }

  // ═══ PREVIEW ═══

  if (step === 'preview') return (
    <View style={{ paddingTop: Spacing.sm }}>
      {/* Foto o burbuja de texto */}
      {!esEtiqueta && inputType === 'text' ? (
        <Animated.View entering={FadeIn.duration(400).springify()}>
          <View style={st.textBubble}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={accent} style={{ marginRight: 8 }} />
            <EliteText style={{ color: t.texto, fontSize: FontSizes.lg, flex: 1, lineHeight: 22 }}>
              {textInput}
            </EliteText>
          </View>
        </Animated.View>
      ) : photoUri ? (
        <Animated.View entering={FadeIn.duration(400).springify()}>
          <View style={st.photoWrap}>
            <Image source={{ uri: photoUri }} style={st.photo} resizeMode="cover" />
            {/* Controles glass sobre la foto */}
            <View style={st.photoControls}>
              <Pressable onPress={openGallery} style={st.photoCtrlBtn}>
                <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                <Ionicons name="images-outline" size={16} color="#fff" />
              </Pressable>
              <Pressable onPress={openCamera} style={st.photoCtrlBtn}>
                <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
                <Ionicons name="camera-reverse-outline" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable onPress={openCamera} style={st.noPhoto}>
            <Ionicons name="camera-outline" size={36} color={t.textoTenue} />
            <EliteText variant="caption" style={{ color: t.textoTenue, marginTop: 4 }}>
              Toca para tomar foto
            </EliteText>
          </Pressable>
        </Animated.View>
      )}

      {/* Contexto */}
      <Animated.View entering={FadeInDown.delay(150).springify().damping(18)}>
        {!esEtiqueta ? (
          <View style={{ marginTop: Spacing.lg }}>
            {/* Descripción extra (opcional) */}
            <TextInput
              style={st.input}
              value={description}
              onChangeText={setDescription}
              placeholder={inputType === 'photo' ? '¿Qué es? (la IA identifica sola)' : '¿Algo más? (contexto adicional)'}
              placeholderTextColor={t.textoTenue}
              returnKeyType="done"
            />

            {/* Hambre */}
            <EliteText variant="caption" style={[st.sectionLabel, { marginTop: Spacing.lg }]}>
              ¿Cómo te sientes?
            </EliteText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {HUNGER_OPTIONS.map(h => {
                const active = hungerKey === h.key;
                return (
                  <AnimatedPressable key={h.key} scaleDown={0.92}
                    onPress={() => { haptic.light(); setHungerKey(active ? null : h.key); }}
                    style={[st.hungerCard, active && { backgroundColor: accent + '12', borderColor: accent + '40' }]}>
                    <EliteText style={{ fontSize: FontSizes.xxl }}>{h.emoji}</EliteText>
                    <EliteText variant="caption" style={{
                      fontSize: FontSizes.xs, marginTop: 3,
                      color: active ? accent : t.textoTenue,
                      fontFamily: active ? Fonts.bold : Fonts.regular,
                    }}>
                      {h.label}
                    </EliteText>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={{ marginTop: Spacing.lg }}>
            <EliteText variant="caption" style={st.sectionLabel}>Nombre del producto</EliteText>
            <TextInput
              style={st.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="Ej: Yogurt Griego Lala"
              placeholderTextColor={t.textoTenue}
              returnKeyType="done"
            />

            {/* Contexto de uso */}
            <EliteText variant="caption" style={[st.sectionLabel, { marginTop: Spacing.lg }]}>
              ¿Para qué lo usas?
            </EliteText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LABEL_CONTEXT.map(c => {
                const active = useCtx === c.key;
                return (
                  <AnimatedPressable key={c.key} scaleDown={0.94}
                    onPress={() => { haptic.light(); setUseCtx(active ? null : c.key); }}
                    style={[st.mealChip, active && { backgroundColor: accent + '18', borderColor: accent + '50' }]}>
                    <EliteText style={{ fontSize: FontSizes.md }}>{c.emoji}</EliteText>
                    <EliteText style={{
                      fontSize: FontSizes.sm, fontFamily: active ? Fonts.bold : Fonts.regular,
                      color: active ? accent : t.textoSecundario,
                    }}>
                      {c.label}
                    </EliteText>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        )}
      </Animated.View>

      {/* Error */}
      {error && (
        <Animated.View entering={FadeInDown.springify()}>
          <View style={st.errorCard}>
            <Ionicons name="alert-circle" size={18} color={SEMANTIC.error} />
            <EliteText style={{ color: SEMANTIC.error, fontSize: FontSizes.md, flex: 1 }}>{error}</EliteText>
          </View>
        </Animated.View>
      )}

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(300).springify().damping(18)}>
        <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
          {(() => {
            // E.1 (MB-8): disabled explícito (fill recedido + texto muted),
            // no un botón brillante "con algo encima".
            const canAnalyze = esEtiqueta
              ? !!photoBase64
              : (inputType === 'text' ? !!textInput.trim() : !!photoBase64);
            return (
              <AnimatedPressable
                onPress={handleAnalyze}
                disabled={!canAnalyze}
                scaleDown={0.96}
                style={[st.ctaBtn, { backgroundColor: canAnalyze ? accent : t.flotante }]}>
                <Ionicons name="sparkles" size={20} color={canAnalyze ? t.textoSobreLima : t.textoTenue} />
                <EliteText style={{ color: canAnalyze ? t.textoSobreLima : t.textoTenue, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                  Analizar con IA
                </EliteText>
              </AnimatedPressable>
            );
          })()}

          {!esEtiqueta && (
            <Pressable onPress={handleSaveWithout} disabled={saving}
              style={{ alignSelf: 'center', paddingVertical: Spacing.sm }}>
              <EliteText style={{ color: t.textoTenue, fontSize: FontSizes.md }}>
                {saving ? 'Guardando...' : 'Guardar sin analizar'}
              </EliteText>
            </Pressable>
          )}

          <Pressable onPress={resetAndScan} style={{ alignSelf: 'center', paddingVertical: Spacing.sm }}>
            <EliteText style={{ color: t.textoTenue, fontSize: FontSizes.md }}>Empezar de nuevo</EliteText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );

  // ═══ ANALYZING — Cinematográfico ═══

  if (step === 'analyzing') {
    const ringSize = 120;
    const aSw = 3;
    const aR = (ringSize - aSw) / 2;
    const aC = 2 * Math.PI * aR;

    return (
      <View style={st.analyzingCenter}>
        {photoUri && (
          <Image source={{ uri: photoUri }}
            style={[StyleSheet.absoluteFill, { opacity: 0.08 }]}
            resizeMode="cover" blurRadius={30} />
        )}

        <Animated.View style={[st.analyzingGlow, glowStyle, { backgroundColor: accent }]} />

        <Animated.View style={analyzeRotStyle}>
          <Svg width={ringSize} height={ringSize}>
            <Circle cx={ringSize / 2} cy={ringSize / 2} r={aR}
              stroke={accent + '15'} strokeWidth={aSw} fill="transparent" />
            <Circle cx={ringSize / 2} cy={ringSize / 2} r={aR}
              stroke={accent} strokeWidth={aSw} fill="transparent"
              strokeDasharray={`${aC * 0.3} ${aC * 0.7}`}
              strokeLinecap="round" />
          </Svg>
        </Animated.View>

        <View style={{ position: 'absolute' }}>
          <Ionicons name="sparkles" size={32} color={accent} />
        </View>

        <EliteText style={{ color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.xxl, marginTop: Spacing.xl }}>
          Analizando
        </EliteText>
        <EliteText variant="caption" style={{ color: t.textoTenue, marginTop: 6, fontSize: FontSizes.md, textAlign: 'center' }}>
          {esEtiqueta ? 'Leyendo ingredientes y aditivos' : 'Identificando comida y nutrientes'}
        </EliteText>
        <LoadingDots color={accent} />
      </View>
    );
  }

  // ═══ RESULT ═══

  if (!result) return null;
  const sc = getScore();
  const scColor = scoreToColor(sc);
  const displayTotals = editedTotals || result.totals;

  return (
    <View style={{ paddingTop: Spacing.sm }}>
      {/* Score hero */}
      <Animated.View entering={FadeIn.delay(100).duration(600)} style={{ alignItems: 'center' }}>
        <ScoreRing score={sc} />
        <EliteText style={{ color: scColor, fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, marginTop: Spacing.sm }}>
          {getScoreLabel()}
        </EliteText>
        <EliteText style={{
          color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.xxl,
          textAlign: 'center', marginTop: Spacing.xs,
        }}>
          {getTitle()}
        </EliteText>
      </Animated.View>

      {/* COMIDA: Ingredientes editables + Macros */}
      {!esEtiqueta && (
        <>
          <Animated.View entering={FadeInDown.delay(400).springify().damping(18)}>
            <View style={[st.card, { marginTop: Spacing.lg }]}>
              <EliteText variant="caption" style={st.sectionLabel}>Ingredientes detectados</EliteText>
              {ingredients.map((ing, idx) => (
                <View key={idx} style={st.foodIngredientRow}>
                  <View style={{ flex: 1 }}>
                    <EliteText style={{ color: t.texto, fontSize: FontSizes.md }}>{ing.name}</EliteText>
                    <EliteText variant="caption" style={{ color: t.textoTenue, fontSize: FontSizes.sm }}>{ing.portion}</EliteText>
                  </View>
                  <EliteText variant="caption" style={{ color: BLUE, fontSize: FontSizes.sm }}>
                    {ing.calories}cal · {ing.protein}p
                  </EliteText>
                  <Pressable onPress={() => removeIngredient(idx)} hitSlop={8}>
                    <Ionicons name="close-circle-outline" size={18} color={t.textoTenue} />
                  </Pressable>
                </View>
              ))}

              {addingIngredient ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <TextInput
                    style={[st.input, { flex: 1, marginTop: 0 }]}
                    value={newIngredientName}
                    onChangeText={setNewIngredientName}
                    placeholder="¿Qué más?"
                    placeholderTextColor={t.textoTenue}
                    returnKeyType="done"
                    onSubmitEditing={handleAddIngredient}
                  />
                  <Pressable onPress={handleAddIngredient}>
                    <Ionicons name="checkmark-circle" size={28} color={BLUE} />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setAddingIngredient(true)} style={{ marginTop: 8 }}>
                  <EliteText style={{ color: BLUE, fontSize: FontSizes.md }}>+ Agregar ingrediente</EliteText>
                </Pressable>
              )}
            </View>
          </Animated.View>

          <View style={st.macrosRow}>
            <MacroPill label="Calorías" value={`${displayTotals?.calories ?? result.estimated_calories ?? '—'}`} unit="kcal" color={t.texto} delay={500} />
            <MacroPill label="Proteína" value={`${displayTotals?.protein ?? result.estimated_protein ?? '—'}`} unit="g" color={BLUE} delay={600} />
            <MacroPill label="Carbos" value={`${displayTotals?.carbs ?? result.estimated_carbs ?? '—'}`} unit="g" color={SEMANTIC.acceptable} delay={700} />
            <MacroPill label="Grasa" value={`${displayTotals?.fat ?? result.estimated_fat ?? '—'}`} unit="g" color={SEMANTIC.warning} delay={800} />
          </View>
          <EliteText variant="caption" style={{ color: t.textoTenue, fontSize: FontSizes.sm, textAlign: 'center', marginTop: 4 }}>
            Estimados por ARGOS
          </EliteText>

          {result.good_points?.length > 0 && (
            <Animated.View entering={FadeInDown.delay(850).springify()}>
              <View style={{ marginTop: Spacing.md }}>
                {result.good_points.map((p: string, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="checkmark-circle" size={14} color={kind === 'dark' ? ATP_BRAND.lime : t.tealTexto} />
                    <EliteText style={{ color: t.textoSecundario, fontSize: FontSizes.md }}>{p}</EliteText>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {result.improve_points?.length > 0 && (
            <Animated.View entering={FadeInDown.delay(900).springify()}>
              <View style={{ marginTop: Spacing.xs }}>
                {result.improve_points.map((p: string, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="arrow-up-circle" size={14} color={SEMANTIC.warning} />
                    <EliteText style={{ color: t.textoSecundario, fontSize: FontSizes.md }}>{p}</EliteText>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </>
      )}

      {/* ETIQUETA: Stats + alertas de aditivos */}
      {esEtiqueta && (
        <>
          <View style={st.macrosRow}>
            <MacroPill label="Ingredientes" value={`${result.ingredients_count ?? '—'}`} unit="" color={accent} delay={400} />
            <MacroPill label="Naturales" value={`${result.natural_ingredients ?? '—'}`} unit="" color={kind === 'dark' ? ATP_BRAND.lime : t.tealTexto} delay={500} />
            <MacroPill label="Aditivos" value={`${result.additives?.length ?? 0}`} unit="" color={SEMANTIC.error} delay={600} />
            <MacroPill label="Azúcar" value={`${result.sugar_g ?? '—'}`} unit="g" color={SEMANTIC.warning} delay={700} />
          </View>
          {result.additive_alerts?.length > 0 && (
            <Animated.View entering={FadeInDown.delay(750).springify().damping(18)}>
              <EliteText variant="caption" style={[st.sectionLabel, { color: SEMANTIC.error, marginTop: Spacing.lg }]}>
                Aditivos detectados
              </EliteText>
              {result.additive_alerts.map((a: any, i: number) => (
                <Animated.View key={i} entering={SlideInRight.delay(800 + i * 80).springify().damping(18)}>
                  <View style={st.additiveRow}>
                    <View style={{ flex: 1 }}>
                      <EliteText style={{ color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }}>
                        {a.code ? `${a.code} ` : ''}{a.name}
                      </EliteText>
                      {a.explanation && (
                        <EliteText variant="caption" style={{ color: t.textoTenue, fontSize: FontSizes.sm, marginTop: 2 }}>
                          {a.explanation}
                        </EliteText>
                      )}
                    </View>
                    <View style={[st.riskBadge, {
                      backgroundColor: (a.risk === 'alto' ? SEMANTIC.error : a.risk === 'medio' ? SEMANTIC.warning : ATP_BRAND.lime) + '18',
                    }]}>
                      <EliteText variant="caption" style={{
                        color: a.risk === 'alto' ? SEMANTIC.error : a.risk === 'medio' ? SEMANTIC.warning : (kind === 'dark' ? ATP_BRAND.lime : t.tealTexto),
                        fontSize: FontSizes.xs, fontFamily: Fonts.bold,
                      }}>
                        {(a.risk ?? 'bajo').toUpperCase()}
                      </EliteText>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </Animated.View>
          )}
        </>
      )}

      {/* Feedback */}
      {result.feedback && (
        <Animated.View entering={FadeInDown.delay(esEtiqueta ? 900 : 950).springify().damping(18)}>
          <View style={[st.card, { borderLeftColor: accent, borderLeftWidth: 3, marginTop: Spacing.lg }]}>
            <EliteText style={{ color: t.texto, fontSize: FontSizes.lg, lineHeight: 22 }}>
              {result.feedback}
            </EliteText>
          </View>
        </Animated.View>
      )}

      {/* Red flags */}
      {result.red_flags?.length > 0 && (
        <Animated.View entering={FadeInDown.delay(1000).springify()}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md }}>
            {result.red_flags.map((f: string, i: number) => (
              <View key={i} style={st.flagChip}>
                <EliteText style={{ color: SEMANTIC.error, fontSize: FontSizes.sm }}>
                  {'⚠️'} {f}
                </EliteText>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Sugerencia */}
      {(result.suggestions || result.better_alternative) && (
        <Animated.View entering={FadeInDown.delay(1050).springify()}>
          <View style={st.tipCard}>
            <Ionicons name="bulb-outline" size={18} color={kind === 'dark' ? ATP_BRAND.teal2 : t.tealTexto} />
            <EliteText style={{ color: t.textoSecundario, fontSize: FontSizes.md, flex: 1, lineHeight: 20 }}>
              {result.suggestions || result.better_alternative}
            </EliteText>
          </View>
        </Animated.View>
      )}

      {/* Tags — semaforizados */}
      {result.tags?.length > 0 && (
        <Animated.View entering={FadeInDown.delay(1150).springify()}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md }}>
            {result.tags.map((tag: string, i: number) => {
              const tc = getTagColor(tag);
              return (
                <View key={i} style={[st.tagChip, { backgroundColor: tc.bg, borderColor: tc.text + '25' }]}>
                  <EliteText variant="caption" style={{ color: tc.text, fontSize: FontSizes.sm }}>
                    {tag.replace(/_/g, ' ')}
                  </EliteText>
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Acciones */}
      <Animated.View entering={FadeInDown.delay(1250).springify().damping(18)}>
        <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
          {!esEtiqueta && !saved && (
            <AnimatedPressable onPress={handleSaveFood} disabled={saving} scaleDown={0.96}
              style={[st.ctaBtn, { backgroundColor: accent }]}>
              <Ionicons name="checkmark-circle" size={20} color={t.textoSobreLima} />
              <EliteText style={{ color: t.textoSobreLima, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                {saving ? 'Guardando...' : 'Guardar ✓'}
              </EliteText>
            </AnimatedPressable>
          )}

          {/* Track C: en SIMPLE, ajustar es opt-in (en COMPLETO el editor ya
              es el paso siguiente del botón Guardar) */}
          {!esEtiqueta && !saved && nutritionMode === 'simple' && (
            <Pressable onPress={() => setShowReview(true)} disabled={saving}
              style={{ alignSelf: 'center', paddingVertical: Spacing.sm }}>
              <EliteText style={{ color: t.textoTenue, fontSize: FontSizes.md }}>
                Revisar y ajustar antes de guardar
              </EliteText>
            </Pressable>
          )}

          {/* Recalcular con IA (solo si editó ingredientes) */}
          {!esEtiqueta && wasEdited && !saved && (
            <AnimatedPressable onPress={handleRecalculate} disabled={recalculating} scaleDown={0.96}
              style={[st.outlineBtn, { borderColor: BLUE + '50' }]}>
              <Ionicons name="refresh" size={18} color={BLUE} />
              <EliteText style={{ color: BLUE, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                {recalculating ? 'Analizando...' : 'Analizar con ARGOS'}
              </EliteText>
            </AnimatedPressable>
          )}

          {saved && (
            <Animated.View entering={FadeIn.springify()}>
              <View style={st.savedRow}>
                <View style={st.savedCheck}>
                  <Ionicons name="checkmark" size={20} color={t.textoSobreLima} />
                </View>
                <EliteText style={{ color: kind === 'dark' ? ATP_BRAND.lime : t.tealTexto, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                  Guardado
                </EliteText>
              </View>
              {/* P2 (MB-28B): comes esto seguido → guárdalo como receta y
                  la próxima vez lo registras con un toque desde Recetas. */}
              {!esEtiqueta && lastReview && (
                recipeSaved ? (
                  <View style={[st.savedRow, { paddingVertical: Spacing.sm }]}>
                    <Ionicons name="bookmark" size={16} color={ATP_BRAND.amber} />
                    <EliteText style={{ color: ATP_BRAND.amber, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }}>
                      En tus recetas
                    </EliteText>
                  </View>
                ) : (
                  <AnimatedPressable onPress={handleSaveAsRecipe} disabled={savingRecipe} scaleDown={0.96}
                    style={[st.outlineBtn, { borderColor: ATP_BRAND.amber + '50' }]}>
                    <Ionicons name="bookmark-outline" size={18} color={ATP_BRAND.amber} />
                    <EliteText style={{ color: ATP_BRAND.amber, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                      {savingRecipe ? 'Guardando...' : 'Guardar como receta'}
                    </EliteText>
                  </AnimatedPressable>
                )
              )}
            </Animated.View>
          )}

          <AnimatedPressable onPress={resetAndScan} scaleDown={0.96} style={st.outlineBtn}>
            <Ionicons name="camera-outline" size={18} color={accent} />
            <EliteText style={{ color: accent, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
              Escanear otro
            </EliteText>
          </AnimatedPressable>
        </View>
        {/* B-5 (MB-12): las macros son estimación de IA */}
        <MedicalDisclaimer feature="nutrition" />
      </Animated.View>
    </View>
  );
}

// NOCHE-4: fábrica de estilos con tokens — el StyleSheet vive fuera del
// componente (no puede llamar hooks), así que recibe t ya resuelto.
const makeSt = (t: AppThemeTokens) => StyleSheet.create({
  // Capture
  captureRing: {
    width: 110, height: 110, borderRadius: Radius.pill, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  captureRingInner: {
    width: 84, height: 84, borderRadius: Radius.pill, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterOuter: {
    width: 80, height: 80, borderRadius: Radius.pill, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: {
    width: 64, height: 64, borderRadius: Radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  captureSecRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },

  // Barra de texto tipo chat
  textBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: t.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: t.borde,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  textBarInput: {
    flex: 1, color: t.texto, fontSize: FontSizes.lg, fontFamily: Fonts.regular,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  textBarSend: {
    width: 32, height: 32, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },

  // Burbuja de texto en preview
  textBubble: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: t.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: t.borde,
    padding: 16, marginBottom: 4,
  },

  // Glass button
  glassBtn: { borderRadius: Radius.md, overflow: 'hidden', minWidth: 120 },
  glassBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 20,
  },

  // Preview
  photoWrap: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: t.card },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  photoControls: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 8 },
  photoCtrlBtn: {
    width: 44, height: 44, borderRadius: Radius.lg, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  noPhoto: {
    height: 200, borderRadius: Radius.lg, backgroundColor: t.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.borde,
    borderStyle: 'dashed',
  },
  sectionLabel: {
    color: t.textoSecundario, fontSize: FontSizes.md, fontFamily: Fonts.semiBold,
    marginBottom: 10, letterSpacing: 0.5,
  },
  mealChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.card,
    backgroundColor: t.card, borderWidth: 1, borderColor: t.borde,
  },
  input: {
    backgroundColor: t.card, borderRadius: Radius.card, borderWidth: 1, borderColor: t.borde,
    paddingHorizontal: 16, paddingVertical: 14, color: t.texto,
    fontSize: FontSizes.lg, fontFamily: Fonts.regular, marginTop: Spacing.sm,
  },
  hungerCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: Radius.md,
    backgroundColor: t.card, borderWidth: 1, borderColor: t.borde,
  },
  errorCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: SEMANTIC.error + '10', borderRadius: Radius.card, padding: 14, marginTop: Spacing.md,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: Radius.md,
  },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: t.borde,
  },

  // Analyzing
  analyzingCenter: {
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl,
    minHeight: 420,
  },
  analyzingGlow: {
    position: 'absolute', width: 200, height: 200, borderRadius: Radius.pill,
    ...Platform.select({
      ios: { shadowColor: '#5B9BD5', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 60 },
      default: {},
    }),
  },

  // Result
  macrosRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: Spacing.lg, gap: 8,
  },
  macroPill: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    backgroundColor: t.card, borderRadius: Radius.md, borderWidth: 1, borderColor: t.borde,
  },
  card: {
    backgroundColor: t.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: t.borde,
    padding: 16,
  },
  additiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.card, borderRadius: Radius.md, borderWidth: 1, borderColor: SEMANTIC.error + '15',
    padding: 14, marginBottom: 8,
  },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  foodIngredientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.borde,
  },
  flagChip: {
    backgroundColor: SEMANTIC.error + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.card,
  },
  tipCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(26,188,156,0.08)', borderRadius: Radius.lg, padding: 14, marginTop: Spacing.md,
  },
  tagChip: {
    backgroundColor: t.card, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.card,
    borderWidth: 1,
  },
  savedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: Spacing.md,
  },
  savedCheck: {
    width: 28, height: 28, borderRadius: Radius.card, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
  },
});
