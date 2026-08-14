/**
 * OLA3 · Sensor CÓDIGO — el cuerpo de food-barcode, ya sin carcasa propia.
 *
 * Conserva entero lo que el anexo pide: lookup OpenFoodFacts, scalePer100g,
 * visor en vivo con lazy require de expo-camera, captura manual con el código
 * guardado, y los estados not_found / network_error que NUNCA son callejón
 * sin salida.
 *
 * Lo que perdió (porque ahora es de la carcasa): el header, los chips de tipo
 * de comida y la hora. El tipo llega por prop y ya viene preseleccionado con
 * getCurrentMeal ?? defaultMealTypeByHour.
 *
 * Doctrina ATP: la información del producto se presenta SIN juicio moral.
 * Nada de semáforos: el valor es la lista de ingredientes.
 */
import { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { saveFoodLog } from '@/src/services/food-log-service';
import { updateFrequentFood } from '@/src/services/frequent-foods-service';
import { maybeGeneratePostMealInsight } from '@/src/services/argos-nutrition-insights';
import { useNutritionMode } from '@/src/hooks/useNutritionMode';
import {
  normalizeBarcode, lookupBarcode, scalePer100g,
  type BarcodeProduct,
} from '@/src/services/barcode-product-service';
import { useAnalytics, ATP_EVENTS } from '@/src/lib/analytics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS, SURFACES, TEXT_COLORS, SEMANTIC, ATP_BRAND } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import type { SensorPanelProps } from './types';

const BLUE = CATEGORY_COLORS.nutrition;

type Step = 'entry' | 'loading' | 'found' | 'not_found' | 'network_error' | 'saved';

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

export function BarcodeSensor({ mealType, mealTime, onSaved }: SensorPanelProps) {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const { mode: nutritionMode } = useNutritionMode();
  const { tokens: t } = useAppTheme();
  const cardT = { backgroundColor: t.card, borderColor: t.borde };
  const secLabel = { color: t.textoSecundario };

  const [step, setStep] = useState<Step>('entry');
  const [codeInput, setCodeInput] = useState('');
  const cameraModule = getCameraModule();
  const [cameraOpen, setCameraOpen] = useState(false);
  const scannedOnce = useRef(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
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

  // `raw` llega del visor de cámara; sin él, se lee el input tecleado. MISMO
  // flujo a partir de aquí (guard typeof: los onPress pasan eventos).
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

  // Abrir el visor pide el permiso de cámara EN ese momento. Denegado no es
  // callejón: el teclado sigue ahí y se dice con honestidad.
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
  // teclado. onBarcodeScanned dispara en ráfaga → guard.
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
    const desc = `${product.name}${brandExtra}${hasMacros ? ` (${grams} g)` : ''}`;
    const result = await saveFoodLog({
      userId: user?.id,
      mealType,
      description: desc,
      source: 'barcode',
      wasEdited: nutritionMode === 'complete' && !!gramsInput,
      mealTime,
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
    // OLA3: los frecuentes y el insight ya no dependen del sensor — el código
    // de barras alimenta la zona "de un toque" igual que texto y foto.
    if (user?.id && hasMacros) {
      updateFrequentFood(user.id, mealType, {
        description: desc,
        calories: macros?.kcal ?? 0,
        protein_g: macros?.proteinG ?? 0,
        carbs_g: macros?.carbsG ?? 0,
        fat_g: macros?.fatG ?? 0,
        items: [],
      });
    }
    if (user?.id) void maybeGeneratePostMealInsight(user.id, desc);
    analytics.track(ATP_EVENTS.FOOD_LOGGED, { source: 'barcode', meal_type: mealType, found: true });
    onSaved();
    setStep('saved');
  }

  async function saveManual() {
    if (!manualDesc.trim() || saving) return;
    setSaving(true);
    const desc = manualDesc.trim();
    const result = await saveFoodLog({
      userId: user?.id,
      mealType,
      description: desc,
      source: 'barcode',
      mealTime,
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
    if (user?.id) void maybeGeneratePostMealInsight(user.id, desc);
    analytics.track(ATP_EVENTS.FOOD_LOGGED, { source: 'barcode', meal_type: mealType, found: false });
    onSaved();
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
  }

  const manualForm = (
    <Animated.View entering={FadeInUp.delay(150).springify().damping(18)}>
      <View style={[s.card, cardT, { marginTop: Spacing.lg }]}>
        <EliteText variant="caption" style={[s.sectionLabel, secLabel]}>Registrar a mano</EliteText>
        <TextInput
          style={[s.input, { backgroundColor: t.flotante, color: t.texto }]}
          value={manualDesc}
          onChangeText={setManualDesc}
          placeholder="Qué es este producto (ej: yogurt griego natural)"
          placeholderTextColor={t.textoTenue}
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
                style={[s.input, { backgroundColor: t.flotante, color: t.texto, flex: 1, marginTop: 0, textAlign: 'center' }]}
                value={val}
                onChangeText={set}
                placeholder={ph}
                placeholderTextColor={t.textoTenue}
                keyboardType="decimal-pad"
              />
            ))}
          </View>
        )}
      </View>
      <AnimatedPressable
        onPress={saveManual}
        disabled={!manualDesc.trim() || saving}
        scaleDown={0.96}
        style={[s.ctaBtn, { marginTop: Spacing.xl, backgroundColor: manualDesc.trim() ? BLUE : t.flotante }]}>
        <Ionicons name="checkmark-circle" size={20}
          color={manualDesc.trim() ? TEXT_COLORS.onAccent : t.textoTenue} />
        <EliteText style={{
          color: manualDesc.trim() ? TEXT_COLORS.onAccent : t.textoTenue,
          fontFamily: Fonts.bold, fontSize: FontSizes.xl,
        }}>
          {saving ? 'Guardando...' : 'Registrar'}
        </EliteText>
      </AnimatedPressable>
    </Animated.View>
  );

  return (
    <View>
      {/* ── ENTRADA ── */}
      {step === 'entry' && (
        <Animated.View entering={FadeIn.duration(400)}>
          <EliteText style={[s.heroTitle, { color: t.texto }]}>El número bajo las barras</EliteText>
          <EliteText variant="caption" style={[s.heroSub, secLabel]}>
            Escríbelo y buscamos el producto: ingredientes y datos entran a tu registro sin teclear.
          </EliteText>

          <View style={s.codeRow}>
            <TextInput
              style={[s.codeInput, { backgroundColor: t.card, borderColor: t.borde, color: t.texto }]}
              value={codeInput}
              onChangeText={(v) => { setCodeInput(v); setInputError(null); }}
              placeholder="7501055300075"
              placeholderTextColor={t.textoTenue}
              keyboardType="number-pad"
              maxLength={14}
              returnKeyType="search"
              onSubmitEditing={handleLookup}
            />
            <AnimatedPressable onPress={handleLookup} scaleDown={0.92}
              style={[s.codeGo, { backgroundColor: codeInput.trim() ? BLUE : t.flotante }]}>
              <Ionicons name="search" size={20}
                color={codeInput.trim() ? TEXT_COLORS.onAccent : t.textoTenue} />
            </AnimatedPressable>
          </View>

          {inputError && (
            <View style={s.errorCard}>
              <Ionicons name="alert-circle" size={18} color={t.error} />
              <EliteText style={{ color: t.error, fontSize: FontSizes.md, flex: 1 }}>{inputError}</EliteText>
            </View>
          )}

          {/* Visor en vivo — secundario; teclear es el camino primario. En
              binarios sin expo-camera nada de esto existe. */}
          {cameraModule && !cameraOpen && (
            <AnimatedPressable onPress={openScanner} scaleDown={0.96} style={s.scanBtn}>
              <Ionicons name="camera-outline" size={18} color={BLUE} />
              <EliteText style={s.scanBtnText}>Apuntar la cámara al código</EliteText>
            </AnimatedPressable>
          )}
          {cameraModule && cameraOpen && (
            <Animated.View entering={FadeIn.duration(300)} style={[s.cameraWrap, { backgroundColor: t.flotante, borderColor: t.borde }]}>
              <cameraModule.CameraView
                style={s.cameraView}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
                }}
                onBarcodeScanned={({ data }) => onBarcodeRead(data)}
              />
              <View style={s.cameraHintRow}>
                <EliteText variant="caption" style={[s.cameraHint, secLabel]}>
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
          <EliteText style={{ color: t.textoSecundario, marginTop: Spacing.md, fontSize: FontSizes.lg }}>
            Buscando {barcode}...
          </EliteText>
        </Animated.View>
      )}

      {/* ── ENCONTRADO ── */}
      {step === 'found' && product && (
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <View style={[s.card, cardT]}>
            <View style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={[s.productImg, { backgroundColor: t.flotante }]} resizeMode="contain" />
              ) : (
                <View style={[s.productImg, { backgroundColor: t.flotante, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="cube-outline" size={28} color={t.textoTenue} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <EliteText style={{ color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.xl }}>
                  {product.name}
                </EliteText>
                {product.brand && (
                  <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: FontSizes.md, marginTop: 2 }}>
                    {product.brand}
                  </EliteText>
                )}
                <EliteText variant="caption" style={{ color: t.textoTenue, fontSize: FontSizes.sm, marginTop: 2 }}>
                  {product.barcode}
                </EliteText>
              </View>
            </View>
          </View>

          {/* La lista de ingredientes es el valor: qué trae de verdad. */}
          {product.ingredientsText ? (
            <View style={[s.card, cardT, { marginTop: Spacing.sm }]}>
              <EliteText variant="caption" style={[s.sectionLabel, secLabel]}>Lo que trae</EliteText>
              <EliteText style={{ color: t.texto, fontSize: FontSizes.md, lineHeight: 21 }}>
                {product.ingredientsText}
              </EliteText>
            </View>
          ) : (
            <View style={[s.card, cardT, { marginTop: Spacing.sm }]}>
              <EliteText variant="caption" style={{ color: t.textoTenue, fontSize: FontSizes.sm }}>
                La base no tiene la lista de ingredientes de este producto.
              </EliteText>
            </View>
          )}

          {/* Números por porción. En COMPLETO la porción se ajusta. */}
          {hasMacros && macros ? (
            <View style={[s.card, cardT, { marginTop: Spacing.sm }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <EliteText variant="caption" style={[s.sectionLabel, secLabel, { marginBottom: 0 }]}>
                  Por {grams} g
                </EliteText>
                {nutritionMode === 'complete' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TextInput
                      style={[s.gramsInput, { backgroundColor: t.flotante, color: t.texto }]}
                      value={gramsInput}
                      onChangeText={setGramsInput}
                      placeholder={String(defaultGrams)}
                      placeholderTextColor={t.textoTenue}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                    <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: FontSizes.sm }}>g</EliteText>
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
                    <EliteText style={{ color: t.texto, fontFamily: Fonts.bold, fontSize: FontSizes.lg }}>
                      {value ?? '—'}{value !== null ? unit : ''}
                    </EliteText>
                    <EliteText variant="caption" style={{ color: t.textoTenue, fontSize: FontSizes.xs, marginTop: 1 }}>
                      {label}
                    </EliteText>
                  </View>
                ))}
              </View>
              {product.servingSize && (
                <EliteText variant="caption" style={{ color: t.textoTenue, fontSize: FontSizes.xs, marginTop: 6 }}>
                  Porción del empaque: {product.servingSize}
                </EliteText>
              )}
            </View>
          ) : (
            <View style={[s.card, cardT, { marginTop: Spacing.sm }]}>
              <EliteText variant="caption" style={{ color: t.textoTenue, fontSize: FontSizes.sm }}>
                Sin datos de macros en la base. Se registra el producto y puedes completar después.
              </EliteText>
            </View>
          )}

          {inputError && (
            <View style={s.errorCard}>
              <Ionicons name="alert-circle" size={18} color={t.error} />
              <EliteText style={{ color: t.error, fontSize: FontSizes.md, flex: 1 }}>{inputError}</EliteText>
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
          <View style={[s.card, cardT]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="help-circle-outline" size={22} color={ATP_BRAND.amber} />
              <View style={{ flex: 1 }}>
                <EliteText style={{ color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                  Este producto aún no está en la base
                </EliteText>
                <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: FontSizes.sm, marginTop: 2 }}>
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
          <View style={[s.card, cardT]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="cloud-offline-outline" size={22} color={SEMANTIC.warning} />
              <View style={{ flex: 1 }}>
                <EliteText style={{ color: t.texto, fontFamily: Fonts.semiBold, fontSize: FontSizes.lg }}>
                  Sin conexión con la base de productos
                </EliteText>
                <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: FontSizes.sm, marginTop: 2 }}>
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
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  heroTitle: {
    color: TEXT_COLORS.primary, fontFamily: Fonts.bold, fontSize: FontSizes.xxl,
    textAlign: 'center', marginTop: Spacing.md,
  },
  heroSub: {
    color: TEXT_COLORS.secondary, fontSize: FontSizes.md, textAlign: 'center',
    marginTop: 6, lineHeight: 20, paddingHorizontal: Spacing.lg,
  },

  codeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, alignItems: 'center' },
  codeInput: {
    flex: 1, backgroundColor: SURFACES.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: SURFACES.border,
    paddingHorizontal: 16, paddingVertical: 14, color: TEXT_COLORS.primary,
    fontSize: FontSizes.xl, fontFamily: Fonts.semiBold, letterSpacing: 2, textAlign: 'center',
  },
  codeGo: {
    width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
  },

  loadingWrap: { alignItems: 'center', paddingVertical: Spacing.xxl },

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
  input: {
    backgroundColor: SURFACES.cardLight, borderRadius: Radius.card,
    paddingHorizontal: 14, paddingVertical: 12, color: TEXT_COLORS.primary,
    fontSize: FontSizes.md, fontFamily: Fonts.regular,
  },
  errorCard: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: SEMANTIC.error + '10', borderRadius: Radius.card, padding: 14, marginTop: Spacing.md,
  },
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
  savedWrap: { alignItems: 'center', paddingTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  savedCheck: {
    width: 48, height: 48, borderRadius: Radius.pill, backgroundColor: ATP_BRAND.lime,
    alignItems: 'center', justifyContent: 'center',
  },
});
