/**
 * Leer etiqueta — registro por código de barras (MB-28B · Pieza 1).
 *
 * MB-30B P3: llegó el visor en vivo (expo-camera). El lector alimenta
 * EXACTAMENTE el mismo flujo que el teclado: onBarcodeScanned → handleLookup,
 * cero rutas nuevas. La captura manual SE QUEDA como camino primario (en
 * México la cobertura de la base es parcial: teclear no es plan B). El
 * módulo va con lazy require (doctrina ExpoPrint): en un binario viejo sin
 * expo-camera el botón del visor simplemente no existe y la pantalla sigue
 * completa.
 *
 * Contratos que esta pantalla respeta (candados de registro-comida.test.ts):
 *  - Escribe SOLO vía saveFoodLog (ruta única a food_logs).
 *  - Lee useNutritionMode y gatea con él: SIMPLE registra y ya; COMPLETO
 *    muestra y deja ajustar los números.
 *  - Tipo de comida por hora con defaultMealTypeByHour (helper compartido).
 *
 * Doctrina ATP: la información del producto se presenta SIN juicio moral.
 * Nada de semáforos ni puntuaciones: el valor es la lista de ingredientes.
 * Código no encontrado o sin red NUNCA es callejón sin salida: siempre se
 * puede registrar a mano, con el código guardado en el registro.
 */
import { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { saveFoodLog } from '@/src/services/food-log-service';
import { defaultMealTypeByHour } from '@/src/services/meal-times-core';
import { useNutritionMode } from '@/src/hooks/useNutritionMode';
import {
  normalizeBarcode, lookupBarcode, scalePer100g,
  type BarcodeProduct,
} from '@/src/services/barcode-product-service';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS, SEMANTIC, ATP_BRAND } from '@/src/constants/brand';

const BLUE = CATEGORY_COLORS.nutrition;

type Step = 'entry' | 'loading' | 'found' | 'not_found' | 'network_error' | 'saved';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Desayuno' },
  { key: 'snack_am', label: 'Snack AM' },
  { key: 'lunch', label: 'Comida' },
  { key: 'snack_pm', label: 'Snack PM' },
  { key: 'dinner', label: 'Cena' },
];

