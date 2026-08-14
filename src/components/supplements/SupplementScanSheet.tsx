/**
 * SupplementScanSheet — el escaneo de suplementos, ya en casa (OLA3 · Anexo D).
 *
 * Era el `mode=supplement` de food-scan: un segundo camino que creaba fichas
 * en user_supplements desde el pilar de comida. La tabla tiene un solo dueño,
 * /supplements, así que el escaneo se mudó aquí como hoja de captura, al lado
 * del BhaScanSheet que ya vivía en esta pantalla.
 *
 * Conserva completo lo que hacía: analyzeSupplementPhoto, los 10 contextos de
 * uso, ingredientes activos con biodisponibilidad, excipientes, precauciones,
 * red flags, tags semaforizados y el alta con addSupplementToPlan (dedupe por
 * nombre normalizado: escanear dos veces no crea dos fichas).
 *
 * Compliance S4: esta hoja NO persiste un score. El número que muestra es la
 * lectura informativa del escaneo; el ATP Functional Score de la ficha solo
 * sale del scanner dedicado (BhaScanSheet), que sí evalúa por atributos.
 */
import { useEffect, useState } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, TextInput, Image, Alert, Modal, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeInDown, FadeInUp, SlideInRight,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, withSequence, Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { haptic } from '@/src/utils/haptics';
import { analyzeSupplementPhoto } from '@/src/services/nutrition-service';
import { addSupplementToPlan } from '@/src/services/supplements-plan-service';
import { ScoreRing, getTagColor, scoreToColor } from '@/src/components/nutrition/scan-visuals';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { SURFACES, TEXT_COLORS, SEMANTIC, ATP_BRAND } from '@/src/constants/brand';

// La palanca de costo del escaneo: bajar la foto a 1024px antes de la IA.
// Módulo nativo lazy (gotcha ExpoPrint): sin él, va el base64 del picker.
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

const TEAL = ATP_BRAND.teal;

/** Los 10 contextos de uso que la IA cruza con la formulación. */
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

type Step = 'capture' | 'preview' | 'analyzing' | 'result';

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
  /** Se creó una ficha nueva → el caller recarga su plan. */
  onPlanChanged?: () => void;
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

