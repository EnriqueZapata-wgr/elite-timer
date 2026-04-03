/**
 * Food Scan — Escaneo inteligente con diseño premium estilo Apple.
 * Animaciones spring 60fps, haptics, blur glass, score ring animado.
 * Modos: food | label | supplement.
 */
import { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, TextInput,
  Image, Dimensions, Alert, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeIn, FadeInUp, SlideInRight,
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withSpring, withRepeat, withTiming, withDelay, withSequence,
  Easing, interpolateColor, runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { haptic } from '@/src/utils/haptics';
import {
  analyzeFoodPhoto, analyzeLabelPhoto, analyzeSupplementPhoto,
  logFood, uploadFoodPhoto,
} from '@/src/services/nutrition-service';
import { analyzeFoodText, reanalyzeFood } from '@/src/services/nutrition-service';
import { Colors, Spacing, Fonts, Radius, FontSizes } from '@/constants/theme';
import { BackButton } from '@/src/components/ui/BackButton';
import { SURFACES, TEXT_COLORS, CATEGORY_COLORS, SEMANTIC, ATP_BRAND } from '@/src/constants/brand';

// === CONSTANTES ===

type ScanMode = 'food' | 'label' | 'supplement';
type Step = 'capture' | 'preview' | 'analyzing' | 'result';

const BLUE = CATEGORY_COLORS.nutrition;
const PURPLE = CATEGORY_COLORS.mind;
const { width: SW } = Dimensions.get('window');
const PHOTO_SIZE = SW - Spacing.lg * 2;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Desayuno', emoji: '\u{1F305}' },
  { key: 'lunch', label: 'Comida', emoji: '\u{2600}\u{FE0F}' },
  { key: 'dinner', label: 'Cena', emoji: '\u{1F319}' },
  { key: 'snack', label: 'Snack', emoji: '\u{1F34E}' },
  { key: 'pre_workout', label: 'Pre', emoji: '\u{1F4AA}' },
  { key: 'post_workout', label: 'Post', emoji: '\u{1F3CB}\u{FE0F}' },
];

const HUNGER_OPTIONS = [
  { key: 'hungry', emoji: '\u{1F60B}', label: 'Con hambre', value: 8 },
  { key: 'normal', emoji: '\u{1F610}', label: 'Normal', value: 5 },
  { key: 'not_hungry', emoji: '\u{1F922}', label: 'Sin hambre', value: 2 },
  { key: 'craving', emoji: '\u{1F630}', label: 'Antojo', value: 7 },
];

const MODE_CFG = {
  food: { title: 'Escanear Comida', icon: 'camera-outline' as const, color: BLUE },
  label: { title: 'Escanear Etiqueta', icon: 'barcode-outline' as const, color: SEMANTIC.warning },
  supplement: { title: 'Escanear Suplemento', icon: 'medkit-outline' as const, color: PURPLE },
};

const LABEL_CONTEXT = [
  { key: 'exercise', emoji: '\u{1F3C3}', label: 'Ejercicio/deporte' },
  { key: 'cooking', emoji: '\u{1F373}', label: 'Cocinar' },
  { key: 'daily_drink', emoji: '\u{1F964}', label: 'Bebida diaria' },
  { key: 'snack', emoji: '\u{1F36B}', label: 'Snack' },
  { key: 'kids', emoji: '\u{1F476}', label: 'Para niños' },
  { key: 'health', emoji: '\u{1F48A}', label: 'Salud específica' },
  { key: 'curiosity', emoji: '\u{1F937}', label: 'Solo curiosidad' },
];

const SUPPLEMENT_CONTEXT = [
  { key: 'performance', emoji: '\u{1F4AA}', label: 'Rendimiento' },
  { key: 'sleep', emoji: '\u{1F634}', label: 'Sueño' },
  { key: 'cognitive', emoji: '\u{1F9E0}', label: 'Cognitivo' },
  { key: 'heart', emoji: '\u{2764}\u{FE0F}', label: 'Corazón' },
  { key: 'bones', emoji: '\u{1F9B4}', label: 'Huesos/articulaciones' },
  { key: 'antiinflammatory', emoji: '\u{1F525}', label: 'Antiinflamatorio' },
  { key: 'hormonal', emoji: '\u{1F9EC}', label: 'Hormonal' },
  { key: 'immunity', emoji: '\u{1F9A0}', label: 'Inmunidad' },
  { key: 'digestion', emoji: '\u{1FAB4}', label: 'Digestión' },
  { key: 'general', emoji: '\u{1F937}', label: 'General' },
];

// === TAG COLORS — Semáforo verde/amarillo/rojo ===

const POSITIVE_TAGS = [
  'sin_azucar', 'sin azucar', 'ingredientes_naturales', 'ingredientes naturales',
  'conserva_tradicional', 'conserva tradicional', 'alta_proteina', 'alta proteina',
  'grasas_saludables', 'grasas saludables', 'alto_omega3', 'alto omega3',
  'sin_aditivos', 'sin aditivos', 'organico', 'orgánico', 'sin_conservadores',
  'sin conservadores', 'fibra', 'alta_fibra', 'anti_inflamatorio', 'antiinflamatorio',
  'sin_gluten', 'sin gluten', 'fermentado', 'probiotico', 'prebiotico',
  'bajo_indice_glucemico', 'sin_procesados', 'alimento_real', 'buena_biodisponibilidad',
  'formas_optimas', 'dosis_terapeutica', 'sin_excipientes_daninos', 'capsula_vegetal',
  'clean_label', 'sin_colorantes', 'sin_saborizantes_artificiales', 'bajo_azucar',
  'bajo_sodio', 'rico_en_fibra', 'vitaminas', 'minerales', 'antioxidantes',
];