function toNum(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ── MB-30B P3 · visor en vivo ───────────────────────────────────────────────
// Lazy require SIEMPRE (doctrina ExpoPrint): en un binario sin expo-camera
// esto cae a null, el botón del visor no se dibuja y la captura manual —
// que es el camino primario — queda intacta.
type CameraModule = typeof import('expo-camera');
let cameraModuleCache: CameraModule | null | undefined;
function getCameraModule(): CameraModule | null {
  if (cameraModuleCache !== undefined) return cameraModuleCache;
  try {
    cameraModuleCache = require('expo-camera') as CameraModule;
  } catch {
    cameraModuleCache = null;
  }
  return cameraModuleCache;
}

export default function FoodBarcodeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const { mode: nutritionMode } = useNutritionMode();

  const [step, setStep] = useState<Step>('entry');
  const [codeInput, setCodeInput] = useState('');
  // MB-30B P3: visor de cámara (solo si el binario trae expo-camera).
  const cameraModule = getCameraModule();
  const [cameraOpen, setCameraOpen] = useState(false);
  const scannedOnce = useRef(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [mealType, setMealType] = useState(defaultMealTypeByHour());
  const [saving, setSaving] = useState(false);

  // COMPLETO: la porción en gramos ajusta los números en vivo.
  const [gramsInput, setGramsInput] = useState('');

  // Captura manual (código no encontrado o sin red).
  const [manualDesc, setManualDesc] = useState('');
  const [manualKcal, setManualKcal] = useState('');
  const [manualProt, setManualProt] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  const defaultGrams = product?.servingGrams ?? 100;
  const grams = toNum(gramsInput) ?? defaultGrams;
  const macros = useMemo(
    () => (product ? scalePer100g(product.per100g, grams) : null),
    [product, grams],
  );
  const hasMacros = !!macros && (macros.kcal !== null || macros.proteinG !== null);

  // MB-30B P3: `raw` llega del visor de cámara; sin él, se lee el input
  // tecleado. MISMO flujo a partir de aquí — el visor solo alimenta el
  // código leído (guard typeof: los onPress/onSubmitEditing pasan eventos).
  async function handleLookup(raw?: unknown) {
    const source = typeof raw === 'string' ? raw : codeInput;
    if (typeof raw === 'string') setCodeInput(raw); // "Reintentar" sigue funcionando
    const normalized = normalizeBarcode(source);
    if (!normalized) {
      setInputError('Un código de barras tiene entre 8 y 14 dígitos.');
      return;
    }
    haptic.medium();
    setInputError(null);
    setBarcode(normalized);
    setStep('loading');
    const result = await lookupBarcode(normalized);
    if (result.status === 'found') {
      haptic.success();
      setProduct(result.product);
      setGramsInput('');
      setStep('found');
    } else if (result.status === 'not_found') {
      haptic.light();
      setStep('not_found');
    } else {
      haptic.error();
      setStep('network_error');
    }
  }

  // MB-30B P3: abrir el visor pide el permiso de cámara EN ese momento.
  // Denegado no es callejón: el teclado sigue ahí y se dice con honestidad.
  async function openScanner() {
    const cam = getCameraModule();
    if (!cam) return;
    haptic.medium();
    const { status } = await cam.Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setInputError('Sin permiso de cámara no hay visor, pero teclear el número funciona igual.');
      return;
    }
    scannedOnce.current = false;
    setInputError(null);
    setCameraOpen(true);
  }

  // El visor alimenta handleLookup con el código leído: MISMO camino que el
  // teclado (candado en tests). onBarcodeScanned dispara en ráfaga → guard.
  function onBarcodeRead(data: string) {
    if (scannedOnce.current) return;
    scannedOnce.current = true;
    setCameraOpen(false);
    haptic.success();
    handleLookup(data);
  }

  async function saveProduct() {
    if (!product || saving) return;
    setSaving(true);
    const brandExtra = product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
      ? ` ${product.brand}` : '';
    const result = await saveFoodLog({
      userId: user?.id,
      mealType,
      description: `${product.name}${brandExtra}${hasMacros ? ` (${grams} g)` : ''}`,
      source: 'barcode',
      wasEdited: nutritionMode === 'complete' && !!gramsInput,
      mealTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      calories: macros?.kcal ?? null,
      proteinG: macros?.proteinG ?? null,
      carbsG: macros?.carbsG ?? null,
      fatG: macros?.fatG ?? null,
      aiAnalysis: {
        barcode: product.barcode,
        source: 'openfoodfacts',
        product_name: product.name,
        brand: product.brand,
        ingredients_text: product.ingredientsText,
        serving_size: product.servingSize,
        portion_g: grams,
        per_100g: product.per100g,
      },
      extras: macros?.fiberG != null ? { fiber_g: macros.fiberG } : undefined,
    });
    setSaving(false);
    if (!result.ok) {
      haptic.error();
      setInputError('No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
      return;
    }
    haptic.success();
    analytics.track(ATP_EVENTS.FOOD_LOGGED, { source: 'barcode', meal_type: mealType, found: true });
    setStep('saved');
  }

  async function saveManual() {
    if (!manualDesc.trim() || saving) return;
    setSaving(true);
    const result = await saveFoodLog({
      userId: user?.id,
      mealType,
      description: manualDesc.trim(),
      source: 'barcode',
      mealTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      calories: nutritionMode === 'complete' ? toNum(manualKcal) : null,
      proteinG: nutritionMode === 'complete' ? toNum(manualProt) : null,
      carbsG: nutritionMode === 'complete' ? toNum(manualCarbs) : null,
      fatG: nutritionMode === 'complete' ? toNum(manualFat) : null,
      // El código queda guardado por si la persona quiere completarlo después.
      aiAnalysis: barcode ? { barcode, source: 'openfoodfacts', lookup: 'not_found' } : null,
    });
    setSaving(false);
    if (!result.ok) {
      haptic.error();
      setInputError('No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
      return;
    }
    haptic.success();
    analytics.track(ATP_EVENTS.FOOD_LOGGED, { source: 'barcode', meal_type: mealType, found: false });
    setStep('saved');
  }

  function resetAll() {
    haptic.light();
    setStep('entry');
    setCodeInput('');
    setBarcode(null);
    setProduct(null);
    setInputError(null);
    setGramsInput('');
    setManualDesc(''); setManualKcal(''); setManualProt(''); setManualCarbs(''); setManualFat('');
    setMealType(defaultMealTypeByHour());
  }

  const mealChips = (
    <View style={{ marginTop: Spacing.lg }}>
      <EliteText variant="caption" style={s.sectionLabel}>Tipo de comida</EliteText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {MEAL_TYPES.map((t) => {
          const active = mealType === t.key;
          return (
            <AnimatedPressable key={t.key} scaleDown={0.94}
              onPress={() => { haptic.light(); setMealType(t.key); }}
              style={[s.mealChip, active && { backgroundColor: BLUE + '18', borderColor: BLUE + '50' }]}>
              <EliteText style={{
                fontSize: FontSizes.md,
                fontFamily: active ? Fonts.bold : Fonts.regular,
                color: active ? BLUE : TEXT_COLORS.secondary,
              }}>
                {t.label}
              </EliteText>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const manualForm = (
    <Animated.View entering={FadeInUp.delay(150).springify().damping(18)}>
      <View style={[s.card, { marginTop: Spacing.lg }]}>
        <EliteText variant="caption" style={s.sectionLabel}>Registrar a mano</EliteText>
        <TextInput
          style={s.input}
          value={manualDesc}
          onChangeText={setManualDesc}
          placeholder="Qué es este producto (ej: yogurt griego natural)"
          placeholderTextColor={TEXT_COLORS.muted}
          returnKeyType="done"
        />
        {nutritionMode === 'complete' && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.sm }}>
            {([
              ['kcal', manualKcal, setManualKcal],
              ['prot g', manualProt, setManualProt],
              ['carbs g', manualCarbs, setManualCarbs],
              ['grasa g', manualFat, setManualFat],
            ] as const).map(([ph, val, set]) => (
              <TextInput
                key={ph}
                style={[s.input, { flex: 1, marginTop: 0, textAlign: 'center' }]}
                value={val}
                onChangeText={set}
                placeholder={ph}
                placeholderTextColor={TEXT_COLORS.muted}
                keyboardType="decimal-pad"
              />
            ))}
          </View>
        )}
      </View>
      {mealChips}
      <AnimatedPressable
        onPress={saveManual}
        disabled={!manualDesc.trim() || saving}
        scaleDown={0.96}
        style={[s.ctaBtn, { marginTop: Spacing.xl, backgroundColor: manualDesc.trim() ? BLUE : SURFACES.cardLight }]}>
        <Ionicons name="checkmark-circle" size={20}
          color={manualDesc.trim() ? TEXT_COLORS.onAccent : TEXT_COLORS.muted} />
        <EliteText style={{
          color: manualDesc.trim() ? TEXT_COLORS.onAccent : TEXT_COLORS.muted,
          fontFamily: Fonts.bold, fontSize: FontSizes.xl,
        }}>
          {saving ? 'Guardando...' : 'Registrar'}
        </EliteText>
      </AnimatedPressable>
    </Animated.View>
  );

  return (
    <Screen>
      <PillarHeader pillar="nutrition" title="Leer etiqueta" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled">

        {/* ── ENTRADA ── */}
        {step === 'entry' && (
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={s.heroIconWrap}>
              <View style={s.heroIcon}>
                <Ionicons name="barcode-outline" size={40} color={BLUE} />
              </View>
            </View>
            <EliteText style={s.heroTitle}>El número bajo las barras</EliteText>
            <EliteText variant="caption" style={s.heroSub}>
              Escríbelo y buscamos el producto: ingredientes y datos entran a tu registro sin teclear.
            </EliteText>

            <View style={s.codeRow}>
              <TextInput
                style={s.codeInput}
                value={codeInput}
                onChangeText={(t) => { setCodeInput(t); setInputError(null); }}
                placeholder="7501055300075"
                placeholderTextColor={TEXT_COLORS.muted}
                keyboardType="number-pad"
                maxLength={14}
                returnKeyType="search"
                onSubmitEditing={handleLookup}
              />
              <AnimatedPressable onPress={handleLookup} scaleDown={0.92}
                style={[s.codeGo, { backgroundColor: codeInput.trim() ? BLUE : SURFACES.cardLight }]}>
                <Ionicons name="search" size={20}
                  color={codeInput.trim() ? TEXT_COLORS.onAccent : TEXT_COLORS.muted} />
              </AnimatedPressable>
            </View>

            {inputError && (
              <View style={s.errorCard}>
                <Ionicons name="alert-circle" size={18} color={SEMANTIC.error} />
                <EliteText style={{ color: SEMANTIC.error, fontSize: FontSizes.md, flex: 1 }}>{inputError}</EliteText>
              </View>
            )}

            {/* MB-30B P3: visor en vivo — secundario; teclear es el camino
                primario. En binarios sin expo-camera nada de esto existe. */}
            {cameraModule && !cameraOpen && (
              <AnimatedPressable onPress={openScanner} scaleDown={0.96} style={s.scanBtn}>
                <Ionicons name="camera-outline" size={18} color={BLUE} />
                <EliteText style={s.scanBtnText}>Apuntar la cámara al código</EliteText>
              </AnimatedPressable>
            )}
            {cameraModule && cameraOpen && (
              <Animated.View entering={FadeIn.duration(300)} style={s.cameraWrap}>
                <cameraModule.CameraView
                  style={s.cameraView}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
                  }}
                  onBarcodeScanned={({ data }) => onBarcodeRead(data)}
                />
                <View style={s.cameraHintRow}>
                  <EliteText variant="caption" style={s.cameraHint}>
                    Centra las barras; el número se lee solo.
                  </EliteText>
                  <Pressable onPress={() => setCameraOpen(false)} hitSlop={8}>
                    <EliteText style={s.cameraCancel}>Cancelar</EliteText>
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* ── BUSCANDO ── */}
        {step === 'loading' && (
          <Animated.View entering={FadeIn.duration(300)} style={s.loadingWrap}>
            <ActivityIndicator size="large" color={BLUE} />
            <EliteText style={{ color: TEXT_COLORS.secondary, marginTop: Spacing.md, fontSize: FontSizes.lg }}>
              Buscando {barcode}...
            </EliteText>
          </Animated.View>
        )}

        {/* ── ENCONTRADO ── */}
        {step === 'found' && product && (
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            <View style={s.card}>
              <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
                {product.imageUrl ? (
                  <Image source={{ uri: product.imageUrl }} style={s.productImg} resizeMode="contain" />
                ) : (
                  <View style={[s.productImg, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="cube-outline" size={28} color={TEXT_COLORS.muted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                    {product.name}
                  </EliteText>
                  {product.brand && (
                    <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.md, marginTop: 2 }}>
                      {product.brand}
                    </EliteText>
                  )}
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.sm, marginTop: 2 }}>
                    {product.barcode}
                  </EliteText>
                </View>
              </View>
            </View>

            {/* La lista de ingredientes es el valor: qué trae de verdad. */}
            {product.ingredientsText ? (
              <View style={[s.card, { marginTop: Spacing.sm }]}>
                <EliteText variant="caption" style={s.sectionLabel}>Lo que trae</EliteText>
                <EliteText style={{ color: TEXT_COLORS.primary, fontSize: FontSizes.md, lineHeight: 21 }}>
                  {product.ingredientsText}
                </EliteText>
              </View>
            ) : (
              <View style={[s.card, { marginTop: Spacing.sm }]}>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.sm }}>
                  La base no tiene la lista de ingredientes de este producto.
                </EliteText>
              </View>
            )}

            {/* Números por porción. En COMPLETO la porción se ajusta. */}
            {hasMacros && macros ? (
              <View style={[s.card, { marginTop: Spacing.sm }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <EliteText variant="caption" style={[s.sectionLabel, { marginBottom: 0 }]}>
                    Por {grams} g
                  </EliteText>
                  {nutritionMode === 'complete' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TextInput
                        style={s.gramsInput}
                        value={gramsInput}
                        onChangeText={setGramsInput}
                        placeholder={String(defaultGrams)}
                        placeholderTextColor={TEXT_COLORS.muted}
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm }}>g</EliteText>
                    </View>
                  )}
                </View>
                <View style={s.macroRow}>
                  {([
                    ['kcal', macros.kcal, ''],
                    ['prot', macros.proteinG, 'g'],
                    ['carbs', macros.carbsG, 'g'],
                    ['grasa', macros.fatG, 'g'],
                  ] as const).map(([label, value, unit]) => (
                    <View key={label} style={s.macroItem}>
                      <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.lg }}>
                        {value ?? '—'}{value !== null ? unit : ''}
                      </EliteText>
                      <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs, marginTop: 1 }}>
                        {label}
                      </EliteText>
                    </View>
                  ))}
                </View>
                {product.servingSize && (
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.xs, marginTop: 6 }}>
                    Porción del empaque: {product.servingSize}
                  </EliteText>
                )}
              </View>
            ) : (
              <View style={[s.card, { marginTop: Spacing.sm }]}>
                <EliteText variant="caption" style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.sm }}>
                  Sin datos de macros en la base. Se registra el producto y puedes completar después.
                </EliteText>
              </View>
            )}

            {mealChips}

            {inputError && (
              <View style={s.errorCard}>
                <Ionicons name="alert-circle" size={18} color={SEMANTIC.error} />
                <EliteText style={{ color: SEMANTIC.error, fontSize: FontSizes.md, flex: 1 }}>{inputError}</EliteText>
              </View>
            )}

            <AnimatedPressable onPress={saveProduct} disabled={saving} scaleDown={0.96}
              style={[s.ctaBtn, { marginTop: Spacing.xl, backgroundColor: BLUE }]}>
              {/* Sin reloj de arena: ese glifo dibuja la función Ayuno y el
                  ratchet de iconos lo veta; el texto ya dice Guardando. */}
              <Ionicons name="checkmark-circle" size={20} color={TEXT_COLORS.onAccent} />
              <EliteText style={{ color: TEXT_COLORS.onAccent, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                {saving ? 'Guardando...' : 'Registrar'}
              </EliteText>
            </AnimatedPressable>

            <Pressable onPress={resetAll} style={{ alignSelf: 'center', paddingVertical: Spacing.md }}>
              <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.md }}>Leer otro código</EliteText>
            </Pressable>

            <MedicalDisclaimer feature="nutrition" />
          </Animated.View>
        )}

        {/* ── NO ENCONTRADO → captura manual, nunca callejón sin salida ── */}
        {step === 'not_found' && (
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            <View style={s.card}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Ionicons name="help-circle-outline" size={22} color={ATP_BRAND.amber} />
                <View style={{ flex: 1 }}>
                  <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                    Este producto aún no está en la base
                  </EliteText>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginTop: 2 }}>
                    El código {barcode} queda guardado con tu registro.
                  </EliteText>
                </View>
              </View>
            </View>
            {manualForm}
            <Pressable onPress={resetAll} style={{ alignSelf: 'center', paddingVertical: Spacing.md }}>
              <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.md }}>Intentar con otro código</EliteText>
            </Pressable>
          </Animated.View>
        )}

        {/* ── SIN RED → honesto: reintentar o registrar a mano ── */}
        {step === 'network_error' && (
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            <View style={s.card}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Ionicons name="cloud-offline-outline" size={22} color={SEMANTIC.warning} />
                <View style={{ flex: 1 }}>
                  <EliteText style={{ color: TEXT_COLORS.primary, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                    Sin conexión con la base de productos
                  </EliteText>
                  <EliteText variant="caption" style={{ color: TEXT_COLORS.secondary, fontSize: FontSizes.sm, marginTop: 2 }}>
                    Tu comida se puede registrar igual, a mano.
                  </EliteText>
                </View>
              </View>
              <AnimatedPressable onPress={handleLookup} scaleDown={0.96}
                style={[s.outlineBtn, { marginTop: Spacing.md, borderColor: BLUE + '50' }]}>
                <Ionicons name="refresh" size={18} color={BLUE} />
                <EliteText style={{ color: BLUE, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                  Reintentar
                </EliteText>
              </AnimatedPressable>
            </View>
            {manualForm}
            <Pressable onPress={resetAll} style={{ alignSelf: 'center', paddingVertical: Spacing.md }}>
              <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.md }}>Empezar de nuevo</EliteText>
            </Pressable>
          </Animated.View>
        )}

        {/* ── GUARDADO ── */}
        {step === 'saved' && (
          <Animated.View entering={FadeIn.springify()} style={s.savedWrap}>
            <View style={s.savedCheck}>
              <Ionicons name="checkmark" size={26} color={TEXT_COLORS.onAccent} />
            </View>
            <EliteText style={{ color: ATP_BRAND.lime, fontFamily: Fonts.bold, fontSize: FontSizes.xxl, marginTop: Spacing.md }}>
              Registrado
            </EliteText>
            <AnimatedPressable onPress={resetAll} scaleDown={0.96} style={[s.outlineBtn, { marginTop: Spacing.xl, alignSelf: 'stretch' }]}>
              <Ionicons name="barcode-outline" size={18} color={BLUE} />
              <EliteText style={{ color: BLUE, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                Leer otro producto
              </EliteText>
            </AnimatedPressable>
            <Pressable onPress={() => router.back()} style={{ alignSelf: 'center', paddingVertical: Spacing.md }}>
              <EliteText style={{ color: TEXT_COLORS.muted, fontSize: FontSizes.md }}>Volver</EliteText>
            </Pressable>
          </Animated.View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md },

  heroIconWrap: { alignItems: 'center', marginTop: Spacing.xl },
  heroIcon: {
    width: 96, height: 96, borderRadius: Radius.pill, borderWidth: 1, borderColor: BLUE + '35',
    alignItems: 'center', justifyContent: 'center', backgroundColor: BLUE + '0C',
  },
  heroTitle: {
    color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xxl,
    textAlign: 'center', marginTop: Spacing.lg,
  },
  heroSub: {
    color: TEXT_COLORS.secondary, fontSize: FontSizes.md, textAlign: 'center',
    marginTop: 6, lineHeight: 20, paddingHorizontal: Spacing.lg,
  },

  codeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl, alignItems: 'center' },
  codeInput: {
    flex: 1, backgroundColor: SURFACES.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: SURFACES.border,
    paddingHorizontal: 16, paddingVertical: 14, color: TEXT_COLORS.primary,
    fontSize: FontSizes.xl, fontFamily: Fonts.semiBold, letterSpacing: 2, textAlign: 'center',
  },
  codeGo: {
    width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
  },

  loadingWrap: { alignItems: 'center', paddingVertical: Spacing.xxl * 2 },

  card: {
    backgroundColor: SURFACES.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: SURFACES.border, padding: 16,
  },
  sectionLabel: {
    color: TEXT_COLORS.secondary, fontSize: FontSizes.md, fontFamily: Fonts.semiBold,
    marginBottom: 10, letterSpacing: 0.5,
  },
  productImg: {
    width: 64, height: 64, borderRadius: Radius.md, backgroundColor: SURFACES.cardLight,
  },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.md },
  macroItem: { alignItems: 'center' },
  gramsInput: {
    backgroundColor: SURFACES.cardLight, borderRadius: Radius.sm, minWidth: 56,
    paddingHorizontal: 10, paddingVertical: 6, color: TEXT_COLORS.primary,
    fontSize: FontSizes.md, fontFamily: Fonts.semiBold, textAlign: 'center',
  },
  mealChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.card,
    backgroundColor: SURFACES.card, borderWidth: 1, borderColor: SURFACES.border,
  },
  input: {
    backgroundColor: SURFACES.cardLight, borderRadius: Radius.card,
    paddingHorizontal: 14, paddingVertical: 12, color: TEXT_COLORS.primary,
    fontSize: FontSizes.md, fontFamily: Fonts.regular,
  },
  errorCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: SEMANTIC.error + '10', borderRadius: Radius.card, padding: 14, marginTop: Spacing.md,
  },
  // MB-30B P3: visor en vivo
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: BLUE + '55',
    marginTop: Spacing.md,
  },
  scanBtnText: { color: BLUE, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  cameraWrap: {
    marginTop: Spacing.md, borderRadius: Radius.card, overflow: 'hidden',
    backgroundColor: SURFACES.cardLight, borderWidth: 1, borderColor: SURFACES.border,
  },
  cameraView: { height: 260 },
  cameraHintRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  cameraHint: { color: TEXT_COLORS.secondary, flex: 1 },
  cameraCancel: { color: BLUE, fontFamily: Fonts.semiBold, fontSize: FontSizes.md },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: Radius.md,
  },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: SURFACES.border,
  },
  savedWrap: { alignItems: 'center', paddingTop: Spacing.xxl * 2, paddingHorizontal: Spacing.lg },
  savedCheck: {
    width: 48, height: 48, borderRadius: Radius.pill, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
  },
});
