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
import { vibrateLight, vibrateMedium, vibrateHeavy } from '@/src/utils/haptics';
import {
  analyzeFoodPhoto, analyzeLabelPhoto, analyzeSupplementPhoto,
  logFood, uploadFoodPhoto,
} from '@/src/services/nutrition-service';
import { Colors, Spacing, Fonts } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, CATEGORY_COLORS, SEMANTIC, ATP_BRAND } from '@/src/constants/brand';

// === CONSTANTES ===

type ScanMode = 'food' | 'label' | 'supplement';
type Step = 'capture' | 'preview' | 'analyzing' | 'result';

const BLUE = CATEGORY_COLORS.nutrition;
const PURPLE = CATEGORY_COLORS.mind;
const { width: SW } = Dimensions.get('window');
const PHOTO_SIZE = SW - Spacing.lg * 2;
const R = 24; // Radio Apple (grande, consistente)

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
      <EliteText style={{ fontSize: 48, fontFamily: Fonts.extraBold, color, includeFontPadding: false }}>
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
      <EliteText style={{ fontSize: 24, fontFamily: Fonts.extraBold, color, includeFontPadding: false }}>
        {value}
      </EliteText>
      <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 9, marginTop: -2 }}>
        {unit}
      </EliteText>
      <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 10, marginTop: 2 }}>
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

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      vibrateLight();
      setPhotoUri(res.assets[0].uri);
      setPhotoBase64(res.assets[0].base64 ?? null);
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
      vibrateLight();
      setPhotoUri(res.assets[0].uri);
      setPhotoBase64(res.assets[0].base64 ?? null);
      setStep('preview');
    }
  };

  // === ANÁLISIS ===

  const handleAnalyze = async () => {
    if (!photoBase64) return;
    vibrateMedium();
    setStep('analyzing');
    setError(null);
    try {
      let analysis: any;
      if (mode === 'food') {
        const hunger = hungerKey ? HUNGER_OPTIONS.find(h => h.key === hungerKey)?.label : undefined;
        const desc = [description, hunger ? `Estado: ${hunger}` : ''].filter(Boolean).join('. ');
        analysis = await analyzeFoodPhoto(photoBase64, desc || undefined);
      } else if (mode === 'label') {
        analysis = await analyzeLabelPhoto(photoBase64, productName || undefined);
      } else {
        analysis = await analyzeSupplementPhoto(photoBase64, productName || undefined);
      }
      vibrateHeavy();
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
      await logFood({
        meal_type: mealType,
        description: result.food_identified || description || 'Sin descripción',
        photo_url: photoUrl, meal_time: now, hunger_level: hungerVal,
        ai_analysis: result, calories: result.estimated_calories,
        protein_g: result.estimated_protein, carbs_g: result.estimated_carbs,
        fat_g: result.estimated_fat,
      });
      vibrateHeavy();
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
        meal_type: mealType, description: description || 'Sin descripción',
        photo_url: photoUrl, meal_time: now, hunger_level: hungerVal,
      });
      vibrateLight();
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar');
    }
    setSaving(false);
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
    setSaved(false); setDescription(''); setProductName('');
    setHungerKey(null); setMealType(autoMealType()); setStep('capture');
    setTimeout(openCamera, 150);
  };

  // ═══════════════════════════════════════════
  // CAPTURE
  // ═══════════════════════════════════════════

  if (step === 'capture') return (
    <SafeAreaView style={st.screen}>
      <Pressable onPress={() => router.back()} style={st.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={TEXT_COLORS.secondary} />
      </Pressable>
      <View style={st.captureCenter}>
        <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
          {/* Anillo decorativo */}
          <View style={[st.captureRing, { borderColor: cfg.color + '18' }]}>
            <View style={[st.captureRingInner, { borderColor: cfg.color + '35' }]}>
              <Ionicons name={cfg.icon} size={40} color={cfg.color} />
            </View>
          </View>

          <EliteText style={{ fontSize: 22, fontFamily: Fonts.bold, color: TEXT_COLORS.primary, marginTop: Spacing.lg }}>
            {cfg.title}
          </EliteText>
          <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: 4, fontSize: 13 }}>
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
              <EliteText style={{ color: TEXT_COLORS.primary, fontSize: 14, fontFamily: Fonts.semiBold }}>
                Galería
              </EliteText>
            </GlassButton>

            {mode === 'food' && (
              <GlassButton onPress={() => setStep('preview')}>
                <Ionicons name="text-outline" size={18} color={TEXT_COLORS.primary} />
                <EliteText style={{ color: TEXT_COLORS.primary, fontSize: 14, fontFamily: Fonts.semiBold }}>
                  Solo texto
                </EliteText>
              </GlassButton>
            )}
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════
  // PREVIEW
  // ═══════════════════════════════════════════

  if (step === 'preview') return (
    <SafeAreaView style={st.screen}>
      <Pressable onPress={() => router.back()} style={st.back} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={TEXT_COLORS.secondary} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Spacing.xxl + Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled">

        {/* Foto */}
        {photoUri ? (
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
                      onPress={() => { vibrateLight(); setMealType(t.key); }}
                      style={[st.mealChip, active && { backgroundColor: cfg.color + '18', borderColor: cfg.color + '50' }]}>
                      <EliteText style={{ fontSize: 16 }}>{t.emoji}</EliteText>
                      <EliteText style={{
                        fontSize: 13, fontFamily: active ? Fonts.bold : Fonts.regular,
                        color: active ? cfg.color : TEXT_COLORS.secondary,
                      }}>
                        {t.label}
                      </EliteText>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>

              {/* Descripción */}
              <TextInput
                style={st.input}
                value={description}
                onChangeText={setDescription}
                placeholder="¿Qué es? (la IA identifica sola)"
                placeholderTextColor={TEXT_COLORS.muted}
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
                      onPress={() => { vibrateLight(); setHungerKey(active ? null : h.key); }}
                      style={[st.hungerCard, active && { backgroundColor: cfg.color + '12', borderColor: cfg.color + '40' }]}>
                      <EliteText style={{ fontSize: 24 }}>{h.emoji}</EliteText>
                      <EliteText variant="caption" style={{
                        fontSize: 10, marginTop: 3,
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
            </View>
          )}
        </Animated.View>

        {/* Error */}
        {error && (
          <Animated.View entering={FadeInDown.springify()}>
            <View style={st.errorCard}>
              <Ionicons name="alert-circle" size={18} color={SEMANTIC.error} />
              <EliteText style={{ color: SEMANTIC.error, fontSize: 13, flex: 1 }}>{error}</EliteText>
            </View>
          </Animated.View>
        )}

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(300).springify().damping(18)}>
          <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
            <AnimatedPressable onPress={handleAnalyze} disabled={!photoBase64} scaleDown={0.96}
              style={[st.ctaBtn, { backgroundColor: cfg.color, opacity: photoBase64 ? 1 : 0.3 }]}>
              <Ionicons name="sparkles" size={20} color={TEXT_COLORS.onAccent} />
              <EliteText style={{ color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: 17 }}>
                Analizar con IA
              </EliteText>
            </AnimatedPressable>

            {mode === 'food' && (
              <Pressable onPress={handleSaveWithout} disabled={saving}
                style={{ alignSelf: 'center', paddingVertical: Spacing.sm }}>
                <EliteText style={{ color: TEXT_COLORS.muted, fontSize: 14 }}>
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

          <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: 20, marginTop: Spacing.xl }}>
            Analizando
          </EliteText>
          <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: 6, fontSize: 14, textAlign: 'center' }}>
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

  return (
    <SafeAreaView style={st.screen}>
      <Pressable onPress={() => router.back()} style={st.back} hitSlop={12}>
        <Ionicons name="close" size={24} color={TEXT_COLORS.secondary} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Spacing.xxl + Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: 120 }}>

        {/* Score hero */}
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={{ alignItems: 'center' }}>
          <ScoreRing score={sc} accent={cfg.color} />
          <EliteText style={{
            color: scColor, fontSize: 15, fontFamily: Fonts.semiBold, marginTop: Spacing.sm,
          }}>
            {getScoreLabel()}
          </EliteText>
          <EliteText style={{
            color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: 22,
            textAlign: 'center', marginTop: Spacing.xs,
          }}>
            {getTitle()}
          </EliteText>
        </Animated.View>

        {/* FOOD: Macros */}
        {mode === 'food' && (
          <View style={st.macrosRow}>
            <MacroPill label="Calorías" value={`${result.estimated_calories ?? '—'}`} unit="kcal" color={TEXT_COLORS.primary} delay={400} />
            <MacroPill label="Proteína" value={`${result.estimated_protein ?? '—'}`} unit="g" color={BLUE} delay={500} />
            <MacroPill label="Carbos" value={`${result.estimated_carbs ?? '—'}`} unit="g" color={SEMANTIC.acceptable} delay={600} />
            <MacroPill label="Grasa" value={`${result.estimated_fat ?? '—'}`} unit="g" color={SEMANTIC.warning} delay={700} />
          </View>
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
                        <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: 14 }}>
                          {a.code ? `${a.code} ` : ''}{a.name}
                        </EliteText>
                        {a.explanation && (
                          <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 12, marginTop: 2 }}>
                            {a.explanation}
                          </EliteText>
                        )}
                      </View>
                      <View style={[st.riskBadge, {
                        backgroundColor: (a.risk === 'alto' ? SEMANTIC.error : a.risk === 'medio' ? SEMANTIC.warning : ATP_BRAND.lime) + '18',
                      }]}>
                        <EliteText variant="caption" style={{
                          color: a.risk === 'alto' ? SEMANTIC.error : a.risk === 'medio' ? SEMANTIC.warning : ATP_BRAND.lime,
                          fontSize: 10, fontFamily: Fonts.bold,
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
                        <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: 14 }}>
                          {ing.name}
                        </EliteText>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 3 }}>
                          {ing.form && <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: 11 }}>
                            {ing.form}
                          </EliteText>}
                          {ing.bioavailability && <EliteText variant="caption" style={{
                            color: ing.bioavailability === 'alta' ? ATP_BRAND.lime : ing.bioavailability === 'media' ? SEMANTIC.warning : SEMANTIC.error,
                            fontSize: 11, fontFamily: Fonts.bold,
                          }}>
                            Bio: {ing.bioavailability}
                          </EliteText>}
                        </View>
                      </View>
                      <EliteText style={{ color: cfg.color, fontFamily: Fonts.bold, fontSize: 13 }}>
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
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: 12 }}>{ing}</EliteText>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}
            {result.interactions && result.interactions !== 'null' && (
              <Animated.View entering={FadeInDown.delay(800).springify()}>
                <View style={[st.card, { borderLeftColor: SEMANTIC.warning, borderLeftWidth: 3, marginTop: Spacing.md }]}>
                  <EliteText variant="caption" style={{ color: SEMANTIC.warning, fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 1 }}>
                    PRECAUCIONES
                  </EliteText>
                  <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: 13, marginTop: 4 }}>
                    {result.interactions}
                  </EliteText>
                </View>
              </Animated.View>
            )}
          </>
        )}

        {/* Feedback */}
        {result.feedback && (
          <Animated.View entering={FadeInDown.delay(mode === 'food' ? 800 : 900).springify().damping(18)}>
            <View style={[st.card, { borderLeftColor: cfg.color, borderLeftWidth: 3, marginTop: Spacing.lg }]}>
              <EliteText style={{ color: TEXT_COLORS.primary, fontSize: 15, lineHeight: 22 }}>
                {result.feedback}
              </EliteText>
            </View>
          </Animated.View>
        )}

        {/* Red flags */}
        {result.red_flags?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(950).springify()}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md }}>
              {result.red_flags.map((f: string, i: number) => (
                <View key={i} style={st.flagChip}>
                  <EliteText style={{ color: SEMANTIC.error, fontSize: 12 }}>
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
              <Ionicons name="bulb-outline" size={18} color={SEMANTIC.acceptable} />
              <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: 13, flex: 1, lineHeight: 20 }}>
                {result.suggestions || result.better_alternative}
              </EliteText>
            </View>
          </Animated.View>
        )}

        {/* Tags */}
        {result.tags?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(1150).springify()}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md }}>
              {result.tags.map((t: string, i: number) => (
                <View key={i} style={[st.tagChip, { borderColor: cfg.color + '25' }]}>
                  <EliteText variant="caption" style={{ color: cfg.color, fontSize: 11 }}>
                    {t.replace(/_/g, ' ')}
                  </EliteText>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Acciones */}
        <Animated.View entering={FadeInDown.delay(1250).springify().damping(18)}>
          <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
            {mode === 'food' && !saved && (
              <AnimatedPressable onPress={handleSaveFood} disabled={saving} scaleDown={0.96}
                style={[st.ctaBtn, { backgroundColor: cfg.color }]}>
                <Ionicons name={saving ? 'hourglass-outline' : 'checkmark-circle'} size={20} color={TEXT_COLORS.onAccent} />
                <EliteText style={{ color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: 17 }}>
                  {saving ? 'Guardando...' : 'Guardar registro'}
                </EliteText>
              </AnimatedPressable>
            )}

            {saved && (
              <Animated.View entering={FadeIn.springify()}>
                <View style={st.savedRow}>
                  <View style={st.savedCheck}>
                    <Ionicons name="checkmark" size={20} color={TEXT_COLORS.onAccent} />
                  </View>
                  <EliteText style={{ color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: 17 }}>
                    Guardado
                  </EliteText>
                </View>
              </Animated.View>
            )}

            <AnimatedPressable onPress={resetAndScan} scaleDown={0.96} style={st.outlineBtn}>
              <Ionicons name="camera-outline" size={18} color={cfg.color} />
              <EliteText style={{ color: cfg.color, fontFamily: Fonts.semiBold, fontSize: 15 }}>
                Escanear otro
              </EliteText>
            </AnimatedPressable>

            <Pressable onPress={() => router.back()} style={{ alignSelf: 'center', paddingVertical: Spacing.md }}>
              <EliteText style={{ color: TEXT_COLORS.muted, fontSize: 14 }}>
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
    width: 130, height: 130, borderRadius: 65, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  captureRingInner: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtns: { marginTop: 40, alignItems: 'center', gap: Spacing.lg, width: '100%', paddingHorizontal: Spacing.xl },
  shutterOuter: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  captureSecRow: { flexDirection: 'row', gap: Spacing.md },

  // Glass button
  glassBtn: {
    borderRadius: 16, overflow: 'hidden', minWidth: 120,
  },
  glassBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 20,
  },

  // Preview
  photoWrap: { borderRadius: R, overflow: 'hidden', backgroundColor: SURFACES.card },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  photoControls: {
    position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 8,
  },
  photoCtrlBtn: {
    width: 36, height: 36, borderRadius: 18, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  noPhoto: {
    height: 200, borderRadius: R, backgroundColor: SURFACES.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SURFACES.border,
    borderStyle: 'dashed',
  },
  sectionLabel: {
    color: TEXT_COLORS.secondary, fontSize: 13, fontFamily: Fonts.semiBold,
    marginBottom: 10, letterSpacing: 0.5,
  },
  mealChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    backgroundColor: SURFACES.card, borderWidth: 1, borderColor: SURFACES.border,
  },
  input: {
    backgroundColor: SURFACES.card, borderRadius: 14, borderWidth: 1, borderColor: SURFACES.border,
    paddingHorizontal: 16, paddingVertical: 14, color: TEXT_COLORS.primary,
    fontSize: 15, fontFamily: Fonts.regular, marginTop: Spacing.sm,
  },
  hungerCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16,
    backgroundColor: SURFACES.card, borderWidth: 1, borderColor: SURFACES.border,
  },
  errorCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: SEMANTIC.error + '10', borderRadius: 14, padding: 14, marginTop: Spacing.md,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 16,
  },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: SURFACES.border,
  },

  // Analyzing
  analyzingCenter: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl,
  },
  analyzingGlow: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
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
    backgroundColor: SURFACES.card, borderRadius: 16, borderWidth: 1, borderColor: SURFACES.border,
  },
  card: {
    backgroundColor: SURFACES.card, borderRadius: R, borderWidth: 1, borderColor: SURFACES.border,
    padding: 16,
  },
  additiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACES.card, borderRadius: 16, borderWidth: 1, borderColor: SEMANTIC.error + '15',
    padding: 14, marginBottom: 8,
  },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACES.card, borderRadius: 16, borderWidth: 1, borderColor: SURFACES.border,
    padding: 14, marginBottom: 8,
  },
  excipientChip: {
    backgroundColor: SURFACES.cardLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  flagChip: {
    backgroundColor: SEMANTIC.error + '10', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  tipCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: SEMANTIC.acceptable + '08', borderRadius: R, padding: 14, marginTop: Spacing.md,
  },
  tagChip: {
    backgroundColor: SURFACES.card, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
    borderWidth: 1,
  },
  savedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: Spacing.md,
  },
  savedCheck: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
  },
});