const NEGATIVE_TAGS = [
  'ultra_procesado', 'ultraprocesado', 'azucar_alta', 'alto_azucar',
  'colorantes_artificiales', 'exceso_sodio', 'grasas_trans', 'aceite_industrial',
  'glutamato', 'aspartame', 'excipientes_cuestionables', 'subdosificado',
  'formas_pobres', 'dioxido_titanio', 'bht', 'bha', 'tartrazina',
  'jarabe_maiz', 'aceite_palma_hidrogenado', 'alto_en_azucar',
];

const CAUTION_TAGS = [
  'sodio_moderado', 'azucar_moderada', 'procesado_minimo',
  'contiene_soya', 'contiene_lacteos', 'cafeina', 'excipientes_aceptables',
];

function getTagColor(tag: string): { bg: string; text: string } {
  const n = tag.toLowerCase().trim().replace(/\s+/g, '_');
  if (POSITIVE_TAGS.some(p => n.includes(p) || p.includes(n)))
    return { bg: 'rgba(168,224,42,0.15)', text: ATP_BRAND.lime };
  if (NEGATIVE_TAGS.some(p => n.includes(p) || p.includes(n)))
    return { bg: 'rgba(226,75,74,0.15)', text: SEMANTIC.error };
  if (CAUTION_TAGS.some(p => n.includes(p) || p.includes(n)))
    return { bg: 'rgba(239,159,39,0.15)', text: SEMANTIC.warning };
  // Inferencia heurística
  if (n.startsWith('sin_') || n.startsWith('sin ') || n.includes('natural') || n.includes('limpio') || n.includes('buena') || n.includes('optim') || n.includes('puro'))
    return { bg: 'rgba(168,224,42,0.15)', text: ATP_BRAND.lime };
  if (n.includes('exceso') || n.includes('artificial') || n.includes('procesado') || n.includes('riesgo'))
    return { bg: 'rgba(226,75,74,0.15)', text: SEMANTIC.error };
  // Neutral
  return { bg: 'rgba(255,255,255,0.06)', text: TEXT_COLORS.secondary };
}

function autoMealType(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 15 && h < 18) return 'snack';
  return 'dinner';
}

function scoreToColor(s: number): string {
  if (s >= 90) return ATP_BRAND.lime;
  if (s >= 70) return ATP_BRAND.green1;
  if (s >= 50) return SEMANTIC.acceptable;
  if (s >= 30) return SEMANTIC.warning;
  return SEMANTIC.error;
}

// === SCORE RING — Animado con spring ===

function ScoreRing({ score, size = 160, accent }: { score: number; size?: number; accent: string }) {
  const sw = 8;
  const radius = (size - sw) / 2;
  const circ = 2 * Math.PI * radius;
  const color = scoreToColor(score);

  // Animación del anillo
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(300, withSpring(score / 100, { damping: 14, stiffness: 55 }));
  }, [score]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progress.value),
  }));

  // Animación del número (contador)
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const dur = 1200;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / dur, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * score));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    const timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, 400);
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [score]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Pista */}
        <Circle cx={size / 2} cy={size / 2} r={radius}
          stroke={SURFACES.cardLight} strokeWidth={sw} fill="transparent" />
        {/* Progreso animado */}
        <AnimatedCircle cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={sw} fill="transparent"
          strokeDasharray={`${circ}`} animatedProps={ringProps}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <EliteText style={{ fontSize: FontSizes.mega, fontFamily: Fonts.extraBold, color, includeFontPadding: false }}>
        {display}
      </EliteText>
    </View>
  );
}

// === MACRO PILL ===

function MacroPill({ label, value, unit, color, delay: d }: {
  label: string; value: string; unit: string; color: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(d).springify().damping(16)} style={st.macroPill}>
      <EliteText style={{ fontSize: FontSizes.xxl, fontFamily: Fonts.extraBold, color, includeFontPadding: false }}>
        {value}
      </EliteText>
      <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs, marginTop: -2 }}>
        {unit}
      </EliteText>
      <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.xs, marginTop: 2 }}>
        {label}
      </EliteText>
    </Animated.View>
  );
}

// === GLASS BUTTON ===