export function SupplementScanSheet({ visible, userId, onClose, onPlanChanged }: Props) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('capture');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [useCtx, setUseCtx] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [addedToPlan, setAddedToPlan] = useState(false);

  const rotation = useSharedValue(0);
  const rotStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  function reset() {
    setStep('capture');
    setPhotoUri(null); setPhotoBase64(null);
    setProductName(''); setUseCtx(null);
    setResult(null); setError(null);
    setAddingToPlan(false); setAddedToPlan(false);
  }

  function cerrar() {
    reset();
    onClose();
  }

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
      setPhotoBase64(await shrinkBase64ForAI(res.assets[0].uri, res.assets[0].base64 ?? null));
      setStep('preview');
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true, mediaTypes: ['images'] });
    if (!res.canceled && res.assets[0]) {
      haptic.light();
      setPhotoUri(res.assets[0].uri);
      setPhotoBase64(await shrinkBase64ForAI(res.assets[0].uri, res.assets[0].base64 ?? null));
      setStep('preview');
    }
  };

  const analizar = async () => {
    if (!photoBase64) return;
    haptic.medium();
    setStep('analyzing');
    setError(null);
    rotation.value = withRepeat(withTiming(360, { duration: 2200, easing: Easing.linear }), -1);
    try {
      const ctx = useCtx ? SUPPLEMENT_CONTEXT.find(c => c.key === useCtx)?.label : undefined;
      const analysis = await analyzeSupplementPhoto(photoBase64, productName || undefined, ctx);
      haptic.success();
      setResult(analysis);
      setStep('result');
    } catch (err: any) {
      setError(err?.message || 'Error al analizar');
      setStep('preview');
    }
  };

  /** Crea la ficha por la MISMA vía que el scanner del header: dedupe por
   * nombre normalizado, sin score automático (compliance S4). */
  const agregarAlPlan = async () => {
    if (!userId || !result || addingToPlan || addedToPlan) return;
    setAddingToPlan(true);
    const outcome = await addSupplementToPlan(userId, {
      name: String(result.supplement_name ?? productName ?? 'Suplemento'),
      dosage: result.daily_dose ? String(result.daily_dose) : null,
      form: result.form ? String(result.form) : null,
    });
    setAddingToPlan(false);
    if (outcome.status === 'created') {
      setAddedToPlan(true);
      haptic.success();
      onPlanChanged?.();
      Alert.alert(
        'En tu plan',
        'Ficha creada con los datos del escaneo. Edita tomas (AM/PM), cantidades y horario desde tu plan con el lápiz.',
      );
    } else if (outcome.status === 'duplicate') {
      setAddedToPlan(true);
      Alert.alert(
        'Ya está en tu plan',
        `Ya tienes una ficha de ${outcome.existingName}: no se creó un duplicado. Edítala con el lápiz.`,
      );
    } else {
      Alert.alert('No se pudo agregar', 'Revisa tu conexión e intenta de nuevo.');
    }
  };

  const score = result?.quality_score ?? 0;
  const scoreLabel = score >= 90 ? 'Excelente calidad'
    : score >= 70 ? 'Buena calidad'
    : score >= 50 ? 'Aceptable'
    : score >= 30 ? 'Baja calidad' : 'Evitar';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cerrar}>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.headerRow}>
          <EliteText style={s.headerTitle}>Escanear suplemento</EliteText>
          <Pressable onPress={cerrar} hitSlop={12} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={TEXT_COLORS.secondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── CAPTURA ── */}
          {step === 'capture' && (
            <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', paddingTop: Spacing.xl }}>
              <View style={[s.captureRing, { borderColor: TEAL + '18' }]}>
                <View style={[s.captureRingInner, { borderColor: TEAL + '35' }]}>
                  <Ionicons name="scan-outline" size={38} color={TEAL} />
                </View>
              </View>
              <EliteText style={s.heroTitle}>Foto de la etiqueta</EliteText>
              <EliteText variant="caption" style={s.heroSub}>
                Con la lista de ingredientes visible: de ahí salen formas, dosis y excipientes.
              </EliteText>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.xl }}>
                <Pressable onPress={openGallery} hitSlop={10} style={s.galleryBtn}>
                  <Ionicons name="images-outline" size={20} color={TEXT_COLORS.secondary} />
                </Pressable>
                <AnimatedPressable onPress={openCamera} scaleDown={0.92} style={[s.shutterOuter, { borderColor: TEAL }]}>
                  <View style={[s.shutterInner, { backgroundColor: TEAL }]}>
                    <Ionicons name="camera" size={28} color={TEXT_COLORS.onAccent} />
                  </View>
                </AnimatedPressable>
                <View style={{ width: 44 }} />
              </View>
            </Animated.View>
          )}

          {/* ── PREVIEW: nombre + contexto de uso ── */}
          {step === 'preview' && (
            <Animated.View entering={FadeIn.duration(400)}>
              {photoUri ? (
                <View style={s.photoWrap}>
                  <Image source={{ uri: photoUri }} style={s.photo} resizeMode="cover" />
                  <View style={s.photoControls}>
                    <Pressable onPress={openGallery} style={s.photoCtrlBtn}>
                      <Ionicons name="images-outline" size={16} color="#fff" />
                    </Pressable>
                    <Pressable onPress={openCamera} style={s.photoCtrlBtn}>
                      <Ionicons name="camera-reverse-outline" size={16} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={openCamera} style={s.noPhoto}>
                  <Ionicons name="camera-outline" size={36} color={TEXT_COLORS.muted} />
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: 4 }}>
                    Toca para tomar foto
                  </EliteText>
                </Pressable>
              )}

              <EliteText variant="caption" style={[s.sectionLabel, { marginTop: Spacing.lg }]}>
                Nombre del suplemento
              </EliteText>
              <TextInput
                style={s.input}
                value={productName}
                onChangeText={setProductName}
                placeholder="Ej: Omega 3 Nordic Naturals"
                placeholderTextColor={TEXT_COLORS.muted}
                returnKeyType="done"
              />

              <EliteText variant="caption" style={[s.sectionLabel, { marginTop: Spacing.lg }]}>
                ¿Para qué lo usas?
              </EliteText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SUPPLEMENT_CONTEXT.map(c => {
                  const active = useCtx === c.key;
                  return (
                    <AnimatedPressable key={c.key} scaleDown={0.94}
                      onPress={() => { haptic.light(); setUseCtx(active ? null : c.key); }}
                      style={[s.chip, active && { backgroundColor: TEAL + '18', borderColor: TEAL + '50' }]}>
                      <EliteText style={{ fontSize: FontSizes.md }}>{c.emoji}</EliteText>
                      <EliteText style={{
                        fontSize: FontSizes.sm, fontFamily: active ? Fonts.bold : Fonts.regular,
                        color: active ? TEAL : TEXT_COLORS.secondary,
                      }}>
                        {c.label}
                      </EliteText>
                    </AnimatedPressable>
                  );
                })}
              </View>

              {error && (
                <View style={s.errorCard}>
                  <Ionicons name="alert-circle" size={18} color={SEMANTIC.error} />
                  <EliteText style={{ color: SEMANTIC.error, fontSize: FontSizes.md, flex: 1 }}>{error}</EliteText>
                </View>
              )}

              <AnimatedPressable
                onPress={analizar}
                disabled={!photoBase64}
                scaleDown={0.96}
                style={[s.ctaBtn, { marginTop: Spacing.xl, backgroundColor: photoBase64 ? TEAL : SURFACES.cardLight }]}>
                <Ionicons name="sparkles" size={20} color={photoBase64 ? TEXT_COLORS.onAccent : TEXT_COLORS.muted} />
                <EliteText style={{
                  color: photoBase64 ? TEXT_COLORS.onAccent : TEXT_COLORS.muted,
                  fontFamily: Fonts.bold, fontSize: FontSizes.xl,
                }}>
                  Analizar con IA
                </EliteText>
              </AnimatedPressable>

              <Pressable onPress={reset} style={{ alignSelf: 'center', paddingVertical: Spacing.md }}>
                <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.md }}>Empezar de nuevo</EliteText>
              </Pressable>
            </Animated.View>
          )}

          {/* ── ANALIZANDO ── */}
          {step === 'analyzing' && (
            <View style={s.analyzingCenter}>
              <Animated.View style={rotStyle}>
                <Svg width={120} height={120}>
                  <Circle cx={60} cy={60} r={58} stroke={TEAL + '15'} strokeWidth={3} fill="transparent" />
                  <Circle cx={60} cy={60} r={58} stroke={TEAL} strokeWidth={3} fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 58 * 0.3} ${2 * Math.PI * 58 * 0.7}`}
                    strokeLinecap="round" />
                </Svg>
              </Animated.View>
              <View style={{ position: 'absolute' }}>
                <Ionicons name="sparkles" size={32} color={TEAL} />
              </View>
              <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xxl, marginTop: Spacing.xl }}>
                Analizando
              </EliteText>
              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, marginTop: 6, fontSize: FontSizes.md, textAlign: 'center' }}>
                Evaluando calidad y biodisponibilidad
              </EliteText>
              <LoadingDots color={TEAL} />
            </View>
          )}

          {/* ── RESULTADO ── */}
          {step === 'result' && result && (
            <View>
              <Animated.View entering={FadeIn.delay(100).duration(600)} style={{ alignItems: 'center' }}>
                <ScoreRing score={score} />
                <EliteText style={{ color: scoreToColor(score), fontSize: FontSizes.lg, fontFamily: Fonts.semiBold, marginTop: Spacing.sm }}>
                  {scoreLabel}
                </EliteText>
                <EliteText style={{
                  color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xxl,
                  textAlign: 'center', marginTop: Spacing.xs,
                }}>
                  {result.supplement_name ?? 'Suplemento'}
                </EliteText>
              </Animated.View>

              {result.active_ingredients?.length > 0 && (
                <Animated.View entering={FadeInDown.delay(400).springify().damping(18)}>
                  <EliteText variant="caption" style={[s.sectionLabel, { color: TEAL, marginTop: Spacing.xl }]}>
                    Ingredientes activos
                  </EliteText>
                  {result.active_ingredients.map((ing: any, i: number) => (
                    <Animated.View key={i} entering={SlideInRight.delay(500 + i * 80).springify().damping(18)}>
                      <View style={s.ingredientRow}>
                        <View style={{ flex: 1 }}>
                          <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.md }}>
                            {ing.name}
                          </EliteText>
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 3 }}>
                            {ing.form && (
                              <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.sm }}>
                                {ing.form}
                              </EliteText>
                            )}
                            {ing.bioavailability && (
                              <EliteText variant="caption" style={{
                                color: ing.bioavailability === 'alta' ? ATP_BRAND.lime : ing.bioavailability === 'media' ? SEMANTIC.warning : SEMANTIC.error,
                                fontSize: FontSizes.sm, fontFamily: Fonts.bold,
                              }}>
                                Bio: {ing.bioavailability}
                              </EliteText>
                            )}
                          </View>
                        </View>
                        <EliteText style={{ color: TEAL, fontFamily: Fonts.bold, fontSize: FontSizes.md }}>
                          {ing.amount}
                        </EliteText>
                      </View>
                    </Animated.View>
                  ))}
                </Animated.View>
              )}

              {result.inactive_ingredients?.length > 0 && (
                <Animated.View entering={FadeInDown.delay(700).springify()}>
                  <EliteText variant="caption" style={[s.sectionLabel, { color: TEXT_COLORS.muted, marginTop: Spacing.lg }]}>
                    Excipientes
                  </EliteText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {result.inactive_ingredients.map((ing: string, i: number) => (
                      <View key={i} style={s.excipientChip}>
                        <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm }}>{ing}</EliteText>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              )}

              {result.interactions && result.interactions !== 'null' && (
                <Animated.View entering={FadeInDown.delay(800).springify()}>
                  <View style={[s.card, { borderLeftColor: SEMANTIC.warning, borderLeftWidth: 3, marginTop: Spacing.md }]}>
                    <EliteText variant="caption" style={{ color: SEMANTIC.warning, fontFamily: Fonts.bold, fontSize: FontSizes.sm, letterSpacing: 1 }}>
                      PRECAUCIONES
                    </EliteText>
                    <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.md, marginTop: 4 }}>
                      {result.interactions}
                    </EliteText>
                  </View>
                </Animated.View>
              )}

              {result.feedback && (
                <Animated.View entering={FadeInDown.delay(900).springify().damping(18)}>
                  <View style={[s.card, { borderLeftColor: TEAL, borderLeftWidth: 3, marginTop: Spacing.lg }]}>
                    <EliteText style={{ color: TEXT_COLORS.primary, fontSize: FontSizes.lg, lineHeight: 22 }}>
                      {result.feedback}
                    </EliteText>
                  </View>
                </Animated.View>
              )}

              {result.red_flags?.length > 0 && (
                <Animated.View entering={FadeInDown.delay(1000).springify()}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md }}>
                    {result.red_flags.map((f: string, i: number) => (
                      <View key={i} style={s.flagChip}>
                        <EliteText style={{ color: SEMANTIC.error, fontSize: FontSizes.sm }}>{'⚠️'} {f}</EliteText>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              )}

              {(result.suggestions || result.better_alternative) && (
                <Animated.View entering={FadeInDown.delay(1050).springify()}>
                  <View style={s.tipCard}>
                    <Ionicons name="bulb-outline" size={18} color={ATP_BRAND.teal2} />
                    <EliteText style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.md, flex: 1, lineHeight: 20 }}>
                      {result.suggestions || result.better_alternative}
                    </EliteText>
                  </View>
                </Animated.View>
              )}

              {result.tags?.length > 0 && (
                <Animated.View entering={FadeInDown.delay(1150).springify()}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.md }}>
                    {result.tags.map((tag: string, i: number) => {
                      const tc = getTagColor(tag);
                      return (
                        <View key={i} style={[s.tagChip, { backgroundColor: tc.bg, borderColor: tc.text + '25' }]}>
                          <EliteText variant="caption" style={{ color: tc.text, fontSize: FontSizes.sm }}>
                            {tag.replace(/_/g, ' ')}
                          </EliteText>
                        </View>
                      );
                    })}
                  </View>
                </Animated.View>
              )}

              <Animated.View entering={FadeInUp.delay(1250).springify().damping(18)}>
                <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
                  {!addedToPlan ? (
                    <AnimatedPressable onPress={agregarAlPlan} disabled={addingToPlan} scaleDown={0.96}
                      style={[s.ctaBtn, { backgroundColor: TEAL }]}>
                      <Ionicons name="add-circle" size={20} color={TEXT_COLORS.onAccent} />
                      <EliteText style={{ color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                        {addingToPlan ? 'Agregando...' : 'Agregar a mi plan'}
                      </EliteText>
                    </AnimatedPressable>
                  ) : (
                    <View style={s.savedRow}>
                      <View style={s.savedCheck}>
                        <Ionicons name="checkmark" size={20} color={TEXT_COLORS.onAccent} />
                      </View>
                      <EliteText style={{ color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                        En tu plan
                      </EliteText>
                    </View>
                  )}

                  <AnimatedPressable onPress={reset} scaleDown={0.96} style={s.outlineBtn}>
                    <Ionicons name="camera-outline" size={18} color={TEAL} />
                    <EliteText style={{ color: TEAL, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                      Escanear otro
                    </EliteText>
                  </AnimatedPressable>

                  <Pressable onPress={cerrar} style={{ alignSelf: 'center', paddingVertical: Spacing.md }}>
                    <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.md }}>Volver a mi plan</EliteText>
                  </Pressable>
                </View>
                <MedicalDisclaimer feature="supplements" />
              </Animated.View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  headerTitle: { color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xl },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SURFACES.card,
  },
  content: { paddingHorizontal: Spacing.lg },

  captureRing: {
    width: 120, height: 120, borderRadius: Radius.pill, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  captureRingInner: {
    width: 92, height: 92, borderRadius: Radius.pill, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: {
    color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xxl,
    marginTop: Spacing.lg, textAlign: 'center',
  },
  heroSub: {
    color: TEXT_COLORS.muted, fontSize: FontSizes.md, textAlign: 'center',
    marginTop: 6, lineHeight: 20, paddingHorizontal: Spacing.md,
  },
  galleryBtn: {
    width: 44, height: 44, borderRadius: Radius.lg, backgroundColor: SURFACES.card,
    borderWidth: 1, borderColor: SURFACES.border, alignItems: 'center', justifyContent: 'center',
  },
  shutterOuter: {
    width: 80, height: 80, borderRadius: Radius.pill, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: {
    width: 64, height: 64, borderRadius: Radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },

  photoWrap: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: SURFACES.card, marginTop: Spacing.md },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  photoControls: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 8 },
  photoCtrlBtn: {
    width: 44, height: 44, borderRadius: Radius.lg, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(0,0,0,0.45)' : 'rgba(30,30,30,0.85)',
  },
  noPhoto: {
    height: 200, borderRadius: Radius.lg, backgroundColor: SURFACES.card, marginTop: Spacing.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SURFACES.border,
    borderStyle: 'dashed',
  },
  sectionLabel: {
    color: TEXT_COLORS.secondary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold,
    marginBottom: 10, letterSpacing: 0.5,
  },
  input: {
    backgroundColor: SURFACES.card, borderRadius: Radius.card, borderWidth: 1, borderColor: SURFACES.border,
    paddingHorizontal: 16, paddingVertical: 14, color: TEXT_COLORS.primary,
    fontSize: FontSizes.lg, fontFamily: Fonts.regular,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.card,
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
  analyzingCenter: {
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl, minHeight: 420,
  },
  card: {
    backgroundColor: SURFACES.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: SURFACES.border,
    padding: 16,
  },
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACES.card, borderRadius: Radius.md, borderWidth: 1, borderColor: SURFACES.border,
    padding: 14, marginBottom: 8,
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