function GlassButton({ onPress, children, style }: {
  onPress: () => void; children: React.ReactNode; style?: any;
}) {
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

// === DOTS DE LOADING ===

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

// ═══════════════════════════════════════════════════════
// PANTALLA PRINCIPAL
// ═══════════════════════════════════════════════════════

export default function FoodScanScreen() {
  const router = useRouter();
  const { mode: mp } = useLocalSearchParams<{ mode?: string }>();
  const mode: ScanMode = (mp as ScanMode) || 'food';
  const cfg = MODE_CFG[mode];

  const [step, setStep] = useState<Step>('capture');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const [mealType, setMealType] = useState(autoMealType());
  const [description, setDescription] = useState('');
  const [hungerKey, setHungerKey] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [useCtx, setUseCtx] = useState<string | null>(null);

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Nuevos estados para modo food editable
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

  // Lanzar cámara al abrir
  useEffect(() => { openCamera(); }, []);

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
      setPhotoBase64(res.assets[0].base64 ?? null);
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
      setPhotoBase64(res.assets[0].base64 ?? null);
      setInputType('photo');
      setStep('preview');
    }
  };

  // === ANÁLISIS ===

  const handleAnalyze = async () => {
    // Para food con texto, no necesita foto
    if (mode === 'food' && inputType === 'text' && !textInput.trim()) return;
    if (mode !== 'food' && !photoBase64) return;
    if (mode === 'food' && inputType === 'photo' && !photoBase64) return;

    haptic.medium();
    setStep('analyzing');
    setError(null);
    try {
      let analysis: any;
      if (mode === 'food') {
        if (inputType === 'text') {
          // Análisis por texto — sin foto
          const hunger = hungerKey ? HUNGER_OPTIONS.find(h => h.key === hungerKey)?.label : undefined;
          const fullText = [textInput, hunger ? `Estado: ${hunger}` : ''].filter(Boolean).join('. ');
          analysis = await analyzeFoodText(fullText);
        } else {
          // Análisis por foto
          const hunger = hungerKey ? HUNGER_OPTIONS.find(h => h.key === hungerKey)?.label : undefined;
          const desc = [description, hunger ? `Estado: ${hunger}` : ''].filter(Boolean).join('. ');
          analysis = await analyzeFoodPhoto(photoBase64!, desc || undefined);
        }
        // Poblar ingredientes y totales editables
        setIngredients(analysis.ingredients || []);
        setEditedTotals(analysis.totals || null);
      } else if (mode === 'label') {
        const ctxLabel = useCtx ? LABEL_CONTEXT.find(c => c.key === useCtx)?.label : undefined;
        analysis = await analyzeLabelPhoto(photoBase64!, productName || undefined, ctxLabel);
      } else {
        const ctxSupp = useCtx ? SUPPLEMENT_CONTEXT.find(c => c.key === useCtx)?.label : undefined;
        analysis = await analyzeSupplementPhoto(photoBase64!, productName || undefined, ctxSupp);
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

  const handleSaveFood = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photoBase64) {
        try { photoUrl = await uploadFoodPhoto(photoBase64); } catch { /* opcional */ }
      }
      const hungerVal = hungerKey ? HUNGER_OPTIONS.find(h => h.key === hungerKey)?.value : undefined;
      const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      const totals = editedTotals || result.totals;
      await logFood({
        meal_type: mealType,
        description: result.food_identified || description || textInput || 'Sin descripción',
        photo_url: photoUrl,
        meal_time: now,
        hunger_level: hungerVal,
        ai_analysis: {
          ...result,
          ingredients: ingredients,
          totals: totals,
          input_type: inputType,
          was_edited: wasEdited,
        },
        calories: totals?.calories,
        protein_g: totals?.protein,
        carbs_g: totals?.carbs,
        fat_g: totals?.fat,
      });
      haptic.success();
      setSaved(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar');
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
      const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await logFood({
        meal_type: mealType, description: description || textInput || 'Sin descripción',
        photo_url: photoUrl, meal_time: now, hunger_level: hungerVal,
      });
      haptic.light();
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar');
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
    } catch { /* silencioso */ }
    setRecalculating(false);
  };

  // === HELPERS ===

  const getScore = (): number =>
    mode === 'food' ? result?.score ?? 0
    : mode === 'label' ? result?.cleanliness_score ?? 0
    : result?.quality_score ?? 0;

  const getScoreLabel = (): string => {
    const s = getScore();
    if (mode === 'food') return s >= 90 ? 'Excelente' : s >= 70 ? 'Buena elección' : s >= 50 ? 'Aceptable' : s >= 30 ? 'Podría mejorar' : 'Fuera del plan';
    if (mode === 'label') return s >= 90 ? 'Producto limpio' : s >= 70 ? 'Aceptable' : s >= 50 ? 'Procesado' : s >= 30 ? 'Ultra-procesado' : 'Evitar';
    return s >= 90 ? 'Excelente calidad' : s >= 70 ? 'Buena calidad' : s >= 50 ? 'Aceptable' : s >= 30 ? 'Baja calidad' : 'Evitar';
  };

  const getTitle = (): string =>
    mode === 'food' ? result?.food_identified ?? 'Comida'
    : mode === 'label' ? result?.product_name ?? 'Producto'
    : result?.supplement_name ?? 'Suplemento';

  const resetAndScan = () => {
    setResult(null); setPhotoUri(null); setPhotoBase64(null);
    setSaved(false); setDescription(''); setProductName(''); setUseCtx(null);
    setHungerKey(null); setMealType(autoMealType()); setStep('capture');
    // Reset nuevos estados de food editable
    setTextInput(''); setInputType('photo'); setIngredients([]);
    setEditedTotals(null); setWasEdited(false);
    setAddingIngredient(false); setNewIngredientName('');
    setTimeout(openCamera, 150);
  };

  // Manejar envío de texto desde capture (food mode)
  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    haptic.light();
    setInputType('text');
    setStep('preview');
  };

  // ═══════════════════════════════════════════
  // CAPTURE
  // ═══════════════════════════════════════════

  if (step === 'capture') {
    // Modo food: cámara + barra de texto
    if (mode === 'food') {
      return (
        <SafeAreaView style={st.screen}>
          <View style={st.back}>
            <BackButton color={TEXT_COLORS.secondary} />
          </View>

          <View style={{ flex: 1 }}>
            {/* Zona superior: cámara (50%) */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
                {/* Anillo decorativo */}
                <View style={[st.captureRing, { borderColor: cfg.color + '18' }]}>
                  <View style={[st.captureRingInner, { borderColor: cfg.color + '35' }]}>
                    <Ionicons name={cfg.icon} size={40} color={cfg.color} />
                  </View>
                </View>

                <EliteText style={{ fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: TEXT_COLORS.primary, marginTop: Spacing.lg }}>
                  {cfg.title}
                </EliteText>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: 4, fontSize: FontSizes.md }}>
                  Foto o describe lo que comiste
                </EliteText>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200).springify().damping(18)} style={{ marginTop: 28, alignItems: 'center', width: '100%', paddingHorizontal: Spacing.xl }}>
                {/* Botones: shutter + galería */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
                  {/* Galería (icono pequeño) */}
                  <Pressable onPress={openGallery} hitSlop={10}
                    style={{ width: 44, height: 44, borderRadius: Radius.lg, backgroundColor: SURFACES.card, borderWidth: 1, borderColor: SURFACES.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="images-outline" size={20} color={TEXT_COLORS.secondary} />
                  </Pressable>

                  {/* Botón principal — shutter */}
                  <AnimatedPressable onPress={openCamera} scaleDown={0.92} style={[st.shutterOuter, { borderColor: cfg.color }]}>
                    <View style={[st.shutterInner, { backgroundColor: cfg.color }]}>
                      <Ionicons name="camera" size={28} color={TEXT_COLORS.onAccent} />
                    </View>
                  </AnimatedPressable>

                  {/* Spacer para centrar el shutter */}
                  <View style={{ width: 44 }} />
                </View>
              </Animated.View>
            </View>

            {/* Zona inferior: barra de texto tipo chat */}
            <Animated.View entering={FadeInDown.delay(350).springify().damping(18)}
              style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
              <View style={st.textBarWrap}>
                <TextInput
                  style={st.textBarInput}
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder="Describe lo que comiste..."
                  placeholderTextColor={TEXT_COLORS.muted}
                  returnKeyType="send"
                  onSubmitEditing={handleTextSubmit}
                  multiline={false}
                />
                <AnimatedPressable
                  onPress={handleTextSubmit}
                  scaleDown={0.9}
                  style={[st.textBarSend, { backgroundColor: textInput.trim() ? cfg.color : SURFACES.cardLight }]}>
                  <Ionicons name="arrow-up" size={18} color={textInput.trim() ? TEXT_COLORS.onAccent : TEXT_COLORS.muted} />
                </AnimatedPressable>
              </View>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.sm, marginTop: 6, textAlign: 'center' }}>
                Tip: usa el micrófono de tu teclado 🎤
              </EliteText>
            </Animated.View>
          </View>
        </SafeAreaView>
      );
    }

    // Modo label / supplement: capture original
    return (
      <SafeAreaView style={st.screen}>
        <View style={st.back}>
          <BackButton color={TEXT_COLORS.secondary} />
        </View>
        <View style={st.captureCenter}>
          <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
            {/* Anillo decorativo */}
            <View style={[st.captureRing, { borderColor: cfg.color + '18' }]}>
              <View style={[st.captureRingInner, { borderColor: cfg.color + '35' }]}>
                <Ionicons name={cfg.icon} size={40} color={cfg.color} />
              </View>
            </View>

            <EliteText style={{ fontSize: FontSizes.xxl, fontFamily: Fonts.bold, color: TEXT_COLORS.primary, marginTop: Spacing.lg }}>
              {cfg.title}
            </EliteText>
            <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: 4, fontSize: FontSizes.md }}>
              Toma una foto para analizar con IA
            </EliteText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify().damping(18)} style={st.captureBtns}>
            {/* Botón principal — shutter */}
            <AnimatedPressable onPress={openCamera} scaleDown={0.92} style={[st.shutterOuter, { borderColor: cfg.color }]}>
              <View style={[st.shutterInner, { backgroundColor: cfg.color }]}>
                <Ionicons name="camera" size={28} color={TEXT_COLORS.onAccent} />
              </View>
            </AnimatedPressable>

            <View style={st.captureSecRow}>
              <GlassButton onPress={openGallery}>
                <Ionicons name="images-outline" size={18} color={TEXT_COLORS.primary} />
                <EliteText style={{ color: TEXT_COLORS.primary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold }}>
                  Galería
                </EliteText>
              </GlassButton>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════
  // PREVIEW
  // ═══════════════════════════════════════════

  if (step === 'preview') return (
    <SafeAreaView style={st.screen}>
      <View style={st.back}>
        <BackButton color={TEXT_COLORS.secondary} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Spacing.xxl + Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled">

        {/* Foto o burbuja de texto (food mode) */}
        {mode === 'food' && inputType === 'text' ? (
          // Burbuja de texto — sin foto
          <Animated.View entering={FadeIn.duration(400).springify()}>
            <View style={st.textBubble}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={cfg.color} style={{ marginRight: 8 }} />
              <EliteText style={{ color: TEXT_COLORS.primary, fontSize: FontSizes.lg, flex: 1, lineHeight: 22 }}>
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
              <Ionicons name="camera-outline" size={36} color={TEXT_COLORS.muted} />
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: 4 }}>
                Toca para tomar foto
              </EliteText>
            </Pressable>
          </Animated.View>
        )}

        {/* Contexto */}
        <Animated.View entering={FadeInDown.delay(150).springify().damping(18)}>
          {mode === 'food' ? (
            <View style={{ marginTop: Spacing.lg }}>
              {/* Meal type — segmented control style */}
              <EliteText variant="caption" style={st.sectionLabel}>Tipo de comida</EliteText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}>
                {MEAL_TYPES.map(t => {
                  const active = mealType === t.key;
                  return (
                    <AnimatedPressable key={t.key} scaleDown={0.94}
                      onPress={() => { haptic.light(); setMealType(t.key); }}
                      style={[st.mealChip, active && { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }]}>
                      <EliteText style={{ fontSize: FontSizes.lg }}>{t.emoji}</EliteText>
                      <EliteText style={{
                        fontSize: FontSizes.md, fontFamily: active ? Fonts.bold : Fonts.regular,
                        color: active ? cfg.color : TEXT_COLORS.secondary,
                      }}>
                        {t.label}
                      </EliteText>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>

              {/* Descripción extra (opcional, expandible) */}
              {inputType === 'photo' && (
                <TextInput
                  style={st.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="¿Qué es? (la IA identifica sola)"
                  placeholderTextColor={TEXT_COLORS.muted}
                  returnKeyType="done"
                />
              )}

              {inputType === 'text' && (
                <TextInput
                  style={st.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="¿Algo más? (contexto adicional)"
                  placeholderTextColor={TEXT_COLORS.muted}
                  returnKeyType="done"
                />
              )}

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
                      style={[st.hungerCard, active && { backgroundColor: cfg.color + '12', borderColor: cfg.color + '40' }]}>
                      <EliteText style={{ fontSize: FontSizes.xxl }}>{h.emoji}</EliteText>
                      <EliteText variant="caption" style={{
                        fontSize: FontSizes.xs, marginTop: 3,
                        color: active ? cfg.color : TEXT_COLORS.muted,
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
              <EliteText variant="caption" style={st.sectionLabel}>
                {mode === 'label' ? 'Nombre del producto' : 'Nombre del suplemento'}
              </EliteText>
              <TextInput
                style={st.input}
                value={productName}
                onChangeText={setProductName}
                placeholder={mode === 'label' ? 'Ej: Yogurt Griego Lala' : 'Ej: Omega 3 Nordic Naturals'}
                placeholderTextColor={TEXT_COLORS.muted}
                returnKeyType="done"
              />

              {/* Contexto de uso */}
              <EliteText variant="caption" style={[st.sectionLabel, { marginTop: Spacing.lg }]}>
                ¿Para qué lo usas?
              </EliteText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(mode === 'label' ? LABEL_CONTEXT : SUPPLEMENT_CONTEXT).map(c => {
                  const active = useCtx === c.key;
                  return (
                    <AnimatedPressable key={c.key} scaleDown={0.94}
                      onPress={() => { haptic.light(); setUseCtx(active ? null : c.key); }}
                      style={[st.mealChip, active && { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }]}>
                      <EliteText style={{ fontSize: FontSizes.md }}>{c.emoji}</EliteText>
                      <EliteText style={{
                        fontSize: FontSizes.sm, fontFamily: active ? Fonts.bold : Fonts.regular,
                        color: active ? cfg.color : TEXT_COLORS.secondary,
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
            {/* Botón analizar — habilitado por foto o texto */}
            <AnimatedPressable
              onPress={handleAnalyze}
              disabled={mode === 'food' ? (inputType === 'text' ? !textInput.trim() : !photoBase64) : !photoBase64}
              scaleDown={0.96}
              style={[st.ctaBtn, {
                backgroundColor: cfg.color,
                opacity: (mode === 'food' ? (inputType === 'text' ? !!textInput.trim() : !!photoBase64) : !!photoBase64) ? 1 : 0.3,
              }]}>
              <Ionicons name="sparkles" size={20} color={TEXT_COLORS.onAccent} />
              <EliteText style={{ color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                Analizar con IA
              </EliteText>
            </AnimatedPressable>

            {mode === 'food' && (
              <Pressable onPress={handleSaveWithout} disabled={saving}
                style={{ alignSelf: 'center', paddingVertical: Spacing.sm }}>
                <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.md }}>
                  {saving ? 'Guardando...' : 'Guardar sin analizar'}
                </EliteText>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════
  // ANALYZING — Cinematográfico
  // ═══════════════════════════════════════════

  if (step === 'analyzing') {
    const ringSize = 120;
    const aSw = 3;
    const aR = (ringSize - aSw) / 2;
    const aC = 2 * Math.PI * aR;

    return (
      <SafeAreaView style={st.screen}>
        <View style={st.analyzingCenter}>
          {/* Foto blurred de fondo */}
          {photoUri && (
            <Image source={{ uri: photoUri }}
              style={[StyleSheet.absoluteFill, { opacity: 0.08 }]}
              resizeMode="cover" blurRadius={30} />
          )}

          {/* Glow */}
          <Animated.View style={[st.analyzingGlow, glowStyle, { backgroundColor: cfg.color }]} />

          {/* Anillo rotatorio */}
          <Animated.View style={analyzeRotStyle}>
            <Svg width={ringSize} height={ringSize}>
              <Circle cx={ringSize / 2} cy={ringSize / 2} r={aR}
                stroke={cfg.color + '15'} strokeWidth={aSw} fill="transparent" />
              <Circle cx={ringSize / 2} cy={ringSize / 2} r={aR}
                stroke={cfg.color} strokeWidth={aSw} fill="transparent"
                strokeDasharray={`${aC * 0.3} ${aC * 0.7}`}
                strokeLinecap="round" />
            </Svg>
          </Animated.View>

          {/* Icono central */}
          <View style={{ position: 'absolute' }}>
            <Ionicons name="sparkles" size={32} color={cfg.color} />
          </View>

          <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xxl, marginTop: Spacing.xl }}>
            Analizando
          </EliteText>
          <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: 6, fontSize: FontSizes.md, textAlign: 'center' }}>
            {mode === 'food' ? 'Identificando comida y nutrientes'
              : mode === 'label' ? 'Leyendo ingredientes y aditivos'
              : 'Evaluando calidad y biodisponibilidad'}
          </EliteText>
          <LoadingDots color={cfg.color} />
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════
  // RESULT
  // ═══════════════════════════════════════════

  if (!result) return null;
  const sc = getScore();
  const scColor = scoreToColor(sc);

  // Totales para macros (usa editados si hay, o los del resultado)
  const displayTotals = editedTotals || result.totals;

  return (
    <SafeAreaView style={st.screen}>
      <View style={st.back}>
        <BackButton icon="close" color={TEXT_COLORS.secondary} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Spacing.xxl + Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: 120 }}>

        {/* Score hero */}
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={{ alignItems: 'center' }}>
          <ScoreRing score={sc} accent={cfg.color} />
          <EliteText style={{
            color: scColor, fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, marginTop: Spacing.sm,
          }}>
            {getScoreLabel()}
          </EliteText>
          <EliteText style={{
            color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xxl,
            textAlign: 'center', marginTop: Spacing.xs,
          }}>
            {getTitle()}
          </EliteText>
        </Animated.View>

        {/* FOOD: Ingredientes editables + Macros */}
        {mode === 'food' && (
          <>
            {/* Ingredientes detectados */}
            <Animated.View entering={FadeInDown.delay(400).springify().damping(18)}>
              <View style={[st.card, { marginTop: Spacing.lg }]}>
                <EliteText variant="caption" style={st.sectionLabel}>Ingredientes detectados</EliteText>
                {ingredients.map((ing, idx) => (
                  <View key={idx} style={st.foodIngredientRow}>
                    <View style={{ flex: 1 }}>
                      <EliteText style={{ color: TEXT_COLORS.primary, fontSize: FontSizes.md }}>{ing.name}</EliteText>
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.sm }}>{ing.portion}</EliteText>
                    </View>
                    <EliteText variant="caption" style={{ color: BLUE, fontSize: FontSizes.sm }}>
                      {ing.calories}cal · {ing.protein}p
                    </EliteText>
                    <Pressable onPress={() => removeIngredient(idx)} hitSlop={8}>
                      <Ionicons name="close-circle-outline" size={18} color={TEXT_COLORS.muted} />
                    </Pressable>
                  </View>
                ))}

                {/* Agregar ingrediente */}
                {addingIngredient ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                    <TextInput
                      style={[st.input, { flex: 1, marginTop: 0 }]}
                      value={newIngredientName}
                      onChangeText={setNewIngredientName}
                      placeholder="¿Qué más?"
                      placeholderTextColor={TEXT_COLORS.muted}
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

            {/* Macros — usa editedTotals o result.totals */}
            <View style={st.macrosRow}>
              <MacroPill label="Calorías" value={`${displayTotals?.calories ?? result.estimated_calories ?? '—'}`} unit="kcal" color={TEXT_COLORS.primary} delay={500} />
              <MacroPill label="Proteína" value={`${displayTotals?.protein ?? result.estimated_protein ?? '—'}`} unit="g" color={BLUE} delay={600} />
              <MacroPill label="Carbos" value={`${displayTotals?.carbs ?? result.estimated_carbs ?? '—'}`} unit="g" color={SEMANTIC.acceptable} delay={700} />
              <MacroPill label="Grasa" value={`${displayTotals?.fat ?? result.estimated_fat ?? '—'}`} unit="g" color={SEMANTIC.warning} delay={800} />
            </View>
            <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.sm, textAlign: 'center', marginTop: 4 }}>
              Estimados aproximados
            </EliteText>

            {/* Puntos buenos */}
            {result.good_points?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(850).springify()}>
                <View style={{ marginTop: Spacing.md }}>
                  {result.good_points.map((p: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="checkmark-circle" size={14} color={ATP_BRAND.lime} />
                      <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.md }}>{p}</EliteText>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Puntos a mejorar */}
            {result.improve_points?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(900).springify()}>
                <View style={{ marginTop: Spacing.xs }}>
                  {result.improve_points.map((p: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="arrow-up-circle" size={14} color={SEMANTIC.warning} />
                      <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.md }}>{p}</EliteText>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}
          </>
        )}

        {/* LABEL: Stats + additive alerts */}
        {mode === 'label' && (
          <>
            <View style={st.macrosRow}>
              <MacroPill label="Ingredientes" value={`${result.ingredients_count ?? '—'}`} unit="" color={cfg.color} delay={400} />
              <MacroPill label="Naturales" value={`${result.natural_ingredients ?? '—'}`} unit="" color={ATP_BRAND.lime} delay={500} />
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
                        <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }}>
                          {a.code ? `${a.code} ` : ''}{a.name}
                        </EliteText>
                        {a.explanation && (
                          <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.sm, marginTop: 2 }}>
                            {a.explanation}
                          </EliteText>
                        )}
                      </View>
                      <View style={[st.riskBadge, {
                        backgroundColor: (a.risk === 'alto' ? SEMANTIC.error : a.risk === 'medio' ? SEMANTIC.warning : ATP_BRAND.lime) + '18',
                      }]}>
                        <EliteText variant="caption" style={{
                          color: a.risk === 'alto' ? SEMANTIC.error : a.risk === 'medio' ? SEMANTIC.warning : ATP_BRAND.lime,
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

        {/* SUPPLEMENT: Active + inactive ingredients */}
        {mode === 'supplement' && (
          <>
            {result.active_ingredients?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(400).springify().damping(18)}>
                <EliteText variant="caption" style={[st.sectionLabel, { color: cfg.color, marginTop: Spacing.xl }]}>
                  Ingredientes activos
                </EliteText>
                {result.active_ingredients.map((ing: any, i: number) => (
                  <Animated.View key={i} entering={SlideInRight.delay(500 + i * 80).springify().damping(18)}>
                    <View style={st.ingredientRow}>
                      <View style={{ flex: 1 }}>
                        <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }}>
                          {ing.name}
                        </EliteText>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 3 }}>
                          {ing.form && <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.sm }}>
                            {ing.form}
                          </EliteText>}
                          {ing.bioavailability && <EliteText variant="caption" style={{
                            color: ing.bioavailability === 'alta' ? ATP_BRAND.lime : ing.bioavailability === 'media' ? SEMANTIC.warning : SEMANTIC.error,
                            fontSize: FontSizes.sm, fontFamily: Fonts.bold,
                          }}>
                            Bio: {ing.bioavailability}
                          </EliteText>}
                        </View>
                      </View>
                      <EliteText style={{ color: cfg.color, fontFamily: Fonts.bold, fontSize: FontSizes.md }}>
                        {ing.amount}
                      </EliteText>
                    </View>
                  </Animated.View>
                ))}
              </Animated.View>
            )}
            {result.inactive_ingredients?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(700).springify()}>
                <EliteText variant="caption" style={[st.sectionLabel, { color: TEXT_COLORS.muted, marginTop: Spacing.lg }]}>
                  Excipientes
                </EliteText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {result.inactive_ingredients.map((ing: string, i: number) => (
                    <View key={i} style={st.excipientChip}>
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm }}>{ing}</EliteText>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}
            {result.interactions && result.interactions !== 'null' && (
              <Animated.View entering={FadeInDown.delay(800).springify()}>
                <View style={[st.card, { borderLeftColor: SEMANTIC.warning, borderLeftWidth: 3, marginTop: Spacing.md }]}>
                  <EliteText variant="caption" style={{ color: SEMANTIC.warning, fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1 }}>
                    PRECAUCIONES
                  </EliteText>
                  <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.md, marginTop: 4 }}>
                    {result.interactions}
                  </EliteText>
                </View>
              </Animated.View>
            )}
          </>
        )}

        {/* Feedback */}
        {result.feedback && (
          <Animated.View entering={FadeInDown.delay(mode === 'food' ? 950 : 900).springify().damping(18)}>
            <View style={[st.card, { borderLeftColor: cfg.color, borderLeftWidth: 3, marginTop: Spacing.lg }]}>
              <EliteText style={{ color: TEXT_COLORS.primary, fontSize: FontSizes.lg, lineHeight: 22 }}>
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
                    {'\u26A0\uFE0F'} {f}
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
              <Ionicons name="bulb-outline" size={18} color={ATP_BRAND.teal2} />
              <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.md, flex: 1, lineHeight: 20 }}>
                {result.suggestions || result.better_alternative}
              </EliteText>
            </View>
          </Animated.View>
        )}

        {/* Tags — semaforizados */}
        {result.tags?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(1150).springify()}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md }}>
              {result.tags.map((t: string, i: number) => {
                const tc = getTagColor(t);
                return (
                  <View key={i} style={[st.tagChip, { backgroundColor: tc.bg, borderColor: tc.text + '25' }]}>
                    <EliteText variant="caption" style={{ color: tc.text, fontSize: FontSizes.sm }}>
                      {t.replace(/_/g, ' ')}
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
            {/* Guardar (food) */}
            {mode === 'food' && !saved && (
              <AnimatedPressable onPress={handleSaveFood} disabled={saving} scaleDown={0.96}
                style={[st.ctaBtn, { backgroundColor: cfg.color }]}>
                <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-circle'} size={20} color={TEXT_COLORS.onAccent} />
                <EliteText style={{ color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                  {saving ? 'Guardando...' : 'Guardar \u2713'}
                </EliteText>
              </AnimatedPressable>
            )}

            {/* Recalcular con IA (solo si editó ingredientes) */}
            {mode === 'food' && wasEdited && !saved && (
              <AnimatedPressable onPress={handleRecalculate} disabled={recalculating} scaleDown={0.96}
                style={[st.outlineBtn, { borderColor: BLUE + '50' }]}>
                <Ionicons name={recalculating ? 'hourglass-outline' : 'refresh'} size={18} color={BLUE} />
                <EliteText style={{ color: BLUE, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                  {recalculating ? 'Recalculando...' : 'Recalcular con IA'}
                </EliteText>
              </AnimatedPressable>
            )}

            {saved && (
              <Animated.View entering={FadeIn.springify()}>
                <View style={st.savedRow}>
                  <View style={st.savedCheck}>
                    <Ionicons name="checkmark" size={20} color={TEXT_COLORS.onAccent} />
                  </View>
                  <EliteText style={{ color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                    Guardado
                  </EliteText>
                </View>
              </Animated.View>
            )}

            <AnimatedPressable onPress={resetAndScan} scaleDown={0.96} style={st.outlineBtn}>
              <Ionicons name="camera-outline" size={18} color={cfg.color} />
              <EliteText style={{ color: cfg.color, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                Escanear otro
              </EliteText>
            </AnimatedPressable>

            <Pressable onPress={() => router.back()} style={{ alignSelf: 'center', paddingVertical: Spacing.md }}>
              <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.md }}>
                Volver
              </EliteText>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════
// ESTILOS
// ═══════════════════════════════════════════

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  back: { position: 'absolute', top: Spacing.xxl, left: Spacing.md, zIndex: 10, padding: Spacing.sm },

  // Capture
  captureCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  captureRing: {
    width: 130, height: 130, borderRadius: Radius.pill, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  captureRingInner: {
    width: 100, height: 100, borderRadius: Radius.pill, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtns: { marginTop: 40, alignItems: 'center', gap: Spacing.lg, width: '100%', paddingHorizontal: Spacing.xl },
  shutterOuter: {
    width: 80, height: 80, borderRadius: Radius.pill, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: {
    width: 64, height: 64, borderRadius: Radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  captureSecRow: { flexDirection: 'row', gap: Spacing.md },

  // Barra de texto tipo chat (food capture)
  textBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SURFACES.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: SURFACES.border,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  textBarInput: {
    flex: 1, color: TEXT_COLORS.primary, fontSize: FontSizes.lg, fontFamily: Fonts.regular,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  textBarSend: {
    width: 32, height: 32, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },

  // Burbuja de texto en preview
  textBubble: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: SURFACES.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: SURFACES.border,
    padding: 16, marginBottom: 4,
  },

  // Glass button
  glassBtn: {
    borderRadius: Radius.md, overflow: 'hidden', minWidth: 120,
  },
  glassBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 20,
  },

  // Preview
  photoWrap: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: SURFACES.card },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  photoControls: {
    position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 8,
  },
  photoCtrlBtn: {
    width: 44, height: 44, borderRadius: Radius.lg, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  noPhoto: {
    height: 200, borderRadius: Radius.lg, backgroundColor: SURFACES.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SURFACES.border,
    borderStyle: 'dashed',
  },
  sectionLabel: {
    color: TEXT_COLORS.secondary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold,
    marginBottom: 10, letterSpacing: 0.5,
  },
  mealChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.card,
    backgroundColor: SURFACES.card, borderWidth: 1, borderColor: SURFACES.border,
  },
  input: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 1, borderColor: SURFACES.border,
    paddingHorizontal: 16, paddingVertical: 14, color: TEXT_COLORS.primary,
    fontSize: FontSizes.lg, fontFamily: Fonts.regular, marginTop: Spacing.sm,
  },
  hungerCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: Radius.md,
    backgroundColor: SURFACES.card, borderWidth: 1, borderColor: SURFACES.border,
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
    paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: SURFACES.border,
  },

  // Analyzing
  analyzingCenter: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl,
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
    backgroundColor: SURFACES.card, borderRadius: Radius.md, borderWidth: 1, borderColor: SURFACES.border,
  },
  card: {
    backgroundColor: SURFACES.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: SURFACES.border,
    padding: 16,
  },
  additiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACES.card, borderRadius: Radius.md, borderWidth: 1, borderColor: SEMANTIC.error + '15',
    padding: 14, marginBottom: 8,
  },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACES.card, borderRadius: Radius.md, borderWidth: 1, borderColor: SURFACES.border,
    padding: 14, marginBottom: 8,
  },
  // Fila de ingrediente editable (food mode result)
  foodIngredientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACES.border,
  },
  excipientChip: {
    backgroundColor: SURFACES.cardLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.card,
  },
  flagChip: {
    backgroundColor: SEMANTIC.error + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.card,
  },
  tipCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'rgba(26,188,156,0.08)', borderRadius: Radius.lg, padding: 14, marginTop: Spacing.md,
  },
  tagChip: {
    backgroundColor: SURFACES.card, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.card,
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
